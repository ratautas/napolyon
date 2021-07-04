<script context="module">
  export const prerender = true;
  export const ssr = false; // Dropzone relies on window object :(
</script>

<script>
  import { nanoid } from 'nanoid';
  import { onMount } from 'svelte';
  import FileUploaderDropContainer from 'carbon-components-svelte/src/FileUploader/FileUploaderDropContainer.svelte';
  import * as Y from 'yjs';

  import ToolBar from '$lib/ToolBar/index.svelte';
  import {
    renderSvg,
    globalAttributes,
    snapRadius,
    isSnapEnabled,
    polygons,
    drawablePolygon,
    selectedPolygon,
    selectedPolygonId,
    dragablePolygonId,
    hoveredPolygonId,
    dragablePointId,
    closestSnapablePointId,
    polygonsMap,
    isToolbarDragging,
    toolbarX,
    toolbarY,
    isDrawing
  } from '$lib/stores.js';
  import { yPolygons, yDoc, yRenderPolygons, yPolygonsMap, yHistory } from '$lib/y.js';

  let src;
  src =
    'https://images.unsplash.com/photo-1607629823685-ae0850607241?auto=format&fit=crop&w=900&height=600&q=80';
  let imageEl;
  let imageWidth = 900;
  let imageHeight = 600;
  let svgEl;
  let closestPoint = null;

  let dragablePollie;

  const handleImageLoad = (e) => {
    imageWidth = imageEl.naturalWidth;
    imageHeight = imageEl.naturalHeight;
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
    const closestPoint = Object.values(points)
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
    return closestPoint.id ? closestPoint : null;
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

    // unset drawablePolygon if clicked on toolbar/point
    if (hasToolbarTarget || hasPointTarget) {
      drawablePolygon.set(null);
    }

    if (!$isDrawing) return;

    // if is first point
    if (!$drawablePolygon) {
      const newPolygonId = nanoid(6);
      selectedPolygonId.set(null);
      drawablePolygon.set({
        attributes: $globalAttributes,
        id: newPolygonId,
        points: {}
      });

      const newPolygonMap = new Y.Map();
      newPolygonMap.set('id', newPolygonId);
      newPolygonMap.set('attributes', new Y.Map());
      newPolygonMap.set('points', new Y.Array());
      yPolygons.push([newPolygonMap]);
    }

    const newPointId = nanoid(6);
    const closestPoint =
      $isSnapEnabled &&
      $polygonsMap
        // TODO - instead of filtering out drawablePolygon, replace and do not create a new point on same polygon
        .filter(({ id }) => id !== $drawablePolygon.id)
        .reduce((acc, { points }) => findClosestPoint({ points, x, y }) ?? acc, null);

    drawablePolygon.addPoint({
      x: closestPoint?.x ?? x,
      y: closestPoint?.y ?? y,
      id: newPointId
    });

    selectedPolygonId.set($drawablePolygon.id);
    polygons.addPolygon($drawablePolygon);

    yPolygons
      .toArray()
      .find((el) => el.get('id') === $drawablePolygon.id)
      .get('points')
      .push([
        {
          x: closestPoint?.x ?? x,
          y: closestPoint?.y ?? y,
          id: newPointId
        }
      ]);
  };

  const handleCanvasScroll = (e) => {
    console.log(e);
  };

  const handleCanvasMousedown = (e) => {};

  const handleCanvasMousemove = ({ x, y, movementX, movementY }) => {
    if ($isToolbarDragging) {
      toolbarX.set($toolbarX + movementX);
      toolbarY.set($toolbarY + movementY);
      return;
    }

    if ($isDrawing) {
      if ($isSnapEnabled) {
        closestPoint = $polygonsMap
          .filter(({ id }) => id !== $drawablePolygon?.id)
          .reduce((acc, { points }) => findClosestPoint({ points, x, y }) ?? acc, null);
        if (closestPoint) {
          closestSnapablePointId.set(closestPoint.id);
        } else if (closestSnapablePointId) {
          closestSnapablePointId.set(null);
        }
      }
      return;
    }

    // TODO: maybe $selectedPolygon, $dragablePoint and $dragablePolygon should be resolved in stores?
    // if (!!$dragablePointId && !!$selectedPolygon) {
    if ($dragablePointId && $selectedPolygonId) {
      polygons.movePoint($selectedPolygon, $dragablePointId, x, y);
      if ($isSnapEnabled) {
        const closestPoint = $polygonsMap
          .filter(({ id }) => id !== $selectedPolygonId)
          .reduce((acc, { points }) => findClosestPoint({ points, x, y }) ?? acc, null);
        if (closestPoint) {
          closestSnapablePointId.set(closestPoint.id);
        } else if (closestSnapablePointId) {
          closestSnapablePointId.set(null);
        }
      }
      return;
    }

    if ($dragablePolygonId) {
      drawablePolygon.set(null);
      isDrawing.set(false);
      dragablePollie.points = Object.values(dragablePollie.points).reduce(
        (acc, point) => ({
          ...acc,
          [point.id]: {
            id: point.id,
            x: point.x + movementX,
            y: point.y + movementY
          }
        }),
        {}
      );
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

    if ($dragablePolygonId && dragablePollie) {
      const updatedPoints = new Y.Array();
      Object.values(dragablePollie.points).forEach((point) => {
        updatedPoints.push([point]);
      });

      yPolygons
        .toArray()
        .find((el) => el.get('id') === $dragablePolygonId)
        .set('points', updatedPoints);

      dragablePolygonId.set(null);
      dragablePollie = null;
    }

    if ($dragablePointId) {
      if ($isSnapEnabled) {
        const { x, y } = $selectedPolygon?.points[$dragablePointId];
        const closestPoint = $polygonsMap
          .filter(({ id }) => id !== $selectedPolygonId)
          .reduce((acc, { points }) => findClosestPoint({ points, x, y }) ?? acc, null);

        if (closestPoint) {
          polygons.movePoint($selectedPolygon, $dragablePointId, closestPoint.x, closestPoint.y);
        }
      }
      dragablePointId.set(null);
    }

    if (!hasPolygonTarget && !hasToolbarTarget) {
      selectedPolygonId.set(null);
      hoveredPolygonId.set(null);
    }

    closestSnapablePointId.set(null);
  };

  const handlePolygonMouseenter = ({ e, polygon }) => {
    hoveredPolygonId.set(polygon.id);
  };

  const handlePolygonMousedown = ({ e, polygon }) => {
    dragablePollie = yPolygons
      .toArray()
      .find((polygonMap) => $selectedPolygonId === polygonMap.get('id'))
      .toJSON();
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
    if (e.key === 'Escape') {
      // polygons = $polygonsMap.reduce(
      //   (acc, polygon) => ({
      //     ...acc,
      //     ...(polygon.id !== $drawablePolygon.id && { [polygon.id]: polygon })
      //   }),
      //   {}
      // );
      // escape drawing state
      drawablePolygon.set(null);
      isDrawing.set(false);
      // additional escape if dragging gets out of hand
      dragablePolygonId.set(null);
    }
    if (e.key === 'Enter') {
      if ($drawablePolygon) {
        selectedPolygonId.set($drawablePolygon.id);
      }
      isDrawing.set(false);
    }
    if (e.metaKey && !e.shiftKey && e.key === 'z') {
      yHistory.undo();
    }
    if (e.metaKey && e.shiftKey && e.key === 'z') {
      yHistory.redo();
    }

    if (e.key === 'Delete') {
      if ($drawablePolygon) {
        drawablePolygon.set(null);
        isDrawing.set(false);
        // additional escape if dragging gets out of hand
        dragablePolygonId.set(null);
        selectedPolygonId.set($drawablePolygon.id);
      }
      if ($selectedPolygonId) {
        polygons.deletePolygon($selectedPolygonId);
        selectedPolygonId.set(null);
      }
    }
  };

  onMount(() => {
    renderSvg.set(svgEl);
  });

  $: dragablePolliePoints =
    dragablePollie &&
    Object.values(dragablePollie.points)
      .reduce((acc, { x, y }) => `${acc} ${x},${y}`, '')
      .replace(' ', '');
</script>

<svelte:window on:keydown={handleWindowKeydown} />

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
        <!-- classes, styles and id should be removed -->
        {#each $yRenderPolygons as polygon, i}
          <polygon
            points={$dragablePolygonId ? dragablePolliePoints : polygon.points}
            id={polygon.id}
            {...polygon.attributes}
            class:is-drawing={$isDrawing && polygon.id === $drawablePolygon?.id}
            class:is-dragging={polygon.id === $dragablePolygonId}
            class:is-hovered={polygon.id === $hoveredPolygonId}
            class:is-selected={polygon.id === $selectedPolygonId}
            on:mousedown={(e) => handlePolygonMousedown({ e, polygon })}
            on:mouseenter={(e) => handlePolygonMouseenter({ e, polygon })}
            on:mouseleave={(e) => handlePolygonMouseleave({ e, polygon })}
          />
        {/each}
      </svg>
      {#each $yRenderPolygons as polygon, polygonIndex}
        {#each $dragablePolygonId ? Object.values(dragablePollie.points) : polygon.pointsMap as point, pointIndex}
          <div
            style={`left:${point.x}px;top:${point.y}px;`}
            class="point"
            class:is-polygon-selected={polygon.id === $selectedPolygonId}
            class:is-polygon-hovered={polygon.id === $hoveredPolygonId}
            class:is-closest-snapable={point.id === $closestSnapablePointId}
            class:is-dragable={point.id === $dragablePointId}
            id={point.id}
            tabindex="0"
            on:mouseenter={() => hoveredPolygonId.set(polygon.id)}
            on:mousedown={(e) => handlePointMousedown({ e, point, polygon })}
            on:mouseleave={(e) => handlePointMouseleave({ e, point, polygon })}
          />
        {/each}
      {/each}
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
