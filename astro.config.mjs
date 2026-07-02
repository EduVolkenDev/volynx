// @ts-check
// VOLYNX: Cloudflare Pages compatible (no adapter)
import { defineConfig } from 'astro/config';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  site: 'https://volynx.world',
  base: '/',
  output: 'static',
  vite: {
    plugins: [wasm(), topLevelAwait()]
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed'
    }
  }
});
