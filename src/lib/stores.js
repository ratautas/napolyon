import { writable, derived } from 'svelte/store';

export const name = writable('world');

export const greeting = derived(
    name,
    $name => `Hello ${$name}!`
);

export const mode = (() => {
    const state = writable(null);
    const { subscribe, set, update } = state;
    const a = writable('sss');
    console.log({a})

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
})()