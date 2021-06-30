<script context="module">
  export const prerender = true;
  export const ssr = false; // Dropzone relies on window object :(
</script>

<script>
  import Dropzone from 'svelte-file-dropzone';
  import { nanoid } from 'nanoid';
  import { onMount } from 'svelte';

  import ToolBar from '$lib/ToolBar/index.svelte';
  import { mode, renderSvg, globalAttributes, snapRadius, isSnapEnabled } from '$lib/stores.js';
  import { attr } from 'svelte/internal';

  // let src;
  let src =
    'https://images.unsplash.com/photo-1607629823685-ae0850607241?auto=format&fit=crop&w=900&height=600&q=80';
  let imageEl;
  let imageWidth = 900;
  let imageHeight = 600;
  let svgEl;
  let polygonEls = [];
  let polygons = {
    L8EIvC: {
      attributes: {
        'stroke-width': '1',
        stroke: 'rgba(255,255,255,.8)',
        fill: 'rgba(0,0,0,.5)'
      },
      id: 'L8EIvC',
      points: {
        LsJQaN: {
          x: 615,
          y: 45,
          id: 'LsJQaN'
        },
        QyO1oa: {
          x: 865,
          y: 65,
          id: 'QyO1oa'
        },
        jRfjxP: {
          x: 865,
          y: 245,
          id: 'jRfjxP'
        },
        i0spdb: {
          x: 560,
          y: 107,
          id: 'i0spdb'
        }
      }
    },
    DaNhAj: {
      attributes: {
        'stroke-width': '1',
        stroke: 'rgba(255,255,255,.8)',
        fill: 'rgba(0,0,0,.5)'
      },
      id: 'DaNhAj',
      points: {
        YKdSHB: {
          x: 678,
          y: 247,
          id: 'YKdSHB'
        },
        IHLh3o: {
          x: 870,
          y: 295,
          id: 'IHLh3o'
        },
        ABqVA8: {
          x: 858,
          y: 497,
          id: 'ABqVA8'
        },
        WH2UKA: {
          x: 681,
          y: 475,
          id: 'WH2UKA'
        }
      }
    }
  };
  let drawablePolygon;
  let dragablePolygon;
  let selectedPolygon;
  let dragablePoint;
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

  const findClosestPoint = ({ points, x, y }) => {
    const closestPoint = Object.values(points)
      .filter((point) => point.x > x - $snapRadius && point.x < x + $snapRadius)
      .filter((point) => point.y > y - $snapRadius && point.y < y + $snapRadius)
      .reduce(
        (acc, point) => {
          const diffX = point.x - x;
          const diffY = point.y - y;

          // good old pythagoras
          const diff = Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));
          return acc == null || diff <= acc.diff ? { ...point, diff } : acc;
        },
        {
          // initial (max) diff
          diff: $snapRadius
        }
      );
    return closestPoint.id ? closestPoint : null;
  };

  const handleCanvasClick = ({ x, y, path }) => {
    // last two elements from 'path' are Window and document and they don't have .match() method
    const matchablePaths = path.filter((el, i) => i < path.length - 2);
    const hasPolygonTarget = matchablePaths.some((el) => el.matches('polygon'));
    const hasPointTarget = matchablePaths.some((el) => el.matches('.point'));
    const hasToolbarTarget = matchablePaths.some((el) => el.matches('.toolbar'));

    // unset selectedPolygon if clicked outside polygon/point/toolbar
    if (!hasPolygonTarget && !hasPointTarget && !hasToolbarTarget) {
      selectedPolygon = null;
    }

    // unset drawablePolygon if clicked on toolbar/point
    if (hasToolbarTarget || hasPointTarget) {
      drawablePolygon = null;
    }

    if ($mode !== 'draw') return;

    if (!drawablePolygon) {
      selectedPolygon = null;
      drawablePolygon = {
        attributes: $globalAttributes,
        id: nanoid(6),
        points: {}
      };
    }

    const newPointId = nanoid(6);
    const closestPoint =
      $isSnapEnabled &&
      Object.entries(polygons)
        // TODO - instead of filtering out drawablePolygon, replace and do not create a new point on same polygon
        .filter(([id]) => id !== drawablePolygon.id)
        .reduce((acc, [id, { points }]) => findClosestPoint({ points, x, y }) ?? acc, {});

    const newPoint = {
      x: closestPoint?.x ?? x,
      y: closestPoint?.y ?? y,
      id: newPointId
    };

    drawablePolygon.points[newPointId] = newPoint;
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

  const handlePointMousedown = ({ e, point, polygon }) => {
    dragablePoint = polygons[polygon.id].points[point.id];
  };

  const handlePointMousemove = ({ e, point, polygon }) => {
    if (!dragablePoint || dragablePoint.id !== point.id) return;
    const { movementX, movementY } = e;
    // dragablePoint.x += movementX;
    // dragablePoint.y += movementY;
    // polygons[polygon.id].points[point.id] = dragablePoint;

    polygons[polygon.id].points[point.id].x += movementX;
    polygons[polygon.id].points[point.id].y += movementY;
  };

  const handlePointMouseup = ({ e, point, polygon }) => {
    if (!dragablePoint) return;
    dragablePoint = null;

    if (!$isSnapEnabled) return;

    const closestPoint = Object.entries(polygons)
      .filter(([id]) => id !== polygon.id)
      .reduce((acc, [id, { points }]) => findClosestPoint({ points, x: point.x, y: point.y }), {});

    if (closestPoint) {
      // dont just polygons[polygon.id].points[point.id] = closestPoint as we need to keep the id
      polygons[polygon.id].points[point.id].x = closestPoint.x;
      polygons[polygon.id].points[point.id].y = closestPoint.y;
    }
  };

  const handlePointMouseleave = ({ e, point, polygon }) => {
    if (dragablePoint?.id !== point.id) return;
    dragablePoint = null;
  };

  const handlePolygonClick = ({ e, id }) => {};

  const handlePolygonMousedown = ({ e, id }) => {
    dragablePolygon = polygons[id];
    selectedPolygon = polygons[id];
  };

  const handlePolygonMouseup = ({ e, id }) => {
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

  const handleAddAttribute = ({ detail }) => {
    polygons[selectedPolygon.id].attributes[detail.name] = detail.value;
    selectedPolygon = polygons[selectedPolygon.id];
  };

  const handleAttributeValueInput = ({ detail }) => {
    selectedPolygon.attributes[detail.name] = detail.value;
    polygons = Object.entries(polygons).reduce((acc, [id, polygon]) => {
      return {
        ...acc,
        [id]: {
          ...polygon,
          attributes: {
            ...polygon.attributes,
            ...(id === selectedPolygon.id && { [detail.name]: detail.value })
          }
        }
      };
    }, {});
  };

  $: renderPolygons = Object.entries(polygons).reduce((acc, [id, { points, attributes }]) => {
    const pointsArray = Object.values(points);
    window.polygons = polygons;
    return [
      ...acc,
      {
        id,
        attributes,
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
  style={`--snapRadius:${$snapRadius}px`}
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
            id={polygon.id}
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
      {#each renderPolygons as polygon, polygonIndex}
        {#if polygon.id === selectedPolygon?.id || polygon.id === drawablePolygon?.id}
          {#each polygon.pointsArray as point, pointIndex}
            <div
              style={`left:${point.x}px;top:${point.y}px;`}
              class="point"
              id={point.id}
              on:mousedown={(e) => handlePointMousedown({ e, point, polygon })}
              on:mousemove={(e) => handlePointMousemove({ e, point, polygon })}
              on:mouseup={(e) => handlePointMouseup({ e, point, polygon })}
              on:mouseleave={(e) => handlePointMouseleave({ e, point, polygon })}
            />
          {/each}
        {/if}
      {/each}
    </div>
  {:else if !src}
    <Dropzone multiple={false} on:drop={handleFilesSelect} />
  {:else}
    nope
  {/if}
  <ToolBar
    {selectedPolygon}
    {polygons}
    on:add-attribute={handleAddAttribute}
    on:attribute-value-input={handleAttributeValueInput}
  />
</div>
