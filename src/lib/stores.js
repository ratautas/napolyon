import { nanoid } from 'nanoid';
import { writable, derived, get } from 'svelte/store';
import { create, formatters, clone, patch, reverse } from 'jsondiffpatch';

import { findClosestSnapPoint } from '$lib/utils/findClosestSnapPoint';
import { findClosestLinePoint } from '$lib/utils/findClosestLinePoint';

const MOCK_INITIAL_POLYGONS = [
  {
    id: 'L8EIvC',
    points: [
      {
        x: 615,
        y: 45,
        id: 'LsJQaN'
      },
      {
        x: 865,
        y: 65,
        id: 'QyO1oa'
      },
      {
        x: 865,
        y: 245,
        id: 'jRfjxP'
      },
      {
        x: 560,
        y: 107,
        id: 'i0spdb'
      }
    ],
    attributes: {}
  },
  {
    id: 'DaNhAj',
    points: [
      {
        x: 678,
        y: 247,
        id: 'YKdSHB'
      },
      {
        x: 870,
        y: 295,
        id: 'IHLh3o'
      },
      {
        x: 858,
        y: 497,
        id: 'ABqVA8'
      },
      {
        x: 681,
        y: 475,
        id: 'WH2UKA'
      }
    ],
    attributes: {}
  }
];

const format = (delta) => formatters.jsonpatch.format(delta);

export const patcher = create({
  // used to match objects when diffing arrays, by default only === operator is used
  objectHash: function (obj, index) {
    // this function is used only to when objects are not equal by ref
    return obj.x || '$$index:' + index || obj.id;
  },
  arrays: {
    // default true, detect items moved inside the array (otherwise they will be registered as remove+add)
    detectMove: true,
    // detectMove: false,
    // default false, the value of items moved is not included in deltas
    includeValueOnMove: true
  },
  textDiff: {
    // default 60, minimum string length (left and right sides) to use text diff algorythm: google-diff-match-patch
    minLength: Infinity
  },
  propertyFilter: function (name, context) {
    /*
     this optional function can be specified to ignore object properties (eg. volatile data)
      name: property name, present in either context.left or context.right objects
      context: the diff context (has context.left and context.right objects)
    */
    return name.slice(0, 1) !== '$';
  },
  cloneDiffValues: true /* default false. if true, values in the obtained delta will be cloned
    (using jsondiffpatch.clone by default), to ensure delta keeps no references to left or right objects. this becomes useful if you're diffing and patching the same objects multiple times without serializing deltas.
    instead of true, a function can be specified here to provide a custom clone(value)
    */
});

export const mode = writable(null);
export const isDrawing = writable(false);
export const snapRadius = writable(20);

export const isToolbarDragging = writable(false);
export const toolbarX = writable(30);
export const toolbarY = writable(30);

export const svgEl = writable(null);

export const fileUploader = writable(null);

export const imageEl = writable(null);
export const imageSrc = writable(null);
export const imageWidth = writable(null);
export const imageHeight = writable(null);

export const mouseX = writable(null);
export const mouseY = writable(null);

imageSrc.set('https://images.unsplash.com/photo-1607629823685-ae0850607241?auto=format&fit=crop&w=1900&height=1600&q=80');
imageWidth.set(1900);
imageHeight.set(1600);

export const globalAttributesStore = writable({});

export const historyStore = writable({
  undoQueue: [],
  redoQueue: [],
});

export const isShiftPressed = writable(null);
export const isCmdPressed = writable(null);
export const isAltPressed = writable(null);

export const addLocalAttribute = ({ name, value }) =>
  globalAttributesStore.update(($globalAttributesStore) => ({ ...$globalAttributesStore, [name]: value }))

// global attributes
export const globalAttributes = {
  subscribe: globalAttributesStore.subscribe,
  add: ({ name, value }) => globalAttributesStore.update($globalAttributes => {
    $globalAttributes[name] = value;
    return $globalAttributes;
  }),
};

export const globalAttributesMap = derived([globalAttributes],
  ([$globalAttributes]) => Object.entries($globalAttributes)
    .reduce((acc, [name, value]) => [...acc, { [name]: value }], []));

export const polygonsStore = writable(MOCK_INITIAL_POLYGONS);

