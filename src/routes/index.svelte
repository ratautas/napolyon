<script context="module">
  export const prerender = true;
  export const hydrate = false;
  export const ssr = false; // Dropzone relies on window object :(
</script>

<script>
  import { page } from '$app/stores';
  import { CodeSnippet, FileUploaderDropContainer } from 'carbon-components-svelte';

  import { ACCEPT_TYPES } from '$lib/constants';
  import { findClosestLinePoint } from '$lib/utils/findClosestLinePoint';
  import ToolBar from '$lib/ToolBar/index.svelte';
  import Render from '$lib/Render/index.svelte';
  import InfoModal from '$lib/InfoModal/index.svelte';

  import {
    globalAttributes,
    isInputFocused,
    isShiftPressed,
    isCmdPressed,
    isAltPressed,
    isSpacePressed,
    isDrawing,
    fileUploader,
    snapRadius,
    polygons,
    renderPolygons,
    drawnPolygon,
    drawnPolygonIndex,
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
  } from '$lib/stores';
  import { isInfoModalEnabled, showInfoModal } from '$lib/stores/infoModal';
  import { PREVENT_INFO_MODAL_KEY } from '$lib/constants';

  const preventInfoModal = !!window?.localStorage?.getItem(PREVENT_INFO_MODAL_KEY);

  if (!preventInfoModal) {
    showInfoModal.set(!preventInfoModal);
    isInfoModalEnabled.set(!preventInfoModal);
  }

  let isCanvasGrabbing;
  let canvasEl;
  let scrollX = 0;
  let scrollY = 0;

  const handleCanvasScroll = (e) => {
    scrollY = canvasEl.scrollTop;
    scrollX = canvasEl.scrollLeft;
  };

  const handleCanvasMousedown = (e) => {
    if ($isSpacePressed) {
      isCanvasGrabbing = true;
    }
  };

  const handleCanvasMousemove = (e) => {
    const x = e.x + scrollX;
    const y = e.y + scrollY;
    mouseX.set(x);
    mouseY.set(y);

    if ($isSpacePressed && isCanvasGrabbing) {
      canvasEl.scrollBy(-e.movementX, -e.movementY);
      return;
    }

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

      const diffX = Math.abs(x - lastDrawnPoint.x);
      const diffY = Math.abs(y - lastDrawnPoint.y);

      if (diffX < diffY) mouseX.set(lastDrawnPoint.x);
      if (diffX > diffY) mouseY.set(lastDrawnPoint.y);
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
      drawnPolygonIndex.set(-1);
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

    if (isCanvasGrabbing) {
      isCanvasGrabbing = false;
      return;
    }

    if (!$isShiftPressed) {
      mouseX.set(e.x + scrollX);
      mouseY.set(e.y + scrollY);
    }

    if (!hasInputTarget) {
      isInputFocused.set(false);
    }

    // unset selectedPolygonIndex if clicked outside polygon/point/toolbar
    if (
      !hasPolygonTarget &&
      !hasLineTarget &&
      !hasPointTarget &&
      !hasToolbarTarget &&
      !$isDrawing
    ) {
      selectedPolygonIndex.set(-1);
      hoveredPolygonIndex.set(-1);
    }

    // unset selectedPolygonIndex if clicked outside polygon/point/toolbar
    if (!hasLineTarget && !hasPointTarget) {
      selectedPoint.set(null);
    }

    // unset drawnPolygon if clicked on toolbar
    if (hasToolbarTarget) drawnPolygonIndex.set(-1);

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
      if ($drawnPolygonIndex === -1) {
        polygons.addPolygon();
      }

      polygons.addPoint({
        x: $closestSnapPoint?.x ?? $mouseX,
        y: $closestSnapPoint?.y ?? $mouseY,
        polygonIndex: $drawnPolygonIndex,
        pointIndex: $drawnPolygon.points.length
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

    if (e.code === 'Space') {
      e.preventDefault();
      isSpacePressed.set(true);
    }

    if (e.key === 'd' && !$isInputFocused) {
      isDrawing.set(true);
    }

    if (e.key === 'Escape') {
      isDrawing.set(false);
      isToolbarDragging.set(false);
      drawnPolygonIndex.set(-1);
    }
    if (e.key === 'Enter') {
      if ($drawnPolygonIndex !== -1) {
        selectedPoint.set(null);
        selectedPolygonIndex.set($drawnPolygonIndex);
      }
      drawnPolygonIndex.set(-1);
      isDrawing.set(false);
    }
    if ((e.key === 'Backspace' || e.key === 'Delete') && !$isInputFocused) {
      if ($selectedPoint) {
        polygons.deleteSelectedPoint();
        return;
      }
      if ($selectedPolygonIndex !== -1) {
        polygons.deletePolygon($selectedPolygonIndex);
        selectedPolygonIndex.set(-1);
        return;
      }
      if ($drawnPolygonIndex !== -1) {
        polygons.deletePolygon($drawnPolygonIndex);
        isDrawing.set(false);
        return;
      }
    }
    if (e.key === 'z' && $isCmdPressed && $isShiftPressed) {
      history.redo();
    }
    if (e.key === 'z' && $isCmdPressed && !$isShiftPressed) {
      history.undo();
    }
  };

  const handleWindowKeyup = (e) => {
    isShiftPressed.set(false);
    isAltPressed.set(false);
    isCmdPressed.set(false);
    isSpacePressed.set(false);
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

  $: lastDrawnPoint = $drawnPolygon ? $drawnPolygon.points[$drawnPolygon.points.length - 1] : {};

  const handleFilesAdd = (e) => {
    const reader = new FileReader();
    const [file] = e.detail;
    reader.readAsDataURL(file);
    reader.onload = () => {
      imageSrc.set(reader.result);
    };
  };

  const handleWindowBeforeunload = (e) => {
    if ($history.undoQueue.length || $history.redoQueue.length) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
</script>

<svelte:window
  on:keydown={handleWindowKeydown}
  on:keyup={handleWindowKeyup}
  on:beforeunload={handleWindowBeforeunload}
/>

<svelte:head>
  <title>Napolyon</title>
</svelte:head>

<div
  class="canvas"
  on:mousemove={handleCanvasMousemove}
  on:mousedown={handleCanvasMousedown}
  on:mouseup={handleCanvasMouseup}
  on:scroll={handleCanvasScroll}
  class:is-drawing={$isDrawing}
  class:can-grab={$isSpacePressed}
  class:is-grabbing={isCanvasGrabbing}
  style={`--snapRadius:${$snapRadius}px`}
  bind:this={canvasEl}
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

<InfoModal />
