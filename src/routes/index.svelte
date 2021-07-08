<script context="module">
  export const prerender = true;
  export const hydrate = false;
  export const ssr = false; // Dropzone relies on window object :(
</script>

<script>
  import { onMount } from 'svelte';
  import FileUploaderDropContainer from 'carbon-components-svelte/src/FileUploader/FileUploaderDropContainer.svelte';

  import ToolBar from '$lib/ToolBar/index.svelte';
  import {
    isDrawing,
    renderSvg,
    snapRadius,
    isSnapEnabled,
    polygons,
    drawablePolygonId,
    drawablePolygon,
    selectedPolygonId,
    dragablePolygonId,
    hoveredPolygonId,
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
  // src =
  //   'https://images.unsplash.com/photo-1607629823685-ae0850607241?auto=format&fit=crop&w=900&height=600&q=80';
  // imageWidth = 900;
  // imageHeight = 600;

  let closestPoint = null;

  let localDragablePolygon;
  let localDragablePoint;

  let localDrawableX;
  let localDrawableY;

  let isShiftPressed = false;
  let isCmdPressed = false;
  let isAltPressed = false;

  const handleImageLoad = (e) => {
    imageWidth = imageEl.naturalWidth;
    imageHeight = imageEl.naturalHeight;
    renderSvg.set(svgEl);
  };

  const handleFilesChange = (e) => {
    const reader = new FileReader();
    const [file] = e.target.files;
    reader.readAsDataURL(file);
    reader.onload = () => {
      src = reader.result;
    };
  };

  const findClosestPoint = ({ points, x, y }) => {
    let point = Object.values(points)
      .filter((point) => point.x > x - $snapRadius && point.x < x + $snapRadius)
      .filter((point) => point.y > y - $snapRadius && point.y < y + $snapRadius)
      .reduce(
        (acc, point) => {
          const diffX = point.x - x;
          const diffY = point.y - y;

          // good old pythagoras
          const diff = Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));
          return acc == null || diff <= acc.diff ? { ...point, diff } : acc;
        },
        {
          // initial (max) diff
          diff: $snapRadius
        }
      );

    return point.id ? point : null;
  };

  const handleCanvasClick = ({ x, y, path }) => {
    // last two elements from 'path' are Window and document and they don't have .match() method
    const matchablePaths = path.filter((el, i) => i < path.length - 2);
    const hasPolygonTarget = matchablePaths.some((el) => el.matches('polygon'));
    const hasPointTarget = matchablePaths.some((el) => el.matches('.point'));
    const hasToolbarTarget = matchablePaths.some((el) => el.matches('.toolbar'));

    // unset selectedPolygonId if clicked outside polygon/point/toolbar
    if (!hasPolygonTarget && !hasPointTarget && !hasToolbarTarget) {
      selectedPolygonId.set(null);
    }

    // unset drawablePolygon if clicked on toolbar
    if (hasToolbarTarget) {
      drawablePolygonId.set(null);
    }

    if (!$isDrawing) return;

    if (!$drawablePolygonId) {
      polygons.addPolygon();
    }

    polygons.addPoint({
      x: isShiftPressed ? localDrawableX : closestPoint?.x ?? x,
      y: isShiftPressed ? localDrawableY : closestPoint?.y ?? y
    });
  };

  const handleCanvasScroll = (e) => {
    console.log(e);
  };

  const handleCanvasMousedown = (e) => {};

  const handleCanvasMousemove = ({ x, y, movementX, movementY }) => {
    if (($isDrawing || $dragablePointId) && $isSnapEnabled) {
      closestPoint = $polygons
        .filter(({ id }) => id !== $selectedPolygonId)
        .reduce((acc, { points }) => findClosestPoint({ points, x, y }) ?? acc, null);

      if (!closestPoint?.id) {
        if ($snapRadius > x) {
          closestPoint = { x: 0, y, id: 'snap-left' };
        }
        if ($snapRadius > y) {
          closestPoint = { x, y: 0, id: 'snap-top' };
        }
        if (imageWidth - $snapRadius < x) {
          closestPoint = { x: imageWidth, y, id: 'snap-right' };
        }
        if (imageHeight - $snapRadius < y) {
          closestPoint = { x, y: imageHeight, id: 'snap-bottom' };
        }
      }
    }

    if ($isDrawing) {
      localDrawableX = x;
      localDrawableY = y;

      if (!isShiftPressed) return;

      const diffX = Math.abs(x - lastDrawablePoint.x);
      const diffY = Math.abs(y - lastDrawablePoint.y);

      if (diffX < diffY) localDrawableX = lastDrawablePoint.x;
      if (diffX > diffY) localDrawableY = lastDrawablePoint.y;
    }

    if ($isToolbarDragging) {
      toolbarX.set($toolbarX + movementX);
      toolbarY.set($toolbarY + movementY);
      return;
    }

    if ($dragablePointId && $selectedPolygonId) {
      localDragablePoint.x = localDragablePoint.x + movementX;
      localDragablePoint.y = localDragablePoint.y + movementY;
      return;
    }

    if ($dragablePolygonId) {
      isDrawing.set(false);
      drawablePolygonId.set(null);
      localDragablePolygon.points = localDragablePolygon.points.map((point) => ({
        id: point.id,
        x: point.x + movementX,
        y: point.y + movementY
      }));
      return;
    }
  };

  const handleCanvasMouseup = (e) => {
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
      if ($isSnapEnabled && closestPoint) {
        localDragablePoint.x = closestPoint.x;
        localDragablePoint.y = closestPoint.y;
      }

      polygons.setDraggablePointPosition(localDragablePoint);
      dragablePointId.set(null);
      localDragablePoint = null;
    }

    if (!hasPolygonTarget && !hasToolbarTarget) {
      selectedPolygonId.set(null);
      hoveredPolygonId.set(null);
    }
  };

  const handlePolygonMouseenter = ({ e, polygon }) => {
    hoveredPolygonId.set(polygon.id);
  };

  const handlePolygonMousedown = ({ e, polygon }) => {
    localDragablePolygon = { ...polygon };
    dragablePolygonId.set(polygon.id);
    selectedPolygonId.set(polygon.id);
  };

  const handlePolygonMouseleave = ({ e, polygon }) => {
    const hasPolygonTarget = e.path
      .filter((el, i) => i < e.path.length - 2)
      .some((el) => el.matches('polygon'));
    hoveredPolygonId.set(null);
    if (!hasPolygonTarget) {
      dragablePolygonId.set(null);
    }
  };

  const handlePointMousedown = ({ e, point, polygon }) => {
    selectedPolygonId.set(polygon.id);
    dragablePointId.set(point.id);
    localDragablePoint = { ...point };
  };

  const handlePointMouseleave = ({ e, point, polygon }) => {
    const hasPointTarget = e.path
      .filter((el, i) => i < e.path.length - 2)
      .some((el) => el.matches('.point'));

    if (!hasPointTarget) {
      dragablePointId.set(null);
    }
  };

  const handleWindowKeydown = (e) => {
    isShiftPressed = e.shiftKey;
    isAltPressed = e.altKey;
    isCmdPressed = e.metaKey;

    if (e.key === 'Escape') {
      // polygons = $polygonsMap.reduce(
      //   (acc, polygon) => ({
      //     ...acc,
      //     ...(polygon.id !== $drawablePolygon.id && { [polygon.id]: polygon })
      //   }),
      //   {}
      // );
      // escape drawing state
      isDrawing.set(false);
      drawablePolygonId.set(null);
      // additional escape if dragging gets out of hand
    }
    if (e.key === 'Enter') {
      if ($drawablePolygonId) {
        selectedPolygonId.set($drawablePolygonId);
      }
      drawablePolygonId.set(null);
      isDrawing.set(false);
    }
    if (isCmdPressed && (e.key === 'Backspace' || e.key === 'Delete')) {
      if ($drawablePolygonId) {
        polygons.deletePolygon($drawablePolygonId);
        drawablePolygonId.set(null);
        drawablePolygonId.set(null);
        isDrawing.set(false);
        // additional escape if dragging gets out of hand
        dragablePolygonId.set(null);
        selectedPolygonId.set($drawablePolygonId);
        drawablePolygonId.set(null);
      }
      if ($selectedPolygonId) {
        polygons.deletePolygon($selectedPolygonId);
        selectedPolygonId.set(null);
      }
    }
    if (isCmdPressed && isShiftPressed && e.key === 'z') {
      history.redo();
    }
    if (isCmdPressed && !isShiftPressed && e.key === 'z') {
      history.undo();
    }
  };

  const handleWindowKeyup = (e) => {
    isShiftPressed = false;
    isAltPressed = false;
    isCmdPressed = false;
  };

  onMount(() => {
    console.log(svgEl);
    renderSvg.set(svgEl);
  });

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
        .replace(' ', '')
    };
  });

  $: lastDrawablePoint = $drawablePolygon
    ? $drawablePolygon.points[$drawablePolygon.points.length - 1]
    : {};

  $: drawablePolygonPoints =
    lastDrawablePoint &&
    $drawablePolygonId &&
    $drawablePolygon.points.reduce((pointsString, point) => {
      // serve X and Y from either localDragablePoint or regularly
      const { x, y } = localDragablePoint?.id === point.id ? localDragablePoint : point;
      return `${x},${y} ${pointsString}`;
    }, `${localDrawableX},${localDrawableY}`);
