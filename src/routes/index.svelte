<script context="module">
  export const prerender = true;
  export const ssr = false; // Dropzone relies on window object :(
</script>

<script>
  import Dropzone from 'svelte-file-dropzone';
  import { nanoid } from 'nanoid';
  import { onMount } from 'svelte';

  import ToolBar from '$lib/ToolBar/index.svelte';
  import { modeState, svgState } from '$lib/stores.js';

  // let src;
  let src =
    'https://images.unsplash.com/photo-1607629823685-ae0850607241?auto=format&fit=crop&w=900&height=600&q=80';
  let imageEl;
  let imageWidth = 900;
  let imageHeight = 600;
  let svgEl;
  let polygons = {};
  let editablePolygon;
  let moveablePoint;
  let moveablePolygon;

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

  const RANGE_OFFSET = 10;

  const getClosestPointInRange = ({ x, y }) => {
    return Object.values(editablePolygon.points)
      .filter((point) => point.x > x - RANGE_OFFSET && point.x < x + RANGE_OFFSET)
      .filter((point) => point.y > y - RANGE_OFFSET && point.y < y + RANGE_OFFSET)
      .reduce(
        (acc, point) => {
          const diffX = point.x - x;
          const diffY = point.y - y;

          // good old pythagoras
          const diff = Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));
          return acc == null || diff <= acc.diff ? { ...point, diff } : acc;
        },
        {
          diff: RANGE_OFFSET
        }
      );
  };

  const handleCanvasClick = ({ x, y }) => {
    if ($modeState !== 'add' || moveablePoint) return;
    if (!editablePolygon) {
      editablePolygon = { id: nanoid(4), points: {} };
    }
    if (getClosestPointInRange({ x, y }).id) {
      editablePolygon = null;
      modeState.set(null);
      return;
    }

    const newPointId = nanoid(4);
    editablePolygon.points[newPointId] = { x, y, id: newPointId };
    polygons[editablePolygon.id] = editablePolygon;
  };

  const handlePointMousedown = ({ e, pointId, polygonId }) => {
    moveablePoint = polygons[polygonId].points[pointId];
  };

  const handlePointMousemove = ({ e, pointId, polygonId }) => {
    if (!moveablePoint || moveablePoint.id !== pointId) return;
    const { movementX, movementY } = e;
    polygons[polygonId].points[pointId].x += movementX;
    polygons[polygonId].points[pointId].y += movementY;
  };

  const handlePolygonMousedown = ({ e, id }) => {
    moveablePolygon = polygons[id];
  };

  const handlePolygonMousemove = ({ e, id }) => {
    if (!moveablePolygon || moveablePolygon.id !== id) return;

    editablePolygon = null;
    modeState.set(null);

    const { movementX, movementY } = e;

    polygons[id].points = Object.values(polygons[id].points).reduce(
      (acc, point) => ({
        ...acc,
        [point.id]: {
          ...point,
          x: (point.x += movementX),
          y: (point.y += movementY)
        }
      }),
      {}
    );
  };

  const handleCanvasScroll = (e) => {
    console.log(e);
  };

  $: renderPolygons = Object.entries(polygons).reduce((acc, [id, { points }]) => {
    const pointsArray = Object.values(points);
    return [
      ...acc,
      {
        id,
        pointsArray,
        points: pointsArray.reduce((acc, { x, y }) => `${acc} ${x},${y}`, '')
      }
    ];
  }, []);

  onMount(() => {
    svgState.set(svgEl);
  });
</script>

<svelte:head>
  <title>Home</title>
</svelte:head>

<div class="canvas" on:scroll={handleCanvasScroll} on:click={handleCanvasClick}>
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
        {#each renderPolygons as polygon, i}
          <polygon
            points={polygon.points}
            style="fill:lime;stroke:purple;stroke-width:1"
            on:mousedown={(e) => handlePolygonMousedown({ e, id: polygon.id })}
            on:mousemove={(e) => handlePolygonMousemove({ e, id: polygon.id })}
            on:mouseup={() => (moveablePolygon = null)}
            on:mouseleave={() => (moveablePolygon = null)}
          />
        {/each}
      </svg>
      {#each renderPolygons as { pointsArray, id: polygonId }, polygonIndex}
        {#each pointsArray as { x, y, id: pointId }, pointIndex}
          <div
            style={`top:${y}px;left:${x}px`}
            class="point"
            on:mousedown={(e) => handlePointMousedown({ e, pointId, polygonId })}
            on:mousemove={(e) => handlePointMousemove({ e, pointId, polygonId })}
            on:mouseup={() => (moveablePoint = null)}
            on:mouseleave={() => (moveablePoint = null)}
          />
        {/each}
      {/each}
    </div>
    <!--
    <div class="render">
    <img {src} alt="" bind:this={imageEl} on:load={handleImageLoad} />
      {#if polygonPoints.length > 2}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={imageWidth}
        height={imageHeight}
        viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      >
        <polygon {points} style="fill:lime;stroke:purple;stroke-width:1" />
      </svg>
    {/if}
    {#each polygonPoints as { x, y, id }, i}
      <div
        style={`top:${y}px;left:${x}px`}
        class="point"
        on:mousedown={(e) => handlePointMousedown(e, i, id)}
        on:mousemove={(e) => handlePointMousemove(e, i, id)}
        on:mouseup={() => (moveablePoint = null)}
        on:mouseleave={() => (moveablePoint = null)}
      />
    {/each}
  </div>
-->
  {:else if !src}
    <Dropzone multiple={false} on:drop={handleFilesSelect} />
  {:else}
    nope
  {/if}
  <ToolBar />
</div>
