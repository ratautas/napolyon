<script>
  import {
    isCmdPressed,
    isAltPressed,
    renderPolygons,
    selectedPolygonIndex,
    hoveredPolygonIndex,
    hoveredPoint,
    draggedPoint,
    selectedPoint,
    closestSnapPoint,
    closestLinePoint,
    imageWidth,
    imageHeight
  } from '$lib/stores.js';

  const handlePointMouseenter = ({ point, polygonIndex }) => {
    hoveredPolygonIndex.set(polygonIndex);
    hoveredPoint.set(point);
  };

  const handlePointMouseleave = (e) => {
    const hasPointTarget = e.path.some((el) => el.matches?.('.point'));

    hoveredPoint.set(null);

    if (!hasPointTarget) {
      draggedPoint.set(null);
    }
  };

  const handlePointMousedown = ({ point, polygonIndex }) => {
    selectedPolygonIndex.set(polygonIndex);
    draggedPoint.set({ ...point });
  };

  const handlePointMouseup = ({ point }) => {
    selectedPoint.set({ ...point });
  };
</script>

{#each $renderPolygons as polygon, polygonIndex}
  {#each polygon.points as point, pointIndex}
    <div
      style={`left:${point.x}px;top:${point.y}px;`}
      class="point"
      class:is-polygon-selected={polygonIndex === $selectedPolygonIndex}
      class:is-polygon-hovered={polygonIndex === $hoveredPolygonIndex}
      class:is-hovered={polygonIndex === $hoveredPolygonIndex && point.id === $hoveredPoint?.id}
      class:is-closest-snapable={point.id === $closestSnapPoint?.id && $isCmdPressed}
      class:is-dragable={point.id === $draggedPoint?.id}
      class:is-selected={point.id === $selectedPoint?.id}
      id={point.id}
      tabindex="0"
      on:mouseenter={() => handlePointMouseenter({ point, polygonIndex })}
      on:mousedown={() => handlePointMousedown({ point, polygonIndex })}
      on:mouseup={() => handlePointMouseup({ point })}
      on:mouseleave={handlePointMouseleave}
    />
  {/each}
{/each}
{#if $isCmdPressed}
  {#if $closestSnapPoint?.id === 'snap-left'}
    <div style={`left:0px;top:${$closestSnapPoint?.y}px;`} class="point is-polygon-selected" />
  {:else if $closestSnapPoint?.id === 'snap-top'}
    <div style={`left:${$closestSnapPoint?.x}px;top:0px;`} class="point is-polygon-selected" />
  {:else if $closestSnapPoint?.id === 'snap-right'}
    <div
      style={`left:${imageWidth}px;top:${$closestSnapPoint?.y}px;`}
      class="point is-polygon-selected"
    />
  {:else if $closestSnapPoint?.id === 'snap-bottom'}
    <div
      style={`left:${$closestSnapPoint?.x}px;top:${imageHeight}px;`}
      class="point is-polygon-selected"
    />
  {/if}
{/if}
{#if $closestLinePoint && $isAltPressed}
  <div
    style={`left:${$closestLinePoint?.x}px;top:${$closestLinePoint?.y}px;pointer-events:none`}
    class="point is-polygon-hovered yololo"
  />
{/if}