export const polygons = {
  subscribe: polygonsStore.subscribe,
  addPolygon: () => polygonsStore.update($polygons => {
    const polygons = clone($polygons);
    const newPolygonId = nanoid(6);

    drawedPolygonIndex.set(polygons.length);

    return [...polygons, {
      id: newPolygonId,
      attributes: get(globalAttributes),
      points: [],
    }
    ];
  }),
  addPoint: ({ x, y, polygonIndex, pointIndex }) => polygonsStore.update($polygons => {
    const polygons = clone($polygons);
    const newPointId = nanoid(6);
    const polygonPoints = polygons[polygonIndex].points;

    polygons[polygonIndex].points = [
      ...polygonPoints.slice(0, pointIndex),
      { x, y, id: newPointId },
      ...polygonPoints.slice(pointIndex),
    ];

    const delta = patcher.diff($polygons, polygons);
    if (delta) history.push({ delta, origin: 'addPoint' });

    return polygons;
  }),
  deletePolygon: (polygonIndex) => polygonsStore.update($polygons => {
    const polygons = $polygons.filter((polygon, index) => index !== polygonIndex);

    const delta = patcher.diff($polygons, polygons);
    if (delta) history.push({ delta, origin: 'deletePolygon' });

    return polygons;
  }),
  addLocalAttribute: (attribute) => polygonsStore.update($polygons => {
    $polygons[get(selectedPolygonIndex)].attributes[attribute.name] = attribute.value;
    return $polygons;
  }),
  deleteLocalAttribute: (attribute) => polygonsStore.update($polygons => {
    const polygons = clone($polygons);
    const polygonIndex = get(selectedPolygonIndex);

    polygons[polygonIndex].attributes = Object.entries(polygons[polygonIndex].attributes).reduce((acc, [name, value]) => {
      return {
        ...acc,
        ...(attribute.name !== name ? { [name]: value } : {}),
      }
    }, {});

    return polygons;
  }),
  addGlobalAttribute: (attribute) => polygonsStore.update($polygons => {
    const polygons = $polygons.map((polygon) => {
      return {
        ...polygon,
        attributes: {
          ...polygon.attributes,
          ...(!polygon.attributes[attribute.name] ? {
            [attribute.name]: attribute.value
          } : {})
        }
      }
    });

    globalAttributes.add(attribute);

    return polygons;
  }),
  setDraggedPolygonPosition: () => polygonsStore.update($polygons => {
    const polygons = clone($polygons);
    polygons[get(draggedPolygonIndex)] = clone(get(draggedPolygon));

    const delta = patcher.diff($polygons, polygons);
    if (delta) history.push({ delta, origin: 'setDraggedPolygonPosition' });

    return polygons;
  }),
  setDraggedPointPosition: () => polygonsStore.update($polygons => {
    const polygons = clone($polygons);
    const polygonIndex = get(draggedPointPolygonIndex);
    const pointIndex = polygons[polygonIndex].points.findIndex(({ id }) => id === get(draggedPointId));

    polygons[polygonIndex].points[pointIndex] = clone(get(draggedPoint));

    const delta = patcher.diff($polygons, polygons);
    if (delta) history.push({ delta, origin: 'setDraggedPointPosition' });

    return polygons;
  }),
  set: (val) => polygonsStore.set(val)
};

// POLYGONS:
export const hoveredPolygonIndex = writable(-1);
export const hoveredPolygon = derived([polygonsStore, hoveredPolygonIndex], ([$store, $i]) => $store[$i]);
export const hoveredPolygonId = derived([hoveredPolygon], ([$polygon]) => $polygon?.id);

export const selectedPolygonIndex = writable(-1);
export const selectedPolygon = derived([polygonsStore, selectedPolygonIndex], ([$store, $i]) => $store[$i]);
export const selectedPolygonId = derived([selectedPolygon], ([$polygon]) => $polygon?.id);

export const drawedPolygonIndex = writable(-1);
export const drawedPolygon = derived([polygonsStore, drawedPolygonIndex], ([$store, $i]) => $store[$i]);
export const drawedPolygonId = derived([drawedPolygon], ([$polygon]) => $polygon?.id);

export const draggedPolygon = writable(null);
export const draggedPolygonId = derived([draggedPolygon], ([$polygon]) => $polygon?.id);
export const draggedPolygonIndex = derived([polygonsStore, draggedPolygonId], ([$store, $id]) => $store.findIndex(({ id }) => $id === id));

// POINTS:
export const hoveredPointIndex = writable(-1);
export const hoveredPoint = derived([polygonsStore, hoveredPointIndex], ([$store, $i]) => $store[$i]);
export const hoveredPointId = derived([hoveredPoint], ([$polygon]) => $polygon?.id);

export const selectedPointIndex = writable(-1);
export const selectedPoint = derived([polygonsStore, selectedPointIndex], ([$store, $i]) => $store[$i]);
export const selectedPointId = derived([selectedPoint], ([$polygon]) => $polygon?.id);

