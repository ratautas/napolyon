import { writable, derived } from 'svelte/store';
import * as Y from 'yjs'
// import { WebrtcProvider } from 'y-webrtc'
import { IndexeddbPersistence } from 'y-indexeddb'
import { polygons } from './stores';

const CLIENT_KEY = 'napolyon';

export const yDoc = new Y.Doc();

// this allows you to instantly get the (cached) documents data
// const indexeddbProvider = new IndexeddbPersistence(CLIENT_KEY, ydoc)
// indexeddbProvider.whenSynced.then(() => {
//     console.log('loaded data from indexed db')
// })

// export const yPolygonsMap = yDoc.getMap('polygons');
// export const yPointsMap = yDoc.getMap('points');

export const yPolygons = yDoc.getArray('polygons');
export const yHistory = new Y.UndoManager(yPolygons, { captureTimeout: 0 })

export const yPolygonsStore = writable({});

// convert polygons and their points to arrays (maps)
export const yPolygonsMap = derived([yPolygonsStore],
  ([$yPolygonsStore]) => Object.values($yPolygonsStore).reduce((acc, polygon) => {
    return [...acc, {
      ...polygon,
      pointsMap: Object.values(polygon.points),
    }]
  }, []));

// flaten points object to renderable sring
export const yRenderPolygons = derived([yPolygonsMap],
  ([$yPolygonsMap]) => $yPolygonsMap.map((polygon) => {
    return {
      ...polygon,
      points: polygon.pointsMap.reduce((acc, { x, y }) => `${acc} ${x},${y}`, '').replace(' ', ''),
    }
  }));

yPolygons.observeDeep((e) => {
  yPolygonsStore.set(yPolygons.toJSON());
});



