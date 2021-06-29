import { writable, derived } from 'svelte/store';

export const mode = writable(null);

export const renderSvg = writable(null);

// export const globalAttributes = writable([{
//   name: 'stroke-width',
//   value: '11',
//   isGlobal: true
// }, {
//   name: 'fill',
//   value: 'red',
//   isGlobal: true
// }, {
//   name: 'stroke',
//   value: 'green',
//   isGlobal: true
// },
// ]);

export const globalAttributes = writable([{
  name: 'stroke-width',
  value: '11',
  isGlobal: true
}, {
  name: 'fill',
  value: 'red',
  isGlobal: true
}, {
  name: 'stroke',
  value: 'green',
  isGlobal: true
},
]);

// export const globalAttributes = derived(attributes, $attributes => $attributes.filter(({ isGlobal }) => isGlobal))

export const addAttribute = ({ name, value }) => globalAttributes.update(($attrs) => [...$attrs, { name, value }]);

export const polygons = writable({});