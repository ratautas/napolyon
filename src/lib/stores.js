import { writable } from 'svelte/store';

export const mode = writable(null);

export const renderSvg = writable(null);

export const attributes = writable([{
  name: 'stroke-width',
  value: '11'
}, {
  name: 'fill',
  value: 'red'
}, {
  name: 'stroke',
  value: 'green'
},
]);

export const addAttribute = ({ name, value }) => attributes.update(($attrs) => [...$attrs, { name, value }]);

export const polygons = writable({});