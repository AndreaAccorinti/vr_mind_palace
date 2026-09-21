/**
 * Production stand-in for `@pmndrs/xr`'s device emulator.
 *
 * The real module statically imports IWER's synthetic room environments, which
 * add roughly 4.6 MB of JavaScript to `dist/`. The emulator only ever runs on
 * localhost, and the production store passes `emulate: false`, so that payload
 * would be deployed and never executed. The build aliases the module here
 * instead; development builds keep the real one.
 */

export function emulate() {
  return undefined;
}
