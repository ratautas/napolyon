import { get, writable, derived } from 'svelte/store';

export const mode = writable(null);
export const isSnapEnabled = writable(true);
export const snapRadius = writable(10);

export const renderSvg = writable(null);

export const globalAttributes = writable({
  'stroke-width': '1',
  'stroke': 'rgba(255,255,255,.8)',
  'fill': 'rgba(0,0,0,.5)'
});

export const globalAttributesArray = derived(globalAttributes, $globalAttributes =>
  Object
    .entries($globalAttributes)
    .reduce((acc, [name, value]) => [...acc, { [name]: value }], []))

export const addAttribute = ({ name, value }) =>
  globalAttributes.update(($globalAttributes) => ({ ...$globalAttributes, [name]: value }))

export const dragablePolygon = writable(null);
export const selectedPolygon = writable(null);
export const hoveredPolygon = writable(null);
export const dragablePoint = writable(null);

export const drawablePolygon = (() => {
  const { subscribe, set, update } = writable(null);

  return {
    subscribe,
    addPoint: (newPoint) => update(($polygon) => {
      return {
        ...$polygon,
        points: {
          ...$polygon.points,
          [newPoint.id]: newPoint
        }
      }
    }),
    set: (val) => set(val)
  };
})()

const polygonsStore = writable({
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
});

export const polygons = {
  subscribe: polygonsStore.subscribe,
  addPolygon: (polygon) => polygonsStore.update($polygons => {
    return {
      ...$polygons,
      [polygon.id]: polygon,
    }
  }),
  addPoint: (polygon, point) => polygonsStore.update($polygons => {
    return {
      ...$polygons,
      [polygon.id]: {
        ...polygon,
        points: {
          ...polygon.points,
          point,
        }
      },
    }
  }),
  movePoint: (polygon, point, x, y) => polygonsStore.update($polygons => {
    return {
      ...$polygons,
      [polygon.id]: {
        ...polygon,
        points: {
          ...polygon.points,
          [point.id]: { ...point, x, y }
        }
      },
    }
  }),
  moveAllPoints: (polygon, x, y) => polygonsStore.update($polygons => {
    return {
      ...$polygons,
      [polygon.id]: {
        ...polygon,
        points: Object.values(polygon.points).reduce((acc, point) => ({
          ...acc,
          [point.id]: {
            ...point,
            x: point.x + x,
            y: point.y + y,
          }
        }), {})
      },
    }
  }),
  set: (val) => polygonsStore.set(val)
};

export const polygonsMap = derived([polygonsStore],
  ([$polygonsStore]) => Object.values($polygonsStore).reduce((acc, polygon) => {
    return [...acc, {
      ...polygon,
      // pointsMap: polygon.points ? Object.values(polygon.points) : [],
      pointsMap: Object.values(polygon.points),
      // pointsMap: [{ x: 1, y: 1, id: 1 }]
    }]
  }, []));

export const renderPolygons = derived([polygonsMap],
  ([$polygonsMap]) => $polygonsMap.map((polygon) => {
    return {
      ...polygon,
      points: polygon.pointsMap.reduce((acc, { x, y }) => `${acc} ${x},${y}`, '').replace(' ', ''),
    }
  }));