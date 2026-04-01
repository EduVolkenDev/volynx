// @ts-check
// https://astro.build/config
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify/functions';

export default defineConfig({
  site: 'https://volynx.world',
  base: '/',
  output: 'static',  // Default: Static site (matches _headers/_redirects)
  adapter: netlify(),
  vite: {
    // Image optimization via Sharp (install @astrojs/image if needed)
  },
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed'
    }
  },
  experimental: {
    // viewTransitions: true  // Enable post Astro 4.x upgrade if needed
  }
});

