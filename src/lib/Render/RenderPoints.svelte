<script>
  import {
    isCmdPressed,
    isAltPressed,
    renderPolygons,
    selectedPolygonIndex,
    hoveredPolygonIndex,
    hoveredPointIndex,
    draggedPoint,
    draggedPointId,
    closestSnapPoint,
    imageWidth,
    imageHeight
  } from '$lib/stores.js';

  let closestLinePoint = null;

  const handlePointMouseenter = ({ pointIndex, polygonIndex }) => {
    hoveredPolygonIndex.set(polygonIndex);
    hoveredPointIndex.set(pointIndex);
  };

  const handlePointMousedown = ({ point, polygonIndex }) => {
    selectedPolygonIndex.set(polygonIndex);
    draggedPoint.set({ ...point });
  };

  const handlePointMouseleave = (e) => {
    const hasPointTarget = e.path.some((el) => el.matches?.('.point'));

    hoveredPointIndex.set(-1);

    if (!hasPointTarget) {
      draggedPoint.set(null);
    }
  };
</script>

{#each $renderPolygons as polygon, polygonIndex}
  {#each polygon.points as point, pointIndex}
    <div
      style={`left:${point.x}px;top:${point.y}px;`}
      class="point"
      class:is-polygon-selected={polygonIndex === $selectedPolygonIndex}
      class:is-polygon-hovered={polygonIndex === $hoveredPolygonIndex}
      class:is-hoovered={polygonIndex === $hoveredPolygonIndex && pointIndex === $hoveredPointIndex}
      class:is-closest-snapable={point.id === $closestSnapPoint?.id && $isCmdPressed}
      class:is-dragable={point.id === $draggedPointId && polygonIndex === $hoveredPolygonIndex}
      id={point.id}
      tabindex="0"
      on:mouseenter={() => handlePointMouseenter({ pointIndex, polygonIndex })}
      on:mousedown={() => handlePointMousedown({ point, polygonIndex })}
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
  {#if closestLinePoint && $isAltPressed}
    <div
      style={`left:${closestLinePoint?.x}px;top:${closestLinePoint?.y}px;pointer-events:none`}
      class="point is-polygon-hovered yololo"
    />
  {/if}
{/if}
