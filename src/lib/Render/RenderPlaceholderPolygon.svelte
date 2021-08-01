<script>
  import { drawnPolygon, drawnPolygonIndex, mouseX, mouseY } from '$lib/stores.js';

  $: lastDrawnPoint = $drawnPolygon
    ? $drawnPolygon.points[$drawnPolygon.points.length - 1]
    : {};

  $: placeholderPolygonPoints =
    lastDrawnPoint &&
    $drawnPolygonIndex !== -1 &&
    $drawnPolygon.points.reduce((pointsString, { x, y }) => {
      return `${x},${y} ${pointsString}`;
    }, `${$mouseX},${$mouseY}`);
</script>

<polygon class="placeholder" points={placeholderPolygonPoints} />
