<script context="module">
  export const prerender = true;
  export const hydrate = false;
  export const ssr = false; // Dropzone relies on window object :(
</script>

<script>
  import { page } from '$app/stores';
  import FileUploaderDropContainer from 'carbon-components-svelte/src/FileUploader/FileUploaderDropContainer.svelte';

  import { ACCEPT_TYPES } from '$lib/constants';
  import { findClosestSnapPoint } from '$lib/utils/findClosestSnapPoint';
  import { findClosestLinePoint } from '$lib/utils/findClosestLinePoint';
  import ToolBar from '$lib/ToolBar/index.svelte';
  import Render from '$lib/Render/index.svelte';
  import {
    globalAttributes,
    isShiftPressed,
    isCmdPressed,
    isAltPressed,
    isDrawing,
    fileUploader,
    snapRadius,
    polygons,
    drawedPolygon,
    drawedPolygonIndex,
    selectedPolygonIndex,
    draggedPolygon,
    draggedPolygonId,
    hoveredPolygonIndex,
    hoveredLineIndex,
    draggedPoint,
    draggedPointId,
    isToolbarDragging,
    toolbarX,
    toolbarY,
    imageSrc,
    imageWidth,
    imageHeight,
    history
  } from '$lib/stores.js';

  let closestSnapPoint = null;
  let closestLinePoint = null;

  let localX;
  let localY;

  let scrollX = 0;
  let scrollY = 0;

  const handleCanvasScroll = (e) => {
    scrollY = e.target.scrollTop;
    scrollX = e.target.scrollLeft;
  };

  const handleCanvasMousemove = (e) => {
    const x = e.x + scrollX;
    const y = e.y + scrollY;
    localX = x;
    localY = y;

    if (($isDrawing || $draggedPoint) && $isCmdPressed) {
      closestSnapPoint = $polygons
        .filter((polygon, index) => index !== $selectedPolygonIndex)
        .reduce((acc, { points }) => {
          return findClosestSnapPoint({ points, x, y, radius: $snapRadius }) ?? acc;
        }, null);

      if (!closestSnapPoint?.id) {
        if ($snapRadius > x) {
          closestSnapPoint = { x: 0, y, id: 'snap-left' };
        }
        if ($snapRadius > y) {
          closestSnapPoint = { x, y: 0, id: 'snap-top' };
        }
        if (imageWidth - $snapRadius < x) {
          closestSnapPoint = { x: imageWidth, y, id: 'snap-right' };
        }
        if (imageHeight - $snapRadius < y) {
          closestSnapPoint = { x, y: imageHeight, id: 'snap-bottom' };
        }
      }
    }

    if ($isAltPressed) {
      closestLinePoint = findClosestLinePoint({
        ...hoveredLine,
        x: localX,
        y: localY
      });
    }

    if ($isDrawing) {
      if (!$isShiftPressed) return;

      const diffX = Math.abs(x - lastDrawedPoint.x);
      const diffY = Math.abs(y - lastDrawedPoint.y);

      if (diffX < diffY) localX = lastDrawedPoint.x;
      if (diffX > diffY) localY = lastDrawedPoint.y;
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
      draggedPolygon.set({
        ...$draggedPolygon,
        points: $draggedPolygon.points.map((point) => ({
          ...point,
          x: point?.x + e.movementX,
          y: point?.y + e.movementY
        }))
      });
      drawedPolygonIndex.set(-1);

      return;
    }
  };

  const handleCanvasMouseup = (e) => {
    const hasLineTarget = e.path.some((el) => el.matches?.('line'));
    const hasPolygonTarget = e.path.some((el) => el.matches?.('polygon'));
    const hasToolbarTarget = e.path.some((el) => el.matches?.('.toolbar'));
    const hasPointTarget = e.path.some((el) => el.matches?.('.point'));

    if (!$isShiftPressed) {
      localX = e.x + scrollX;
      localY = e.y + scrollY;
    }

    // unset selectedPolygonIndex if clicked outside polygon/point/toolbar
    if (!hasPolygonTarget && !hasLineTarget && !hasPointTarget && !hasToolbarTarget) {
      selectedPolygonIndex.set(-1);
      hoveredPolygonIndex.set(-1);
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
      if ($isCmdPressed && closestSnapPoint) {
        draggedPoint.set({
          ...$draggedPoint,
          x: closestSnapPoint.x,
          y: closestSnapPoint.y
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
        x: closestSnapPoint?.x ?? localX,
        y: closestSnapPoint?.y ?? localY,
        polygonIndex: $drawedPolygonIndex,
        pointIndex: $drawedPolygon.points.length
      });
    }

    if ($isAltPressed && closestLinePoint) {
      polygons.addPoint({
        x: closestLinePoint.x,
        y: closestLinePoint.y,
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
    if ($isCmdPressed && (e.key === 'Backspace' || e.key === 'Delete')) {
      if ($drawedPolygonIndex !== -1) {
        polygons.deletePolygon($drawedPolygonIndex);
        isDrawing.set(false);
        // additional escape if dragging gets out of hand
        draggedPolygon.set(null);
        selectedPolygonIndex.set(-1);
        drawedPolygonIndex.set(-1);
      }
      if ($selectedPolygonIndex !== -1) {
        polygons.deletePolygon($selectedPolygonIndex);
        selectedPolygonIndex.set(-1);
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

  $: renderPolygons = $polygons.map((polygon) => {
    const { points } = polygon.id === $draggedPolygonId ? $draggedPolygon : polygon;
    const renderPoints = points.map((point) => {
      // const { x, y } = point.id === $draggedPointId ? $draggedPoint : point;
      // const { x, y } = point;
      const { x, y } = $draggedPoint && point.id === $draggedPointId ? $draggedPoint : point;
      return { ...point, x, y };
    });
    return {
      ...polygon,
      // points: points.map((point) => {
      //   const { x } = $draggedPoint?.id === point.id ? $draggedPoint : point;
      //   const { y } = $draggedPoint?.id === point.id ? $draggedPoint : point;
      //   return { ...point, x, y };
      // }),
      points: renderPoints,
      pointsReduced: renderPoints
        .reduce((pointsString, point) => {
          // const { x } = $draggedPoint?.id === point.id ? $draggedPoint : point;
          // const { y } = $draggedPoint?.id === point.id ? $draggedPoint : point;
          return `${pointsString} ${point.x},${point.y}`;
        }, '')
        .replace(' ', ''),
      lines: renderPoints.map((point, index, arr) => {
        const nextIndex = index === arr.length - 1 ? 0 : index + 1;

        return {
          x1: arr[index].x,
          x2: arr[nextIndex].x,
          y1: arr[index].y,
          y2: arr[nextIndex].y
        };
      })
    };
  });

  $: hoveredLine = renderPolygons[$hoveredPolygonIndex]?.lines[$hoveredLineIndex];

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
