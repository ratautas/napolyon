import adapterStatic from "@sveltejs/adapter-static";
// import node from '@sveltejs/adapter-node';
import { optimizeImports, optimizeCss, presetCarbon, icons } from "carbon-preprocess-svelte";
// import { presetCarbon } from "carbon-preprocess-svelte";
import sveltePreprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// preprocess: [optimizeImports()],
	preprocess: [sveltePreprocess(), ...presetCarbon(), optimizeImports(), icons(),],
	kit: {
		target: "#svelte",
		// adapter: adapter(),
		adapter: adapterStatic({
			// default options are shown
			pages: 'build',
			assets: 'build',
			fallback: null
		}),
		hydrate: false,
		// adapter: node(),
		vite: {
			// this is needed for 'jsondiffpatch' as it doesn't have proper exports
			define: { 'process.env': JSON.stringify(process.env) },
			optimizeDeps: {
				include: ["clipboard-copy", "jsondiffpatch"],
			},
			plugins: [process.env.NODE_ENV === "production" && optimizeCss()],
		},
	},
};

export default config;
