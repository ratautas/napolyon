<script>
  import {
    isShiftPressed,
    isCmdPressed,
    isAltPressed,
    isDrawing,
    renderPolygons,
    drawedPolygon,
    drawedPolygonIndex,
    selectedPolygonIndex,
    draggedPolygon,
    hoveredPolygonIndex,
    hoveredPointIndex,
    hoveredLineIndex,
    draggedPoint,
    draggedPointId,
    closestSnapPoint,
    svgEl,
    imageEl,
    imageSrc,
    imageWidth,
    imageHeight,
    mouseX,
    mouseY
  } from '$lib/stores.js';

  import RenderPoints from '$lib/Render/RenderPoints.svelte';

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

  const handleLineMouseenter = ({ polygonIndex, lineIndex }) => {
    hoveredLineIndex.set(lineIndex);
    hoveredPolygonIndex.set(polygonIndex);
  };

  const handleLineMouseleave = () => {
    hoveredPolygonIndex.set(-1);
    hoveredLineIndex.set(-1);
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

  const handleImageLoad = async (e) => {
    imageWidth.set($imageEl.naturalWidth);
    imageHeight.set($imageEl.naturalHeight);
  };
</script>

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
      {#each $renderPolygons as polygon, polygonIndex}
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
  <RenderPoints />
</div>
