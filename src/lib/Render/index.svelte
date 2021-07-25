<script>
  import {
    isDrawing,
    renderPolygons,
    drawedPolygon,
    drawedPolygonIndex,
    selectedPolygonIndex,
    draggedPolygon,
    hoveredPolygonIndex,
    svgEl,
    imageEl,
    imageSrc,
    imageWidth,
    imageHeight,
    mouseX,
    mouseY
  } from '$lib/stores.js';

  import RenderImage from '$lib/Render/RenderImage.svelte';
  import RenderPoints from '$lib/Render/RenderPoints.svelte';
  import RenderLines from '$lib/Render/RenderLines.svelte';

  const handlePolygonMouseenter = ({ polygonIndex }) => {
    hoveredPolygonIndex.set(polygonIndex);
  };

  const handlePolygonMousedown = ({ polygon, polygonIndex }) => {
    draggedPolygon.set({ ...polygon });
    selectedPolygonIndex.set(polygonIndex);
  };

  const handlePolygonMouseleave = ({ e }) => {
    const hasPolygonTarget = e.path.some((el) => el.matches?.('polygon'));

    hoveredPolygonIndex.set(-1);

    if (!hasPolygonTarget) {
      draggedPolygon.set(null);
    }
  };

  $: lastDrawedPoint = $drawedPolygon
    ? $drawedPolygon.points[$drawedPolygon.points.length - 1]
    : {};

  $: drawedPolygonPoints =
    lastDrawedPoint &&
    $drawedPolygonIndex !== -1 &&
    $drawedPolygon.points.reduce((pointsString, { x, y }) => {
      return `${x},${y} ${pointsString}`;
    }, `${$mouseX},${$mouseY}`);
</script>

<div class="render">
  <RenderImage />
  {#if $imageWidth && $imageHeight}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${$imageWidth} ${$imageHeight}`}
      bind:this={$svgEl}
    >
      {#if $drawedPolygonIndex !== -1 && $isDrawing}
        <polygon class="placeholder" points={drawedPolygonPoints} />
      {/if}
      {#each $renderPolygons as polygon, polygonIndex}
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
      <RenderLines />
    </svg>
  {/if}
  <RenderPoints />
</div>
