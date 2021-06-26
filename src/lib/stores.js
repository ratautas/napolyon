import { writable, derived } from 'svelte/store';

export const modeState = (() => {
    const state = writable('add');
    const { subscribe, set, update } = state;

    return {
        subscribe,
        set: (targetMode) => set(targetMode),
        reset: () => set(null),
        toggle: (targetMode) => update($mode => $mode = targetMode === $mode ? null : targetMode),
        testDerived: derived(
            state,
            $state => {
                console.log(state, $state)
                return `Hello ${$state}!`
            }
        ),
    };
})();

export const svgState = (() => {
    const state = writable(null);
    const { subscribe, set } = state;

    return {
        subscribe,
        set: (svgEl) => set(svgEl),
    };
})();