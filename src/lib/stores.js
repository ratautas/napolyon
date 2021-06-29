import { writable, derived } from 'svelte/store';

export const mode = writable(null);

export const renderSvg = writable(null);

export const globalAttributes = writable({
  'stroke-width': '11',
  'stroke': 'green',
  'fill': 'red'
});

export const globalAttributesArray = derived(globalAttributes, $globalAttributes =>
  Object
    .entries($globalAttributes)
    .reduce((acc, [name, value]) => [...acc, { [name]: value }], []))

export const addAttribute = ({ name, value }) =>
  globalAttributes.update(($globalAttributes) => ({ ...$globalAttributes, [name]: value }))

export const polygons = writable({});