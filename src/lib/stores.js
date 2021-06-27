import { writable, derived } from 'svelte/store';

export const mode = writable(null);

export const svgState = (() => {
    const state = writable(null);
    const { subscribe, set } = state;

    return {
        subscribe,
        set: (svgEl) => set(svgEl),
    };
})();