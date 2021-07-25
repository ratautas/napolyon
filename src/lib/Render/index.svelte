<script context="module">
  export const prerender = true;
  export const hydrate = false;
  export const ssr = false; // Dropzone relies on window object :(
</script>

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
    svgEl,
    imageEl,
    imageSrc,
    imageWidth,
    imageHeight
  } from '$lib/stores.js';

  let closestSnapPoint = null;
  let closestLinePoint = null;

  let localX;
  let localY;

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

  const handlePointMousedown = ({ point, polygonIndex, pointIndex }) => {
    selectedPolygonIndex.set(polygonIndex);
    console.log(point);
    draggedPoint.set({ ...point });
  };

  const handlePointMouseenter = ({ pointIndex, polygonIndex }) => {
    hoveredPolygonIndex.set(polygonIndex);
    hoveredPointIndex.set(pointIndex);
  };

  const handlePointMouseleave = ({ e }) => {
    const hasPointTarget = e.path.some((el) => el.matches?.('.point'));

    hoveredPointIndex.set(-1);

    if (!hasPointTarget) {
      draggedPoint.set(null);
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
    }, `${localX},${localY}`);

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

  {#if !!$imageWidth && !!$imageHeight}
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
  {#each $renderPolygons as polygon, polygonIndex}
    {#each polygon.points as point, pointIndex}
      <div
        style={`left:${point.x}px;top:${point.y}px;`}
        class="point"
        class:is-polygon-selected={polygonIndex === $selectedPolygonIndex}
        class:is-polygon-hovered={polygonIndex === $hoveredPolygonIndex}
        class:is-hoovered={polygonIndex === $hoveredPolygonIndex &&
          pointIndex === $hoveredPointIndex}
        class:is-closest-snapable={point.id === closestSnapPoint?.id && $isCmdPressed}
        class:is-dragable={point.id === $draggedPointId && polygonIndex === $hoveredPolygonIndex}
        id={point.id}
        tabindex="0"
        on:mouseenter={() => handlePointMouseenter({ pointIndex, polygonIndex })}
        on:mouseleave={(e) =>
          handlePointMouseleave({ e, point, polygon, polygonIndex, polygonIndex })}
        on:mousedown={(e) => handlePointMousedown({ e, point, polygon, polygonIndex, pointIndex })}
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
