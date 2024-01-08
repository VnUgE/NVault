import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import webExtension from "@samrum/vite-plugin-web-extension";
import path from "path";
import postcss from './postcss.config.js'
import { getManifest } from "./src/manifest";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    preview: {
      port: 6896,
    },
    server: {
      host: '0.0.0.0',
      port: 6896,
      strictPort: true,
      proxy: {
        '/public': {
          target: 'https://www.vaughnnugent.com/public',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/public/, ''),
          headers: {
            //Don't send cookies to the remote server
            'cookies': ""
          }
        },
        '/api': {
          target: 'http://127.0.0.1:8089',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        }
      }
    },
    plugins: [
      vue(),
      webExtension({
        manifest: getManifest(Number(env.MANIFEST_VERSION)),

        additionalInputs: {
          scripts: [
            'src/entries/nostr-provider.js', // defaults to webAccessible: true
          ],
          html: [
            'src/entries/contentScript/auth-popup.html',
          ]
        },
      }),
    ],
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        plugins: [],
      },
    },
    optimizeDeps: {
      exclude: ['']
    },
    css: {
      postcss: postcss
    },
  };
});