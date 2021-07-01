<script context="module">
  export const prerender = true;
  export const ssr = false; // Dropzone relies on window object :(
</script>

<script>
  import Dropzone from 'svelte-file-dropzone';
  import { nanoid } from 'nanoid';
  import { onMount } from 'svelte';

  import ToolBar from '$lib/ToolBar/index.svelte';
  import {
    mode,
    renderSvg,
    globalAttributes,
    snapRadius,
    isSnapEnabled,
    polygons,
    renderPolygons,
    drawablePolygon,
    dragablePolygon,
    selectedPolygon,
    hoveredPolygon,
    dragablePoint,
    polygonsMap
  } from '$lib/stores.js';

  // let src;
  let src =
    'https://images.unsplash.com/photo-1607629823685-ae0850607241?auto=format&fit=crop&w=900&height=600&q=80';
  let imageEl;
  let imageWidth = 900;
  let imageHeight = 600;
  let svgEl;

  let dragStartX = 0;
  let dragStartY = 0;

  const handleImageLoad = (e) => {
    imageWidth = imageEl.naturalWidth;
    imageHeight = imageEl.naturalHeight;
  };

  const handleFilesSelect = (e) => {
    const { acceptedFiles, fileRejections } = e.detail;
    const reader = new FileReader();
    const [file] = acceptedFiles;
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

    // unset selectedPolygon if clicked outside polygon/point/toolbar
    if (!hasPolygonTarget && !hasPointTarget && !hasToolbarTarget) {
      selectedPolygon.set(null);
    }

    // unset drawablePolygon if clicked on toolbar/point
    if (hasToolbarTarget || hasPointTarget) {
      drawablePolygon.set(null);
    }

    if ($mode !== 'draw') return;

    if (!$drawablePolygon) {
      selectedPolygon.set(null);
      drawablePolygon.set({
        attributes: $globalAttributes,
        id: nanoid(6),
        points: {}
      });
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

    selectedPolygon.set($drawablePolygon);
    polygons.addPolygon($drawablePolygon);
  };

  const handleCanvasScroll = (e) => {
    console.log(e);
  };

  const handleCanvasMousedown = (e) => {
    dragStartX = e.x;
    dragStartY = e.y;
  };

  const handleCanvasMousemove = (e) => {
    // TODO: maybe $selectedPolygon, $dragablePoint and $dragablePolygon should be resolved in stores?
    if (!!$dragablePoint && !!$selectedPolygon) {
      const x = $dragablePoint.x + e.x - dragStartX;
      const y = $dragablePoint.y + e.y - dragStartY;
      polygons.movePoint($selectedPolygon, $dragablePoint, x, y);
      return;
    }

    if (!!$dragablePolygon) {
      drawablePolygon.set(null);
      mode.set(null);
      polygons.moveAllPoints($dragablePolygon, e.x - dragStartX, e.y - dragStartY);
      return;
    }
  };

  const handleCanvasMouseup = ({ x, y }) => {
    if (!!$dragablePolygon) {
      dragablePolygon.set(null);
    }

    if ($dragablePoint) {
      if ($isSnapEnabled) {
        const closestPoint = $polygonsMap
          .filter(({ id }) => id !== $selectedPolygon?.id)
          .reduce((acc, { points }) => findClosestPoint({ points, x, y }) ?? acc, null);

        if (closestPoint) {
          polygons.movePoint($selectedPolygon, $dragablePoint, closestPoint.x, closestPoint.y);
        }
      }
      dragablePoint.set(null);
    }
    selectedPolygon.set($polygons[$selectedPolygon?.id]);
  };

  const handlePolygonMouseenter = ({ e, polygon }) => {
    hoveredPolygon.set(polygon);
  };

  const handlePolygonMousedown = ({ e, polygon }) => {
    dragablePolygon.set($polygons[polygon.id]);
    selectedPolygon.set($polygons[polygon.id]);
  };

  const handlePolygonMouseleave = ({ e, polygon }) => {
    const hasPolygonTarget = e.path
      .filter((el, i) => i < e.path.length - 2)
      .some((el) => el.matches('polygon'));
    if (!hasPolygonTarget) {
      dragablePolygon.set(null);
      hoveredPolygon.set(null);
    }
  };

  const handlePointMousedown = ({ e, point, polygon }) => {
    dragablePoint.set($polygons[polygon.id].points[point.id]);
  };

  const handlePointMouseleave = ({ e, point, polygon }) => {
    const hasPointTarget = e.path
      .filter((el, i) => i < e.path.length - 2)
      .some((el) => el.matches('.point'));

    if (!hasPointTarget) {
      dragablePoint.set(null);
    }
  };

  const handleWindowKeydown = (e) => {
    if (e.key === 'Escape') {
      polygons = $polygonsMap.reduce(
        (acc, polygon) => ({
          ...acc,
          ...(polygon.id !== $drawablePolygon.id && { [polygon.id]: polygon })
        }),
        {}
      );
      // escape drawing state
      drawablePolygon.set(null);
      mode.set(null);
      // additional escape if dragging gets out of hand
      dragablePolygon.set(null);
    }
    if (e.key === 'Enter') {
      if ($drawablePolygon) {
        selectedPolygon.set($drawablePolygon);
      }
      mode.set(null);
    }
  };

  const handleAddAttribute = ({ detail }) => {
    polygons[selectedPolygon.id].attributes[detail.name] = detail.value;
    selectedPolygon.set(polygons[selectedPolygon.id]);
  };

  onMount(() => {
    renderSvg.set(svgEl);
  });
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
  class:is-drawing={$mode === 'draw'}
  style={`--snapRadius:${$snapRadius}px`}
>
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
        {#each $renderPolygons as polygon, i}
          <polygon
            points={polygon.points}
            id={polygon.id}
            {...polygon.attributes}
            class:is-drawing={$mode === 'draw' && polygon.id === $drawablePolygon?.id}
            class:is-dragging={polygon.id === $dragablePolygon?.id}
            class:is-hovered={polygon.id === $hoveredPolygon?.id}
            class:is-selected={polygon.id === $selectedPolygon?.id}
            on:mousedown={(e) => handlePolygonMousedown({ e, polygon })}
            on:mouseenter={(e) => handlePolygonMouseenter({ e, polygon })}
            on:mouseleave={(e) => handlePolygonMouseleave({ e, polygon })}
          />
        {/each}
      </svg>
      {#each $renderPolygons as polygon, polygonIndex}
        {#if polygon.id === $selectedPolygon?.id || polygon.id === $drawablePolygon?.id}
          {#each polygon.pointsMap as point, pointIndex}
            <div
              style={`left:${point.x}px;top:${point.y}px;`}
              class="point"
              id={point.id}
              tabindex="0"
              on:mousedown={(e) => handlePointMousedown({ e, point, polygon })}
              on:mouseleave={(e) => handlePointMouseleave({ e, point, polygon })}
            />
          {/each}
        {/if}
      {/each}
    </div>
  {:else if !src}
    <Dropzone multiple={false} on:drop={handleFilesSelect} />
  {:else}
    nope
  {/if}
  <ToolBar on:add-attribute={handleAddAttribute} />
</div>
