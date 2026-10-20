// @ts-check
// VOLYNX: Cloudflare Pages compatible (no adapter)
import { defineConfig } from 'astro/config';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  site: 'https://volynx.world',
  base: '/',
  output: 'static',
  vite: {
    // Vite 8's default browser targets support native top-level await.
    // The former transform plugin depends on Rollup internals removed by Vite 8.
    plugins: [wasm()]
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed'
    }
  }
});
