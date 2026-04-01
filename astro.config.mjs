// @ts-check
// VOLYNX: Cloudflare Pages compatible (no adapter)
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://volynx.world',
  base: '/',
  output: 'static',
  vite: {},
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed'
    }
  }
});

