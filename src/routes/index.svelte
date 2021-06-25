<script context="module">
  export const prerender = true;
  export const ssr = false; // Dropzone relies on window object :(
</script>

<script>
  import Dropzone from 'svelte-file-dropzone';
  import { nanoid } from 'nanoid';

  import ToolBar from '$lib/ToolBar/index.svelte';
  import { mode } from '$lib/stores.js';

  let src;
  let imageEl;
  let imageWidth;
  let imageHeight;
  let polygonPoints = [];
  let activePoint;

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

  const handleCanvasClick = ({ x, y }) => {
    if ($mode !== 'add') return;
    polygonPoints = [...polygonPoints, { x, y, id: nanoid() }];
  };

  const handlePointClick = (id) => {
    console.log(id);
  };

  const handlePointMousedown = (e, index, id) => {
    activePoint = polygonPoints[index];
    // const { x, y } = e;
    // polygonPoints[index].x = movementX;
    // polygonPoints[index].y = movementY;
  };

  const handlePointMousemove = (e, index, id) => {
    if (!activePoint || activePoint.id !== id) return;
    const { movementX, movementY } = e;
    polygonPoints[index].x += movementX;
    polygonPoints[index].y += movementY;
  };

  const handleCanvasScroll = (e) => {
    console.log(e);
  };

  $: points = polygonPoints.reduce((acc, { x, y }) => `${acc} ${x},${y}`, '');
</script>

<svelte:head>
  <title>Home</title>
</svelte:head>

<div class="canvas" on:scroll={handleCanvasScroll} on:click={handleCanvasClick}>
  {#if src}
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
          on:mouseup={() => (activePoint = null)}
          on:mouseleave={() => (activePoint = null)}
        />
      {/each}
    </div>
  {:else if !src}
    <Dropzone multiple={false} on:drop={handleFilesSelect} />
  {:else}
    nope
  {/if}
  <ToolBar />
</div>
