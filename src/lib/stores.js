import { nanoid } from 'nanoid';
import { writable, derived, get } from 'svelte/store';
import { create, formatters, clone } from 'jsondiffpatch';

const format = (delta) => formatters.jsonpatch.format(delta);

export const findClosestPoint = ({ points, x, y }) => {
  const radius = get(snapRadius);
  const closestPoint = Object.values(points)
    .filter((point) => point.x > x - radius && point.x < x + radius)
    .filter((point) => point.y > y - radius && point.y < y + radius)
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
        diff: radius
      }
    );
  return closestPoint.id ? closestPoint : null;
};

export const patcher = create({
  // used to match objects when diffing arrays, by default only === operator is used
  objectHash: function (obj) {
    // this function is used only to when objects are not equal by ref
    return obj._id || obj.id;
  },
  arrays: {
    // default true, detect items moved inside the array (otherwise they will be registered as remove+add)
    detectMove: true,
    // default false, the value of items moved is not included in deltas
    includeValueOnMove: false
  },
  textDiff: {
    // default 60, minimum string length (left and right sides) to use text diff algorythm: google-diff-match-patch
    minLength: 60
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
})

const MOCK_INITIAL_POLYGONS = {
  L8EIvC: {
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
    },
    attributes: {}
  },
  DaNhAj: {
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
    },
    attributes: {}
  }
};

export const mode = writable(null);
export const isSnapEnabled = writable(true);
export const isDrawing = writable(false);
export const snapRadius = writable(20);

export const isToolbarDragging = writable(false);
export const toolbarX = writable(30);
export const toolbarY = writable(30);

export const renderSvg = writable(null);

export const hoveredPolygonId = writable(null);
export const dragablePolygonId = writable(null);
export const selectedPolygonId = writable(null);
export const drawablePolygonId = writable(null);

export const dragablePointId = writable(null);
export const closestSnapablePointId = writable(null);

export const globalAttributesStore = writable({});

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
    .reduce((acc, [name, value]) => [...acc, { [name]: value }], []))

export const polygonsStore = writable(MOCK_INITIAL_POLYGONS);
// export const polygonsStore = writable({});

export const selectedPolygon = derived(
  [polygonsStore, selectedPolygonId],
  ([$polygonsStore, $selectedPolygonId]) => $polygonsStore[$selectedPolygonId]
);

export const dragablePoint = derived(
  [selectedPolygon, dragablePointId],
  ([$selectedPolygon, $dragablePointId]) => $selectedPolygon && $selectedPolygon.points[$dragablePointId]
);

export const hoveredPolygon = derived(
  [polygonsStore, hoveredPolygonId],
  ([$polygonsStore, $hoveredPolygonId]) => $polygonsStore[$hoveredPolygonId]
);

export const dragablePolygon = derived(
  [polygonsStore, dragablePolygonId],
  ([$polygonsStore, $dragablePolygonId]) => $polygonsStore[$dragablePolygonId]
);

export const polygons = {
  subscribe: polygonsStore.subscribe,
  addDrawablePolygon: () => polygonsStore.update($polygons => {
    const polygons = clone($polygons);
    const newPolygonId = nanoid(6);

    selectedPolygonId.set(null); // why?.. can it be removed?
    polygons[newPolygonId] = {
      id: newPolygonId,
      attributes: get(globalAttributes),
      points: {},
    };
    drawablePolygonId.set(newPolygonId);

    const delta = patcher.diff($polygons, polygons);
    console.log(format(delta));

    return polygons;
  }),
  addDrawablePoint: ({ x, y }) => polygonsStore.update($polygons => {
    const polygons = clone($polygons);
    const newPointId = nanoid(6);
    const polygonId = get(drawablePolygonId);
    const closestPoint = get(isSnapEnabled) && get(polygonsMap)
      .filter(({ id }) => id !== polygonId)
      .reduce((acc, { points }) => findClosestPoint({ points, x, y }) ?? acc, null);

    polygons[polygonId].points[newPointId] = {
      x: closestPoint?.x ?? x,
      y: closestPoint?.y ?? y,
      id: newPointId
    };

    selectedPolygonId.set(polygonId); // why?.. can it be removed?

    const delta = patcher.diff($polygons, polygons);
    console.log(format(delta));
    
    return polygons;
  }),
  deletePolygon: (polygonId) => polygonsStore.update($polygons => {
    const polygons = Object.values($polygons)
      .reduce((acc, polygon) => {
        return {
          ...acc,
          ...(polygon.id !== polygonId ? { [polygonId]: polygon } : {}),
        }
      }, {});
    return polygons;
  }),
  addLocalAttribute: (polygonId, attribute) => polygonsStore.update($polygons => {
    $polygons[polygonId].attributes[attribute.name] = attribute.value;
    return $polygons;
  }),
  deleteLocalAttribute: (polygonId, attribute) => polygonsStore.update($polygons => {
    $polygons[polygonId].attributes = Object.entries($polygons[polygonId].attributes)
      .reduce((acc, [name, value]) => {
        return {
          ...acc,
          ...(attribute.name !== name ? { [name]: value } : {}),
        }
      }, {});
    return $polygons;
  }),
  addGlobalAttribute: (attribute) => polygonsStore.update($polygons => {
    $polygons = Object.values($polygons).reduce((acc, polygon) => {
      return {
        ...acc,
        [polygon.id]: {
          ...polygon,
          attributes: {
            ...polygon.attributes,
            ...(!polygon.attributes[attribute.name] && {
              [attribute.name]: attribute.value
            })
          }
        }
      }
    }, {});
    return $polygons;
  }),
  movePoint: (polygon, pointId, x, y) => polygonsStore.update($polygons => {
    $polygons[polygon.id].points[pointId].x = x;
    $polygons[polygon.id].points[pointId].y = y;
    return $polygons;
  }),
  moveAllPoints: (polygon, x, y) => polygonsStore.update($polygons => {
    $polygons[polygon.id].points = Object.values(polygon.points).reduce((acc, point) => ({
      ...acc,
      [point.id]: {
        ...point,
        x: point.x + x,
        y: point.y + y,
      }
    }), {});
    return $polygons;
  }),
  set: (val) => polygonsStore.set(val)
};

// convert polygons and their points to arrays (maps)
export const polygonsMap = derived([polygonsStore],
  ([$polygonsStore]) => Object.values($polygonsStore).reduce((acc, polygon) => {
    return [...acc, {
      ...polygon,
      pointsMap: Object.values(polygon.points),
    }]
  }, []));

// flaten points object to renderable sring
export const renderPolygons = derived([polygonsMap],
  ([$polygonsMap]) => $polygonsMap.map((polygon) => {
    return {
      ...polygon,
      points: polygon.pointsMap.reduce((acc, { x, y }) => `${acc} ${x},${y}`, '').replace(' ', ''),
    }
  }));

// export const drawablePolygon = (() => {
//   const { subscribe, set, update } = writable(null);

//   return {
//     subscribe,
//     addDrawablePoint: (newPoint) => update(($drawablePolygon) => {
//       return {
//         ...$drawablePolygon,
//         points: {
//           ...$drawablePolygon.points,
//           [newPoint.id]: newPoint
//         }
//       }
//     }),
//     set: (val) => set(val)
//   };
// })();