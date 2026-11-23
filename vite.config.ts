import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

function singleFileIifePlugin(): Plugin {
  return {
    name: 'single-file-iife-html5',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlKey = Object.keys(bundle).find((k) => k.endsWith('.html'));
      if (!htmlKey) return;
      const htmlAsset = bundle[htmlKey];
      if (htmlAsset.type !== 'asset') return;

      let html = String(htmlAsset.source);
      const cssContents: string[] = [];
      const jsContents: string[] = [];

      for (const [key, item] of Object.entries(bundle)) {
        if (item.type === 'asset' && key.endsWith('.css')) {
          cssContents.push(String(item.source));
          delete bundle[key];
        } else if (item.type === 'chunk' && key.endsWith('.js')) {
          jsContents.push(item.code);
          delete bundle[key];
        }
      }

      // Strip external module/stylesheet/preload tags so the output is 100% self-contained
      html = html
        .replace(/<script\b[^>]*type=["']module["'][^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<link\b[^>]*rel=["'](?:stylesheet|modulepreload)["'][^>]*>/gi, '');

      const inlinedCss = cssContents.join('\n');
      const inlinedJs = jsContents.join('\n');

      if (inlinedCss) {
        html = html.replace('</head>', () => `<style>${inlinedCss}</style>\n</head>`);
      }
      if (inlinedJs) {
        // Place synchronous IIFE script before </body> so #root exists in DOM
        html = html.replace('</body>', () => `<script>${inlinedJs}</script>\n</body>`);
      }

      htmlAsset.source = html;

      // Also write a root standalone file for itch.io / direct file:// distribution
      const rootOut = path.resolve(import.meta.dirname, 'obsidian-arcanum.html');
      fs.writeFileSync(rootOut, html, 'utf8');
    },
  };
}

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';
  return {
    base: isBuild ? './' : '/',
    plugins: [react(), tailwindcss(), singleFileIifePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: isBuild
      ? {
          cssCodeSplit: false,
          assetsInlineLimit: 100_000_000,
          modulePreload: { polyfill: false },
          rollupOptions: {
            output: {
              format: 'iife',
              inlineDynamicImports: true,
              name: 'ObsidianArcanum',
              entryFileNames: 'bundle.js',
              chunkFileNames: 'bundle.js',
              assetFileNames: 'bundle.[ext]',
            },
          },
        }
      : undefined,
    optimizeDeps: {
      entries: ['index.html', 'src/main.tsx'],
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
