import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const emulatorStub = fileURLToPath(new URL('./build/xrEmulatorStub.js', import.meta.url));

/**
 * Keeps the WebXR device emulator out of production bundles.
 *
 * `@pmndrs/xr` reaches its emulator through a relative `./emulate.js` import, so
 * a plain alias entry cannot match it; the id has to be resolved first and then
 * redirected. Development builds are untouched, so localhost emulation still
 * works.
 */
function stripXrEmulator(): Plugin {
  return {
    name: 'loci:strip-xr-emulator',
    apply: 'build',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!source.endsWith('emulate.js')) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (resolved === null) return null;
      const id = resolved.id.replaceAll('\\', '/');
      return id.includes('@pmndrs/xr') && id.endsWith('emulate.js') ? emulatorStub : null;
    },
  };
}

// https://vite.dev/config/
// The output in `dist/` must stay a portable static bundle: no server entry point,
// no runtime environment variables and no requests to a private backend.
export default defineConfig({
  plugins: [react(), stripXrEmulator()],
  build: {
    target: 'es2022',
    // Quest Browser downloads the whole bundle before the user can enter VR,
    // so keep the immersive code in its own chunk and warn early if it grows.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split the renderer away from the app so a change to a room or a cue
        // does not invalidate the cached 3D stack. Vite 8 takes the function
        // form only; the object form is no longer accepted.
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/@react-three') || id.includes('node_modules/@pmndrs')) {
            return 'xr';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    // WebXR requires a secure context. localhost counts as secure, but testing from
    // the headset over the LAN does not, so use `npm run preview` behind HTTPS or a
    // tunnel for real-device checks. See docs/QUEST-TEST.md.
    host: true,
  },
});
