import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({ 
    plugins: [tailwindcss(), sveltekit()],
    ssr: {
        noExternal: ['svelte-fa', '@fortawesome/free-solid-svg-icons', '@fortawesome/pro-solid-svg-icons']
    }
});