export const draggedPoint = writable(null);
export const draggedPointId = derived([draggedPoint], ([$point]) => $point?.id);
export const draggedPointPolygon = derived(
  [polygonsStore, draggedPoint],
  ([$store, $point]) => $store.find((polygon) => polygon.points.find((point) => point.id === $point.id))
);
export const draggedPointPolygonId = derived([draggedPointPolygon], ([$polygon]) => $polygon?.id);
export const draggedPointPolygonIndex = derived(
  [polygonsStore, draggedPointPolygonId],
  ([$store, $draggedPointPolygonId]) => $store.findIndex(({ id }) => $draggedPointPolygonId === id)
);

// LINES:
export const hoveredLineIndex = writable(-1);
export const hoveredLine = derived([polygonsStore, hoveredLineIndex], ([$store, $i]) => $store[$i]);
export const hoveredLineId = derived([hoveredLine], ([$polygon]) => $polygon?.id);

// flatten points object to renderable string
export const renderPolygons = derived(
  [polygons, draggedPolygon, draggedPoint],
  ([$polygons, $draggedPolygon, $draggedPoint]) => $polygons.map((polygon) => {
    // get points from dragged polygon or fall back to original polygon
    const { points } = ($draggedPolygon?.id && polygon.id === $draggedPolygon.id) ? $draggedPolygon : polygon;

    // get X and Y from dragged point or fall back to original values
    const renderPoints = points.map((point) => {
      const { x, y } = ($draggedPoint?.id && point.id === $draggedPoint.id) ? $draggedPoint : point;
      return { ...point, x, y };
    });

    return {
      ...polygon,
      points: renderPoints,
      pointsReduced: renderPoints
        .reduce((pointsString, point) => `${pointsString} ${point.x},${point.y}`, '')
        .replace(' ', ''),
      lines: renderPoints.map((point, index, arr) => {
        const nextIndex = index === arr.length - 1 ? 0 : index + 1;

        return {
          x1: arr[index].x,
          x2: arr[nextIndex].x,
          y1: arr[index].y,
          y2: arr[nextIndex].y
        };
      })
    };
  })
);

export const closestSnapPoint = derived(
  [polygons, selectedPolygonIndex, draggedPoint, isDrawing, isCmdPressed, snapRadius, mouseX, mouseY, imageWidth, imageHeight],
  ([$polygons, $selectedPolygonIndex, $draggedPoint, $isDrawing, $isCmdPressed, $snapRadius, $mouseX, $mouseY, $imageWidth, $imageHeight]) => {
    if (!$isCmdPressed) return null;
    if (!$isDrawing && !$draggedPoint) return null;

    let point = $polygons
      .filter((polygon, index) => index !== $selectedPolygonIndex)
      .reduce((acc, { points }) => findClosestSnapPoint({ points, x: $mouseX, y: $mouseY, radius: $snapRadius }) ?? acc, null);

    if (!point?.id) {
      if ($snapRadius > $mouseX) {
        point = { x: 0, y: $mouseY, id: 'snap-left' };
      }
      if ($snapRadius > $mouseY) {
        point = { x: $mouseX, y: 0, id: 'snap-top' };
      }
      if ($imageWidth - $snapRadius < $mouseX) {
        point = { x: $imageWidth, y: $mouseY, id: 'snap-right' };
      }
      if ($imageHeight - $snapRadius < $mouseY) {
        point = { x: $mouseX, y: $imageHeight, id: 'snap-bottom' };
      }
    }

    return point;
  }
);

export const history = {
  subscribe: historyStore.subscribe,
  set: historyStore.set,
  push: (entry) => historyStore.update($history => {
    return {
      undoQueue: [entry, ...$history.undoQueue],
      redoQueue: []
    }
  }),
  shiftHistoryBackward: (entry) => historyStore.update($history => {
    $history.redoQueue = [entry, ...$history.redoQueue]
    $history.undoQueue.splice(0, 1);
    return $history;
  }),
  shiftHistoryForward: (entry) => historyStore.update($history => {
    $history.undoQueue = [entry, ...$history.undoQueue]
    $history.redoQueue.splice(0, 1);
    return $history;
  }),
  clear: () => historyStore.set({
    undoQueue: [],
    redoQueue: [],
  }),
  undo: () => polygonsStore.update($polygons => {
    const { undoQueue } = get(historyStore);
    const [entry] = undoQueue;
    if (undoQueue.length === 0) return $polygons;

    history.shiftHistoryBackward(entry);

    return patch($polygons, reverse(entry.delta))
  }),
  redo: () => polygonsStore.update($polygons => {
    const { redoQueue } = get(historyStore);
    const [entry] = redoQueue;
    if (redoQueue.length === 0) return $polygons;

    history.shiftHistoryForward(entry);

    return patch($polygons, entry.delta);
  }),
};