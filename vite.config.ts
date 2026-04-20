// vite.config.ts v0.2.0 — Import defineConfig from 'vitest/config' so the `test`
// field is typed correctly (Vite 7 + Vitest 4 requires this).

import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__BUILD_TIME__: JSON.stringify(new Date().toISOString())
	},
	test: {
		include: ['tests/**/*.test.ts']
	}
});
