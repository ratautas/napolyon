import { writable, derived, get } from 'svelte/store';

export const isInfoModalEnabled = writable(false);
export const showInfoModal = writable(false);