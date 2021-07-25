<script>
  import { drawedPolygon, drawedPolygonIndex, mouseX, mouseY } from '$lib/stores.js';

  $: lastDrawedPoint = $drawedPolygon
    ? $drawedPolygon.points[$drawedPolygon.points.length - 1]
    : {};

  $: placeholderPolygonPoints =
    lastDrawedPoint &&
    $drawedPolygonIndex !== -1 &&
    $drawedPolygon.points.reduce((pointsString, { x, y }) => {
      return `${x},${y} ${pointsString}`;
    }, `${$mouseX},${$mouseY}`);
</script>

<polygon class="placeholder" points={placeholderPolygonPoints} />
