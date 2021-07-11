import adapterStatic from "@sveltejs/adapter-static";
// import replace from "rollup-plugin-replace";
// import node from '@sveltejs/adapter-node';
import { optimizeImports, optimizeCss, presetCarbon, icons } from "carbon-preprocess-svelte";
// import { presetCarbon } from "carbon-preprocess-svelte";
import sveltePreprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// preprocess: [optimizeImports()],
	preprocess: [
		sveltePreprocess(),
		...presetCarbon(),
		optimizeImports(),
		icons()
	],
	kit: {
		target: "#svelte",
		// adapter: adapter(),
		adapter: adapterStatic({
			// default options:
			pages: 'build',
			assets: 'build',
			fallback: null
		}),
		// hydrate: false,
		// adapter: node(),
		vite: () => ({
			// this is needed for 'jsondiffpatch' as it is a commonjs module and doesn't have proper exports
			define: { 'process.platform': JSON.stringify("") },
			optimizeDeps: {
				include: ["jsondiffpatch"],
				// include: ["clipboard-copy", "jsondiffpatch"],
			},
			build: {
				// commonjsOptions: {
				// 	// include: [/jsondiffpatch/]
				// },
				// or empty commonjsOptions: {}
				// rollupOptions: {
				// 	plugins: [
				// 		replace({ 'process.platform': JSON.stringify('darwin') }),]
				// }
			},
			plugins: [
				// replace({ 'process.platform': JSON.stringify('darwin') }),
				process.env.NODE_ENV === "production" && optimizeCss(),
			],
		})
	},
};

export default config;