</script>

<svelte:window on:keydown={handleWindowKeydown} on:keyup={handleWindowKeyup} />

<svelte:head>
  <title>Home</title>
</svelte:head>

<div
  class="canvas"
  on:scroll={handleCanvasScroll}
  on:click={handleCanvasClick}
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={imageWidth}
        height={imageHeight}
        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
        bind:this={svgEl}
      >
        {#if $drawablePolygonId}
          <polygon class="placeholder" points={drawablePolygonPoints} />
        {/if}
        {#each renderPolygons as polygon, i}
          <polygon
            points={polygon.pointsReduced}
            id={polygon.id}
            {...polygon.attributes}
            class:is-drawing={$isDrawing && polygon.id === $drawablePolygonId}
            class:is-dragging={polygon.id === $dragablePolygonId}
            class:is-hovered={polygon.id === $hoveredPolygonId}
            class:is-selected={polygon.id === $selectedPolygonId}
            on:mousedown={(e) => handlePolygonMousedown({ e, polygon })}
            on:mouseenter={(e) => handlePolygonMouseenter({ e, polygon })}
            on:mouseleave={(e) => handlePolygonMouseleave({ e, polygon })}
          />
        {/each}
      </svg>
      {#each renderPolygons as polygon, polygonIndex}
        {#each polygon.points as point, pointIndex}
          <div
            style={`left:${point.x}px;top:${point.y}px;`}
            class="point"
            class:is-polygon-selected={polygon.id === $selectedPolygonId}
            class:is-polygon-hovered={polygon.id === $hoveredPolygonId}
            class:is-closest-snapable={point.id === closestPoint?.id}
            class:is-dragable={point.id === $dragablePointId}
            id={point.id}
            tabindex="0"
            on:mouseenter={() => hoveredPolygonId.set(polygon.id)}
            on:mousedown={(e) => handlePointMousedown({ e, point, polygon })}
            on:mouseleave={(e) => handlePointMouseleave({ e, point, polygon })}
          />
        {/each}
      {/each}
      {#if closestPoint?.id === 'snap-left'}
        <div style={`left:0px;top:${closestPoint?.y}px;`} class="point is-polygon-selected" />
      {:else if closestPoint?.id === 'snap-top'}
        <div style={`left:${closestPoint?.x}px;top:0px;`} class="point is-polygon-selected" />
      {:else if closestPoint?.id === 'snap-right'}
        <div
          style={`left:${imageWidth}px;top:${closestPoint?.y}px;`}
          class="point is-polygon-selected"
        />
      {:else if closestPoint?.id === 'snap-bottom'}
        <div
          style={`left:${closestPoint?.x}px;top:${imageHeight}px;`}
          class="point is-polygon-selected"
        />
      {/if}
    </div>
  {:else}
    <!-- <Dropzone multiple={false} on:drop={handleFilesChange} /> -->
    <FileUploaderDropContainer
      accept={['.jpg', '.JPG', '.jpeg', '.JPEG', '.gif', '.GIF', '.png', '.PNG', '.webp', '.WEBP']}
      labelText="Drop your image here or click to upload"
      class="canvas__upload"
      on:change={handleFilesChange}
    />
  {/if}
</div>
