<script>
  import {
    isDrawing,
    renderPolygons,
    drawnPolygonIndex,
    selectedPolygonIndex,
    draggedPolygon,
    hoveredPolygonIndex,
    svgEl,
    imageWidth,
    imageHeight
  } from '$lib/stores';

  import RenderImage from '$lib/Render/RenderImage.svelte';
  import RenderPoints from '$lib/Render/RenderPoints.svelte';
  import RenderLines from '$lib/Render/RenderLines.svelte';
  import RenderPlaceholderPolygon from '$lib/Render/RenderPlaceholderPolygon.svelte';

  const handlePolygonMouseenter = ({ polygonIndex }) => {
    if (!$isDrawing) {
      hoveredPolygonIndex.set(polygonIndex);
    }
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
</script>

<div class="render">
  <RenderImage />
  {#if $imageWidth && $imageHeight}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${$imageWidth} ${$imageHeight}`}
      bind:this={$svgEl}
    >
      {#if $drawnPolygonIndex !== -1 && $isDrawing}
        <RenderPlaceholderPolygon />
      {/if}
      {#each $renderPolygons as polygon, polygonIndex}
        <polygon
          points={polygon.pointsReduced}
          id={polygon.id}
          {...polygon.attributes}
          class:is-drawing={$isDrawing && polygonIndex === $drawnPolygonIndex}
          class:is-dragging={polygonIndex === $drawnPolygonIndex}
          class:is-hovered={polygonIndex === $hoveredPolygonIndex}
          class:is-selected={polygonIndex === $selectedPolygonIndex}
          on:mouseenter={(e) => handlePolygonMouseenter({ polygonIndex })}
          on:mousedown={(e) => handlePolygonMousedown({ polygon, polygonIndex })}
          on:mouseleave={(e) => handlePolygonMouseleave({ e })}
        />
      {/each}
      <RenderLines />
    </svg>
  {/if}
  <RenderPoints />
</div>
