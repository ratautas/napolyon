import adapter from "@sveltejs/adapter-static";
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
		adapter: adapter({
			// default options are shown
			pages: 'build',
			assets: 'build',
			fallback: null
		}),
		prerender: {
			crawl: true,
			enabled: true,
			force: false,
			pages: ['*']
		},
		router: true,
		ssr: false,
		vite: {
			optimizeDeps: { include: ["clipboard-copy"] },
			plugins: [process.env.NODE_ENV === "production" && optimizeCss()],
		},
	},
};

export default config;
