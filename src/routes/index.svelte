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
    draggedPolygonIndex,
    hoveredPolygonIndex,
    draggedPointIndex,
    hoveredPointIndex,
    hoveredLineIndex,
    isToolbarDragging,
    toolbarX,
    toolbarY,
    svgEl,
    imageEl,
    imageSrc,
    imageWidth,
    imageHeight,
    history
  } from '$lib/stores.js';

  let closestSnapPoint = null;
  let closestLinePoint = null;

  // dragged polygon/point is stored locally and saved to the store upon drag release
  let localDraggedPolygon;
  let localDraggedPoint;

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

    if (($isDrawing || $draggedPointIndex !== -1) && $isCmdPressed) {
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

    if ($draggedPointIndex !== -1 && $selectedPolygonIndex !== -1) {
      localDraggedPoint.x = localDraggedPoint.x + e.movementX;
      localDraggedPoint.y = localDraggedPoint.y + e.movementY;
      return;
    }

    if ($draggedPolygonIndex !== -1) {
      isDrawing.set(false);
      drawedPolygonIndex.set(-1);
      localDraggedPolygon.points = localDraggedPolygon.points.map((point) => ({
        id: point.id,
        x: point.x + e.movementX,
        y: point.y + e.movementY
      }));
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
    }

    // unset drawedPolygon if clicked on toolbar
    if (hasToolbarTarget) drawedPolygonIndex.set(-1);

    if (hasToolbarTarget && $isToolbarDragging) {
      isToolbarDragging.set(false);
    }

    if ($draggedPolygonIndex !== -1 && localDraggedPolygon) {
      polygons.setDraggablePolygonPosition(localDraggedPolygon);
      draggedPolygonIndex.set(-1);
      localDraggedPolygon = null;
    }

    if ($draggedPointIndex !== -1 && localDraggedPoint) {
      if ($isCmdPressed && closestSnapPoint) {
        localDraggedPoint.x = closestSnapPoint.x;
        localDraggedPoint.y = closestSnapPoint.y;
      }

      polygons.setDraggablePointPosition(localDraggedPoint);
      draggedPointIndex.set(-1);
      localDraggedPoint = null;
    }

    if (!hasPolygonTarget && !hasToolbarTarget && !hasLineTarget && !hasPointTarget) {
      selectedPolygonIndex.set(-1);
      hoveredPolygonIndex.set(-1);
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

  const handlePolygonMouseenter = ({ polygonIndex }) => {
    hoveredPolygonIndex.set(polygonIndex);
  };

  const handlePolygonMousedown = ({ e, polygon, polygonIndex }) => {
    localDraggedPolygon = { ...polygon };
    draggedPolygonIndex.set(polygonIndex);
    selectedPolygonIndex.set(polygonIndex);
  };

  const handlePolygonMouseleave = ({ e, polygon }) => {
    const hasPolygonTarget = e.path.some((el) => el.matches?.('polygon'));

    hoveredPolygonIndex.set(-1);

    if (!hasPolygonTarget) {
      draggedPolygonIndex.set(-1);
    }
  };

  const handleLineMouseenter = ({ polygonIndex, lineIndex }) => {
    hoveredLineIndex.set(lineIndex);
    hoveredPolygonIndex.set(polygonIndex);
  };

  const handleLineMouseleave = () => {
    hoveredPolygonIndex.set(-1);
    hoveredLineIndex.set(-1);
  };

  const handlePointMousedown = ({ point, polygonIndex, pointIndex }) => {
    selectedPolygonIndex.set(polygonIndex);
    draggedPointIndex.set(pointIndex);
    localDraggedPoint = { ...point };
  };

  const handlePointMouseenter = ({ pointIndex, polygonIndex }) => {
    hoveredPolygonIndex.set(polygonIndex);
    hoveredPointIndex.set(pointIndex);
  };

  const handlePointMouseleave = ({ e }) => {
    const hasPointTarget = e.path.some((el) => el.matches?.('.point'));

    hoveredPointIndex.set(-1);

    if (!hasPointTarget) {
      draggedPointIndex.set(-1);
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
        draggedPolygonIndex.set(-1);
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
    // serve points from either localDraggedPolygon or regularly
    const currentPolygon = localDraggedPolygon?.id === polygon.id ? localDraggedPolygon : polygon;
    return {
      ...currentPolygon,
      points: currentPolygon.points.map((point) => {
        return localDraggedPoint?.id === point.id ? localDraggedPoint : point;
      }),
      pointsReduced: currentPolygon.points
        .reduce((pointsString, point) => {
          // serve X and Y from either localDraggedPoint or regularly
          const { x, y } = localDraggedPoint?.id === point.id ? localDraggedPoint : point;
          return `${pointsString} ${x},${y}`;
        }, '')
        .replace(' ', ''),
      lines: currentPolygon.points.map((point, index, arr) => {
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

  $: drawedPolygonPoints =
    lastDrawedPoint &&
    $drawedPolygonIndex !== -1 &&
    $drawedPolygon.points.reduce((pointsString, { x, y }) => {
      return `${x},${y} ${pointsString}`;
    }, `${localX},${localY}`);

  const handleImageLoad = async (e) => {
    imageWidth.set($imageEl.naturalWidth);
    imageHeight.set($imageEl.naturalHeight);
  };

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
    <div class="render">
      <img
        src={$imageSrc}
        alt=""
        width={$imageWidth}
        height={$imageHeight}
        style={`width:${$imageWidth}px;height:${$imageHeight}px;`}
        bind:this={$imageEl}
        on:load={handleImageLoad}
      />

      {#if !!$imageWidth && !!$imageHeight}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${$imageWidth} ${$imageHeight}`}
          bind:this={$svgEl}
        >
          {#if $drawedPolygonIndex !== -1 && $isDrawing}
            <polygon class="placeholder" points={drawedPolygonPoints} />
          {/if}
          {#each renderPolygons as polygon, polygonIndex}
            <polygon
              points={polygon.pointsReduced}
              id={polygon.id}
              {...polygon.attributes}
              class:is-drawing={$isDrawing && polygonIndex === $drawedPolygonIndex}
              class:is-dragging={polygonIndex === $drawedPolygonIndex}
              class:is-hovered={polygonIndex === $hoveredPolygonIndex}
              class:is-selected={polygonIndex === $selectedPolygonIndex}
              on:mousedown={(e) => handlePolygonMousedown({ e, polygon, polygonIndex })}
              on:mouseenter={(e) => handlePolygonMouseenter({ e, polygon, polygonIndex })}
              on:mouseleave={(e) => handlePolygonMouseleave({ e, polygon, polygonIndex })}
            />
          {/each}
          {#each renderPolygons as polygon, polygonIndex}
            {#each polygon.lines as line, lineIndex}
              <line
                x1={line.x1}
                x2={line.x2}
                y1={line.y1}
                y2={line.y2}
                stroke="transparent"
                stroke-width="5"
                class:is-hovered={lineIndex === $hoveredLineIndex &&
                  polygonIndex === $hoveredPolygonIndex}
                on:mouseenter={() => handleLineMouseenter({ polygonIndex, lineIndex })}
                on:mouseleave={() => handleLineMouseleave()}
              />
            {/each}
          {/each}
        </svg>
      {/if}
      {#each renderPolygons as polygon, polygonIndex}
        {#each polygon.points as point, pointIndex}
          <div
            style={`left:${point.x}px;top:${point.y}px;`}
            class="point"
            class:is-polygon-selected={polygonIndex === $selectedPolygonIndex}
            class:is-polygon-hovered={polygonIndex === $hoveredPolygonIndex}
            class:is-hoovered={polygonIndex === $hoveredPolygonIndex &&
              pointIndex === $hoveredPointIndex}
            class:is-closest-snapable={point.id === closestSnapPoint?.id && $isCmdPressed}
            class:is-dragable={pointIndex === $draggedPointIndex &&
              polygonIndex === $hoveredPolygonIndex}
            id={point.id}
            tabindex="0"
            on:mouseenter={() => handlePointMouseenter({ pointIndex, polygonIndex })}
            on:mouseleave={(e) =>
              handlePointMouseleave({ e, point, polygon, polygonIndex, polygonIndex })}
            on:mousedown={(e) =>
              handlePointMousedown({ e, point, polygon, polygonIndex, pointIndex })}
          />
        {/each}
      {/each}
      {#if $isCmdPressed}
        {#if closestSnapPoint?.id === 'snap-left'}
          <div style={`left:0px;top:${closestSnapPoint?.y}px;`} class="point is-polygon-selected" />
        {:else if closestSnapPoint?.id === 'snap-top'}
          <div style={`left:${closestSnapPoint?.x}px;top:0px;`} class="point is-polygon-selected" />
        {:else if closestSnapPoint?.id === 'snap-right'}
          <div
            style={`left:${imageWidth}px;top:${closestSnapPoint?.y}px;`}
            class="point is-polygon-selected"
          />
        {:else if closestSnapPoint?.id === 'snap-bottom'}
          <div
            style={`left:${closestSnapPoint?.x}px;top:${imageHeight}px;`}
            class="point is-polygon-selected"
          />
        {/if}
        {#if closestLinePoint && $isAltPressed}
          <div
            style={`left:${closestLinePoint?.x}px;top:${closestLinePoint?.y}px;pointer-events:none`}
            class="point is-polygon-hovered yololo"
          />
        {/if}
      {/if}
    </div>
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
