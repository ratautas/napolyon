<script context="module">
  export const prerender = true;
  export const hydrate = false;
  export const ssr = false; // Dropzone relies on window object :(
</script>

<script>
  import { page } from '$app/stores';
  import { onMount, tick } from 'svelte';
  import FileUploaderDropContainer from 'carbon-components-svelte/src/FileUploader/FileUploaderDropContainer.svelte';

  import { findClosestSnapPoint } from '$lib/utils/findClosestSnapPoint';
  import { findClosestLinePoint } from '$lib/utils/findClosestLinePoint';
  import ToolBar from '$lib/ToolBar/index.svelte';
  import {
    globalAttributes,
    isShiftPressed,
    isCmdPressed,
    isAltPressed,
    isDrawing,
    renderSvg,
    snapRadius,
    isSnapEnabled,
    polygons,

    drawedPolygonIndex,
    drawedPolygon,
    selectedPolygonIndex,
    selectedPolygonId,
    
    dragablePolygonId,
    hoveredPolygonIndex,
    dragablePointId,
    isToolbarDragging,
    toolbarX,
    toolbarY,
    history
  } from '$lib/stores.js';

  let svgEl;
  let imageEl;
  let src;
  let imageWidth;
  let imageHeight;
  src =
    'https://images.unsplash.com/photo-1607629823685-ae0850607241?auto=format&fit=crop&w=900&height=600&q=80';
  imageWidth = 900;
  imageHeight = 600;

  let closestSnapPoint = null;
  let closestLinePoint = null;

  let localDragablePolygon;
  let localDragablePoint;

  let localDrawableX;
  let localDrawableY;

  let localX;
  let localY;

  let hoveredPointIndex = -1;
  let hoveredPointPolygonIndex = -1;

  let hoveredLineIndex = -1;
  let hoveredLinePolygonIndex = -1;

  const handleCanvasMousedown = (e) => {
    // only get elements which have .match() method (without 'window' and 'document')
    const matchPaths = e.path.filter((el) => !!el.matches);
    const hasPolygonTarget = matchPaths.some((el) => el.matches('polygon'));
    const hasLineTarget = matchPaths.some((el) => el.matches('line'));
    const hasPointTarget = matchPaths.some((el) => el.matches('.point'));
    const hasToolbarTarget = matchPaths.some((el) => el.matches('.toolbar'));

    // unset selectedPolygonIndex if clicked outside polygon/point/toolbar
    if (!hasPolygonTarget && !hasLineTarget && !hasPointTarget && !hasToolbarTarget) {
      selectedPolygonIndex.set(-1);
    }

    // unset drawedPolygon if clicked on toolbar
    if (hasToolbarTarget) drawedPolygonIndex.set(-1);

    if ($isDrawing) {
      if ($drawedPolygonIndex === -1) {
        polygons.addPolygon();
      }
      polygons.addPoint(
        {
          x: $isShiftPressed ? localX : closestSnapPoint?.x ?? e.x,
          y: $isShiftPressed ? localY : closestSnapPoint?.y ?? e.y
        },
        $drawedPolygonIndex
      );
    }
  };

  const handleCanvasMousemove = ({ x, y, movementX, movementY }) => {
    localX = x;
    localY = y;

    if (($isDrawing || $dragablePointId) && $isSnapEnabled) {
      closestSnapPoint = $polygons
        .filter(({ id }) => id !== $selectedPolygonId) // replace with selectedPolygonIndex
        .reduce(
          (acc, { points }) => findClosestSnapPoint({ points, x, y, radius: $snapRadius }) ?? acc,
          null
        );

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

      const diffX = Math.abs(x - lastDrawablePoint.x);
      const diffY = Math.abs(y - lastDrawablePoint.y);

      if (diffX < diffY) localX = lastDrawablePoint.x;
      if (diffX > diffY) localY = lastDrawablePoint.y;
    }

    if ($isToolbarDragging) {
      toolbarX.set($toolbarX + movementX);
      toolbarY.set($toolbarY + movementY);
      return;
    }

    if ($dragablePointId && $selectedPolygonIndex !== -1) {
      localDragablePoint.x = localDragablePoint.x + movementX;
      localDragablePoint.y = localDragablePoint.y + movementY;
      return;
    }

    if ($dragablePolygonId) {
      isDrawing.set(false);
      drawedPolygonIndex.set(-1);
      localDragablePolygon.points = localDragablePolygon.points.map((point) => ({
        id: point.id,
        x: point.x + movementX,
        y: point.y + movementY
      }));
      return;
    }
  };

  const handleCanvasMouseup = (e) => {
    const hasLineTarget = e.path
      .filter((el, i) => i < e.path.length - 2)
      .some((el) => el.matches('line'));
    const hasPolygonTarget = e.path
      .filter((el, i) => i < e.path.length - 2)
      .some((el) => el.matches('polygon'));
    const hasToolbarTarget = e.path
      .filter((el, i) => i < e.path.length - 2)
      .some((el) => el.matches('.toolbar'));

    if (hasToolbarTarget && $isToolbarDragging) {
      isToolbarDragging.set(false);
    }

    if ($dragablePolygonId && localDragablePolygon) {
      polygons.setDraggablePolygonPosition(localDragablePolygon);
      dragablePolygonId.set(null);
      localDragablePolygon = null;
    }

    if ($dragablePointId && localDragablePoint) {
      if ($isSnapEnabled && closestSnapPoint) {
        localDragablePoint.x = closestSnapPoint.x;
        localDragablePoint.y = closestSnapPoint.y;
      }

      polygons.setDraggablePointPosition(localDragablePoint);
      dragablePointId.set(null);
      localDragablePoint = null;
    }

    if (!hasPolygonTarget && !hasToolbarTarget) {
      selectedPolygonIndex.set(-1);
      hoveredPolygonIndex.set(-1);
    }

    if ($isAltPressed && closestLinePoint) {
      const polygon = $polygons[$hoveredPolygonIndex];

      const lineIndex = hoveredLineIndex > polygon.points.length ? hoveredLineIndex + 1 : 0;

      polygons.addPoint(
        {
          x: closestLinePoint.x,
          y: closestLinePoint.y
        },
        // hoveredLineIndex + 1
        lineIndex
      );
    }
  };

  const handlePolygonMouseenter = ({ e, polygon, polygonIndex }) => {
    hoveredPolygonIndex.set(polygonIndex);
  };

  const handlePolygonMousedown = ({ e, polygon, polygonIndex }) => {
    localDragablePolygon = { ...polygon };
    dragablePolygonId.set(polygon.id);
    selectedPolygonIndex.set(polygonIndex);
    hoveredPolygonIndex.set(-1);
  };

  const handlePolygonMouseleave = ({ e, polygon }) => {
    const hasPolygonTarget = e.path
      .filter((el, i) => i < e.path.length - 2)
      .some((el) => el.matches('polygon'));
    const hasLineTarget = e.path
      .filter((el, i) => i < e.path.length - 2)
      .some((el) => el.matches('line'));
    const hasPointTarget = e.path
      .filter((el, i) => i < e.path.length - 2)
      .some((el) => el.matches('.point'));

    hoveredPolygonIndex.set(-1);
    if (!hasPolygonTarget) {
      dragablePolygonId.set(null);
    }
  };

  const handleLineMouseenter = ({ polygonIndex, lineIndex }) => {
    hoveredLinePolygonIndex = polygonIndex;
    hoveredLineIndex = lineIndex;
    hoveredPolygonIndex.set(polygonIndex)
  };

  const handleLineMouseleave = () => {
    hoveredLinePolygonIndex = -1;
    hoveredLineIndex = -1;
  };

  const handlePointMousedown = ({ e, point, polygon, polygonIndex }) => {
    selectedPolygonIndex.set(polygonIndex);
    dragablePointId.set(point.id);
    localDragablePoint = { ...point };
  };

  const handlePointMouseenter = ({ polygonId, pointIndex, polygonIndex }) => {
    hoveredPolygonIndex.set(polygonIndex);
    hoveredPointIndex = pointIndex;
  };

  const handlePointMouseleave = ({ e, point, polygon }) => {
    const hasPointTarget = e.path
      .filter((el, i) => i < e.path.length - 2)
      .some((el) => el.matches('.point'));

    if (!hasPointTarget) {
      dragablePointId.set(null);
    }
    hoveredPointIndex = -1;
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
        dragablePolygonId.set(null);
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

  onMount(() => {
    renderSvg.set(svgEl);
  });

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
    // serve points from either localDragablePolygon or regularly
    const currentPolygon = localDragablePolygon?.id === polygon.id ? localDragablePolygon : polygon;
    return {
      ...currentPolygon,
      points: currentPolygon.points.map((point) => {
        return localDragablePoint?.id === point.id ? localDragablePoint : point;
      }),
      pointsReduced: currentPolygon.points
        .reduce((pointsString, point) => {
          // serve X and Y from either localDragablePoint or regularly
          const { x, y } = localDragablePoint?.id === point.id ? localDragablePoint : point;
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

  $: hoveredLine = renderPolygons[hoveredPolygonIndex]?.lines[hoveredLineIndex];

  $: lastDrawablePoint = $drawedPolygon
    ? $drawedPolygon.points[$drawedPolygon.points.length - 1]
    : {};

  $: drawedPolygonPoints =
    lastDrawablePoint &&
    $drawedPolygonIndex !== -1 &&
    $drawedPolygon.points.reduce((pointsString, point) => {
      // serve X and Y from either localDragablePoint or regularly
      const { x, y } = localDragablePoint?.id === point.id ? localDragablePoint : point;
      // return `${x},${y} ${pointsString}`;
      return `${point.x},${point.y} ${pointsString}`;
      // }, `${localDrawableX},${localDrawableY}`);
    }, `${localX},${localY}`);

  const handleImageLoad = async (e) => {
    imageWidth = imageEl.naturalWidth;
    imageHeight = imageEl.naturalHeight;
    await tick();
    renderSvg.set(svgEl);
  };

  const handleFilesAdd = (e) => {
    const reader = new FileReader();
    const [file] = e.detail;
    reader.readAsDataURL(file);
    reader.onload = () => {
      src = reader.result;
    };
  };
</script>

<svelte:window on:keydown={handleWindowKeydown} on:keyup={handleWindowKeyup} />

<svelte:head>
  <title>Home</title>
</svelte:head>

<div
  class="canvas"
  on:mousedown={handleCanvasMousedown}
  on:mousemove={handleCanvasMousemove}
  on:mouseup={handleCanvasMouseup}
  class:is-drawing={$isDrawing}
  style={`--snapRadius:${$snapRadius}px`}
>
  <ToolBar />
  {#if src}
    <div class="render">
      <img
        {src}
        alt=""
        width={imageWidth}
        height={imageHeight}
        style={`width:${imageWidth}px;height:${imageHeight}px;`}
        bind:this={imageEl}
        on:load={handleImageLoad}
      />

      {#if !!imageWidth && !!imageHeight}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${imageWidth} ${imageHeight}`}
          bind:this={svgEl}
        >
          {#if $drawedPolygonIndex !== 1}
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
            <!-- stroke={hoveredLineIndex === lineIndex && hoveredLinePolygonIndex === polygonIndex  ? 'red' : 'blue'} -->
            {#each polygon.lines as line, lineIndex}
              <line
                x1={line.x1}
                x2={line.x2}
                y1={line.y1}
                y2={line.y2}
                stroke="transparent"
                stroke-width="5"
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
              pointIndex === hoveredPointIndex}
            class:is-closest-snapable={point.id === closestSnapPoint?.id}
            class:is-dragable={point.id === $dragablePointId}
            id={point.id}
            tabindex="0"
            on:mouseenter={() =>
              handlePointMouseenter({ polygonId: polygon.id, pointIndex, polygonIndex })}
            on:mouseleave={(e) =>
              handlePointMouseleave({ e, point, polygon, polygonIndex, polygonIndex })}
            on:mousedown={(e) =>
              handlePointMousedown({ e, point, polygon, polygonIndex, pointIndex })}
          />
        {/each}
      {/each}
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
    </div>
  {:else}
    <!-- <Dropzone multiple={false} on:drop={handleFilesAdd} /> -->
    <FileUploaderDropContainer
      accept={['.jpg', '.JPG', '.jpeg', '.JPEG', '.gif', '.GIF', '.png', '.PNG', '.webp', '.WEBP']}
      labelText="Drop your image here or click to upload"
      class="canvas__upload"
      on:add={handleFilesAdd}
    />
  {/if}
</div>
