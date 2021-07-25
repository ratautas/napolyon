<script context="module">
  export const prerender = true;
  export const hydrate = false;
  export const ssr = false; // Dropzone relies on window object :(
</script>

<script>
  import { page } from '$app/stores';
  import FileUploaderDropContainer from 'carbon-components-svelte/src/FileUploader/FileUploaderDropContainer.svelte';

  import { ACCEPT_TYPES } from '$lib/constants';
  import { findClosestLinePoint } from '$lib/utils/findClosestLinePoint';
  import ToolBar from '$lib/ToolBar/index.svelte';
  import Render from '$lib/Render/index.svelte';

  import {
    globalAttributes,
    isInputFocused,
    isShiftPressed,
    isCmdPressed,
    isAltPressed,
    isDrawing,
    fileUploader,
    snapRadius,
    polygons,
    renderPolygons,
    drawedPolygon,
    drawedPolygonIndex,
    selectedPolygonIndex,
    draggedPolygon,
    hoveredPolygonIndex,
    hoveredLineIndex,
    draggedPoint,
    selectedPoint,
    closestSnapPoint,
    closestLinePoint,
    isToolbarDragging,
    toolbarX,
    toolbarY,
    imageSrc,
    mouseX,
    mouseY,
    history
  } from '$lib/stores.js';

  let scrollX = 0;
  let scrollY = 0;

  const handleCanvasScroll = (e) => {
    scrollY = e.target.scrollTop;
    scrollX = e.target.scrollLeft;
  };

  const handleCanvasMousemove = (e) => {
    const x = e.x + scrollX;
    const y = e.y + scrollY;
    mouseX.set(x);
    mouseY.set(y);

    if ($isAltPressed) {
      closestLinePoint.set(
        findClosestLinePoint({
          ...hoveredLine,
          x: $mouseX,
          y: $mouseY
        })
      );
    }

    if ($isDrawing) {
      if (!$isShiftPressed) return;

      const diffX = Math.abs(x - lastDrawedPoint.x);
      const diffY = Math.abs(y - lastDrawedPoint.y);

      if (diffX < diffY) mouseX.set(lastDrawedPoint.x);
      if (diffX > diffY) mouseY.set(lastDrawedPoint.y);
    }

    if ($isToolbarDragging) {
      toolbarX.set($toolbarX + e.movementX);
      toolbarY.set($toolbarY + e.movementY);
      return;
    }

    if ($draggedPoint) {
      draggedPoint.set({
        ...$draggedPoint,
        x: $draggedPoint.x + e.movementX,
        y: $draggedPoint.y + e.movementY
      });
      return;
    }

    if ($draggedPolygon) {
      isDrawing.set(false);
      drawedPolygonIndex.set(-1);
      draggedPolygon.set({
        ...$draggedPolygon,
        points: $draggedPolygon.points.map((point) => ({
          ...point,
          x: point?.x + e.movementX,
          y: point?.y + e.movementY
        }))
      });

      return;
    }
  };

  const handleCanvasMouseup = (e) => {
    const hasLineTarget = e.path.some((el) => el.matches?.('line'));
    const hasPolygonTarget = e.path.some((el) => el.matches?.('polygon'));
    const hasToolbarTarget = e.path.some((el) => el.matches?.('.toolbar'));
    const hasPointTarget = e.path.some((el) => el.matches?.('.point'));
    const hasInputTarget = e.path.some((el) => el.matches?.('input'));

    if (!$isShiftPressed) {
      mouseX.set(e.x + scrollX);
      mouseY.set(e.y + scrollY);
    }

    if (!hasInputTarget) {
      isInputFocused.set(false);
    }

    // unset selectedPolygonIndex if clicked outside polygon/point/toolbar
    if (!hasPolygonTarget && !hasLineTarget && !hasPointTarget && !hasToolbarTarget) {
      selectedPolygonIndex.set(-1);
      hoveredPolygonIndex.set(-1);
    }

    // unset selectedPolygonIndex if clicked outside polygon/point/toolbar
    if (!hasLineTarget && !hasPointTarget) {
      selectedPoint.set(null);
    }

    // unset drawedPolygon if clicked on toolbar
    if (hasToolbarTarget) drawedPolygonIndex.set(-1);

    if (hasToolbarTarget && $isToolbarDragging) {
      isToolbarDragging.set(false);
    }

    if ($draggedPolygon) {
      polygons.setDraggedPolygonPosition();
      draggedPolygon.set(null);
    }

    if ($draggedPoint) {
      if ($isCmdPressed && $closestSnapPoint) {
        draggedPoint.set({
          ...$draggedPoint,
          x: $closestSnapPoint.x,
          y: $closestSnapPoint.y
        });
      }

      polygons.setDraggedPointPosition();
      draggedPoint.set(null);
    }

    if ($isDrawing) {
      if ($drawedPolygonIndex === -1) {
        polygons.addPolygon();
      }

      polygons.addPoint({
        x: $closestSnapPoint?.x ?? $mouseX,
        y: $closestSnapPoint?.y ?? $mouseY,
        polygonIndex: $drawedPolygonIndex,
        pointIndex: $drawedPolygon.points.length
      });
    }

    if ($isAltPressed && $closestLinePoint) {
      polygons.addPoint({
        x: $closestLinePoint.x,
        y: $closestLinePoint.y,
        polygonIndex: $hoveredPolygonIndex,
        pointIndex: $hoveredLineIndex + 1
      });
    }
  };

  const handleWindowKeydown = (e) => {
    isShiftPressed.set(e.shiftKey);
    isAltPressed.set(e.altKey);
    isCmdPressed.set(e.metaKey);

    if (e.key === 'Escape') {
      // polygons = $polygonsMap.reduce(
      //   (acc, polygon) => ({
      //     ...acc,
      //     ...(polygon.id !== $drawedPolygon.id && { [polygon.id]: polygon })
      //   }),
      //   {}
      // );
      // additional escape if dragging gets out of hand
      isDrawing.set(false);
      isToolbarDragging.set(false);
      drawedPolygonIndex.set(-1);
    }
    if (e.key === 'Enter') {
      if ($drawedPolygonIndex !== -1) {
        selectedPolygonIndex.set($drawedPolygonIndex);
      }
      drawedPolygonIndex.set(-1);
      isDrawing.set(false);
    }
    if (!$isInputFocused && (e.key === 'Backspace' || e.key === 'Delete')) {
      if ($selectedPoint) {
        polygons.deleteSelectedPoint();
        return;
      }
      if ($selectedPolygonIndex !== -1) {
        polygons.deletePolygon($selectedPolygonIndex);
        selectedPolygonIndex.set(-1);
        return;
      }
      if ($drawedPolygonIndex !== -1) {
        polygons.deletePolygon($drawedPolygonIndex);
        isDrawing.set(false);
        return;
      }
    }
    if ($isCmdPressed && $isShiftPressed && e.key === 'z') {
      history.redo();
    }
    if ($isCmdPressed && !$isShiftPressed && e.key === 'z') {
      history.undo();
    }
  };

  const handleWindowKeyup = (e) => {
    isShiftPressed.set(false);
    isAltPressed.set(false);
    isCmdPressed.set(false);
  };

  const preset = $page.query.get('preset');
  if (preset === 'totoriu-floor') {
    globalAttributes.add({ name: 'class', value: 'shapes__polygon shapes__polygon--vacant' });
    globalAttributes.add({ name: 'data-shape', value: 'E01' });
    globalAttributes.add({ name: 'data-shape-href', value: '/' });
    globalAttributes.add({ name: 'data-shape-row1', value: 'Komercinės patalpos' });
    globalAttributes.add({ name: 'data-shape-row2', value: '58 kv.m  /  2 kamb.' });
    globalAttributes.add({ name: 'data-shape-status', value: 'vacant' });
  }
  if (preset === 'totoriu-listing') {
    globalAttributes.add({ name: 'class', value: 'shapes__polygon' });
    globalAttributes.add({ name: 'data-shape', value: '1' });
    globalAttributes.add({ name: 'data-shape-href', value: '/' });
    globalAttributes.add({ name: 'data-shape-row1', value: 'Laisvų butų - 2' });
    globalAttributes.add({ name: 'data-shape-row2', value: 'Laisvų komercinių patalpų - 1' });
  }

  $: hoveredLine = $renderPolygons[$hoveredPolygonIndex]?.lines[$hoveredLineIndex];

  $: lastDrawedPoint = $drawedPolygon
    ? $drawedPolygon.points[$drawedPolygon.points.length - 1]
    : {};

  const handleFilesAdd = (e) => {
    const reader = new FileReader();
    const [file] = e.detail;
    reader.readAsDataURL(file);
    reader.onload = () => {
      imageSrc.set(reader.result);
    };
  };
</script>

<svelte:window on:keydown={handleWindowKeydown} on:keyup={handleWindowKeyup} />

<svelte:head>
  <title>Napolyon</title>
</svelte:head>

<div
  class="canvas"
  on:mousemove={handleCanvasMousemove}
  on:mouseup={handleCanvasMouseup}
  on:scroll={handleCanvasScroll}
  class:is-drawing={$isDrawing}
  style={`--snapRadius:${$snapRadius}px`}
>
  <ToolBar />
  {#if $imageSrc}
    <Render />
  {:else}
    <FileUploaderDropContainer
      accept={ACCEPT_TYPES}
      labelText="Drop your image here or click to upload"
      class="canvas__upload"
      on:add={handleFilesAdd}
      bind:this={$fileUploader}
    />
  {/if}
</div>
