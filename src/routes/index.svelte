<script context="module">
  export const prerender = true;
  export const ssr = false; // Dropzone relies on window object :(
</script>

<script>
  import Dropzone from 'svelte-file-dropzone';
  import { nanoid } from 'nanoid';
  import { onMount } from 'svelte';

  import ToolBar from '$lib/ToolBar/index.svelte';
  import { mode, renderSvg, globalAttributes } from '$lib/stores.js';
  import { attr } from 'svelte/internal';

  const RANGE_OFFSET = 10; // TODO - should be dynamic

  // let src;
  let src =
    'https://images.unsplash.com/photo-1607629823685-ae0850607241?auto=format&fit=crop&w=900&height=600&q=80';
  let imageEl;
  let imageWidth = 900;
  let imageHeight = 600;
  let svgEl;
  let polygonEls = [];
  let polygons = {};
  let drawablePolygon;
  let dragablePoint;
  let dragablePolygon;
  let selectedPolygon;
  let eventPath; // a bubble-up array path of event elements

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

  const getClosestPointInRange = ({ x, y }) => {
    return Object.values(drawablePolygon.points)
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

  const handleCanvasClick = ({ x, y, path }) => {
    // last two elements from 'path' are Window and document and they don't have .match() method
    const matchablePaths = path.filter((el, i) => i < path.length - 2);
    const isTargetPolygon = matchablePaths.some((el) => el.matches('polygon'));
    const isTargetPoint = matchablePaths.some((el) => el.matches('.point'));

    if (!isTargetPolygon && !isTargetPoint) {
      selectedPolygon = null;
    }

    // if ($mode !== 'draw' || dragablePoint) return;
    if ($mode !== 'draw') return;

    if (!drawablePolygon) {
      // console.log($globalAttributes);
      const attributes = $globalAttributes.reduce((acc, { name, value }) => {
        return {
          ...acc,
          [name]: value
        };
      }, {});
      drawablePolygon = {
        attributes,
        id: nanoid(4),
        points: {}
        // attributes: $globalAttributes.reduce((acc,))
      };
    }

    // if (getClosestPointInRange({ x, y }).id) {
    //   drawablePolygon = null;
    //   mode.set(null);
    //   return;
    // }

    const newPointId = nanoid(4);
    drawablePolygon.points[newPointId] = { x, y, id: newPointId };
    selectedPolygon = drawablePolygon;
    polygons[drawablePolygon.id] = drawablePolygon;
  };

  const handleCanvasScroll = (e) => {
    console.log(e);
  };

  const handleCanvasMousemove = (e) => {
    eventPath = e.path;

    // console.log(e.path.includes(svgEl));
  };

  const handlePointMousedown = ({ e, pointId, polygonId }) => {
    dragablePoint = polygons[polygonId].points[pointId];
  };

  const handlePointMousemove = ({ e, pointId, polygonId }) => {
    if (!dragablePoint || dragablePoint.id !== pointId) return;

    const { movementX, movementY } = e;
    polygons[polygonId].points[pointId].x += movementX;
    polygons[polygonId].points[pointId].y += movementY;
  };

  const handlePolygonClick = ({ e, id }) => {};

  const handlePolygonMousedown = ({ e, id }) => {
    dragablePolygon = polygons[id];
  };

  const handlePolygonMouseup = ({ e, id }) => {
    // if (!drawablePolygon) {
    //   selectedPolygon = polygons[id];
    // }
    dragablePolygon = null;
  };

  const handlePolygonMousemove = ({ e, id }) => {
    if (!dragablePolygon || dragablePolygon.id !== id) return;

    drawablePolygon = null;
    mode.set(null);

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

  const handleWindowKeydown = (e) => {
    if (e.key === 'Escape') {
      polygons = Object.values(polygons).reduce(
        (acc, polygon) => ({
          ...acc,
          ...(polygon.id !== drawablePolygon.id && { [polygon.id]: polygon })
        }),
        {}
      );
      drawablePolygon = null;
    }
    if (e.key === 'Enter') {
      if (drawablePolygon) {
        selectedPolygon = drawablePolygon;
      }
      mode.set(null);
    }
  };

  const handleApplyAttributeToAllPolygons = ({ detail }) => {
    polygons = Object.entries(polygons).reduce((acc, [id, polygon]) => {
      return {
        ...acc,
        [id]: {
          ...polygon,
          attributes: {
            ...polygon.attributes,
            [detail.name]: detail.value
          }
        }
      };
    }, {});
  };

  const handleAttributeValueChange = ({ name, value }) => {
    const { id } = selectedPolygon;
    polygons[id].attributes[name] = value;
  };

  $: renderPolygons = Object.entries(polygons).reduce((acc, [id, { points, attributes }]) => {
    const pointsArray = Object.values(points);
    const attributesObject = Object.entries(attributes).reduce((acc, [name, value]) => {
      return {
        ...acc,
        [name]: value
      };
    }, {});
    return [
      ...acc,
      {
        id,
        attributes: attributesObject,
        pointsArray,
        points: pointsArray.reduce((acc, { x, y }) => `${acc} ${x},${y}`, '').replace(' ', '')
      }
    ];
  }, []);

  onMount(() => {
    renderSvg.set(svgEl);
  });
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<svelte:head>
  <title>Home</title>
</svelte:head>

<div
  class="canvas"
  on:scroll={handleCanvasScroll}
  on:click={handleCanvasClick}
  on:mousemove={handleCanvasMousemove}
  class:is-drawing={$mode === 'draw'}
>
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
            {...polygon.attributes}
            class:is-drawing={$mode === 'draw' && polygon.id === drawablePolygon?.id}
            class:is-dragging={polygon.id === dragablePolygon?.id}
            bind:this={polygonEls[i]}
            on:click={(e) => handlePolygonClick({ e, id: polygon.id })}
            on:mousedown={(e) => handlePolygonMousedown({ e, id: polygon.id })}
            on:mousemove={(e) => handlePolygonMousemove({ e, id: polygon.id })}
            on:mouseup={(e) => handlePolygonMouseup({ e, id: polygon.id })}
            on:mouseleave={() => (dragablePolygon = null)}
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
            on:mouseup={() => (dragablePoint = null)}
            on:mouseleave={() => (dragablePoint = null)}
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
        on:mouseup={() => (dragablePoint = null)}
        on:mouseleave={() => (dragablePoint = null)}
      />
    {/each}
  </div>
-->
  {:else if !src}
    <Dropzone multiple={false} on:drop={handleFilesSelect} />
  {:else}
    nope
  {/if}
  <ToolBar
    {selectedPolygon}
    {polygons}
    on:apply-attribute-to-all-polygons={handleApplyAttributeToAllPolygons}
    on:attribute-value-change={handleAttributeValueChange}
  />
</div>
