import { nanoid } from 'nanoid';
import { writable, derived, get } from 'svelte/store';
import { create, formatters, clone, patch, unpatch, reverse } from 'jsondiffpatch';

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
export const isSnapEnabled = writable(true);
export const isDrawing = writable(false);
export const snapRadius = writable(20);

export const isToolbarDragging = writable(false);
export const toolbarX = writable(30);
export const toolbarY = writable(30);

export const renderSvg = writable(null);

export const selectedPointId = writable(null);
export const dragablePointId = writable(null);

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
  // addPoint: ({ x, y }, polygonIndex, index) => polygonsStore.update($polygons => {
  addPoint: ({ x, y }, lineIndex) => polygonsStore.update($polygons => {
    const polygons = clone($polygons);
    const newPointId = nanoid(6);
    const polygonIndex = get(drawedPolygonIndex);
    const polygonPoints = polygons[polygonIndex].points;
    const sliceIndex = lineIndex ?? polygonPoints.length;

    polygons[polygonIndex].points = [
      ...polygonPoints.slice(0, sliceIndex),
      { x, y, id: newPointId },
      ...polygonPoints.slice(sliceIndex),
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
  setDraggablePolygonPosition: (localDragablePolygon) => polygonsStore.update($polygons => {
    const polygons = clone($polygons);
    polygons[get(draggedPolygonIndex)] = localDragablePolygon;

    const delta = patcher.diff($polygons, polygons);
    if (delta) history.push({ delta, origin: 'setDraggablePolygonPosition' });

    return polygons;
  }),
  setDraggablePointPosition: (localDragablePoint) => polygonsStore.update($polygons => {
    const polygons = clone($polygons);
    const polygonIndex = get(selectedPolygonIndex);
    const pointIndex = polygons[polygonIndex].points.findIndex(({ id }) => id === localDragablePoint.id);

    polygons[polygonIndex].points[pointIndex] = clone(localDragablePoint);

    const delta = patcher.diff($polygons, polygons);
    if (delta) history.push({ delta, origin: 'setDraggablePointPosition' });

    return polygons;
  }),
  set: (val) => polygonsStore.set(val)
};

export const selectedPolygonIndex = writable(-1);
export const selectedPolygon = derived([polygonsStore, selectedPolygonIndex], ([$store, $i]) => $store[$i]);
export const selectedPolygonId = derived([selectedPolygon], ([$polygon]) => $polygon?.id);

export const hoveredPolygonIndex = writable(-1);
export const hoveredPolygon = derived([polygonsStore, hoveredPolygonIndex], ([$store, $i]) => $store[$i]);
export const hoveredPolygonId = derived([hoveredPolygon], ([$polygon]) => $polygon?.id);

export const drawedPolygonIndex = writable(-1);
export const drawedPolygon = derived([polygonsStore, drawedPolygonIndex], ([$store, $i]) => $store[$i]);
export const drawedPolygonId = derived([drawedPolygon], ([$polygon]) => $polygon?.id);

export const draggedPolygonIndex = writable(-1);
export const draggedPolygon = derived([polygonsStore, draggedPolygonIndex], ([$store, $i]) => $store[$i]);
export const draggedPolygonId = derived([draggedPolygon], ([$polygon]) => $polygon?.id);

export const selectedPoint = derived(
  [polygonsStore, selectedPointId],
  ([$polygonsStore, $selectedPointId]) => $polygonsStore.find(({ id }) => id === $selectedPointId)
);

export const selectedPointIndex = derived(
  [polygonsStore, selectedPointId],
  ([$polygonsStore, $selectedPointId]) => $polygonsStore.findIndex(({ id }) => id === $selectedPointId)
);

export const dragablePoint = derived(
  [selectedPolygon, dragablePointId],
  ([$selectedPolygon, $dragablePointId]) => $selectedPolygon && $selectedPolygon.points[$dragablePointId]
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

// convert polygons and their points to arrays (maps)
export const polygonsMap = derived([polygonsStore],
  ([$polygonsStore]) => Object.values($polygonsStore).reduce((acc, polygon) => {
    return [...acc, {
      ...polygon,
      pointsMap: Object.values(polygon.points),
    }]
  }, []));

// flatten points object to renderable string
export const renderPolygons = derived([polygonsMap],
  ([$polygonsMap]) => $polygonsMap.map((polygon) => {
    return {
      ...polygon,
      points: polygon.pointsMap.reduce((acc, { x, y }) => `${acc} ${x},${y}`, '').replace(' ', ''),
    }
  }));