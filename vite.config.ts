import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		fs: {
			// Allow serving files from the public directory
			allow: ['public']
		}
	},
	// Ensure static files are copied to build output
	publicDir: 'public',
});
