/**
 * The XR store.
 *
 * Created once at module scope: the store owns the session lifecycle, and
 * recreating it on a React re-render would drop listeners and leave a live
 * session orphaned.
 *
 * Feature choices for M0:
 *  - `teleportPointer` is off by default in the library, and teleporting is a
 *    baseline comfort requirement, so it is enabled explicitly.
 *  - Hand tracking is requested as optional. Controllers are the supported
 *    input for M0; a user who puts their controllers down still gets rays
 *    rather than a dead session.
 *  - Anchors, planes, meshes and depth sensing are not requested. They are AR
 *    features this milestone does not use, and every optional feature is one
 *    more reason a runtime can refuse the session.
 *  - `frameRate: 'high'` asks the runtime for the best cadence it offers. The
 *    delivered cadence is a device measurement and is still unverified — see
 *    docs/QUEST-TEST.md.
 */

import { createXRStore } from '@react-three/xr';

/**
 * The library injects the IWER device emulator on `localhost` when no real
 * WebXR runtime is present. That is useful development evidence and is kept on,
 * but the UI labels it, because an emulated session proves wiring and proves
 * nothing about comfort, optical readability or frame pacing. It never activates
 * on a deployed origin, so nothing fake can ship.
 */
export const xrStore = createXRStore({
  controller: {
    teleportPointer: true,
    rayPointer: { cursorModel: true },
  },
  hand: {
    teleportPointer: true,
  },
  anchors: false,
  planeDetection: false,
  meshDetection: false,
  depthSensing: false,
  handTracking: true,
  frameRate: 'high',
  // Controller models are served from this origin, not from the library's
  // default jsdelivr CDN: a headset must not depend on a third-party host to
  // draw the thing in the user's hands. `build/copyControllerAssets.mjs` puts
  // them there, and the Quest 3 profile also acts as the fallback so an
  // unrecognised controller still resolves locally.
  baseAssetPath: `${import.meta.env.BASE_URL}webxr-profiles/`,
  defaultControllerProfileId: 'meta-quest-touch-plus',
  defaultXRHandProfileId: 'generic-hand',
  // Development only. Production builds also alias the emulator module away
  // (see vite.config.ts), so its ~4.6 MB of synthetic rooms never ship.
  emulate: import.meta.env.DEV ? { inject: { hostname: 'localhost' } } : false,
});

/** Ends the active session, if any. Safe to call when not in XR. */
export async function exitXR(): Promise<void> {
  await xrStore.getState().session?.end();
}
