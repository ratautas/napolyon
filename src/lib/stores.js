import { writable, derived } from 'svelte/store';

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

export const polygons = writable({});