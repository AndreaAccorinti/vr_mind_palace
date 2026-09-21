/**
 * Capability and session state for the entry page.
 *
 * Re-checks when the development emulator lands, because it patches
 * `navigator.xr` asynchronously after the store is built and a single check at
 * mount would report the pre-injection answer for the rest of the session.
 */

import { useXR } from '@react-three/xr';
import { useEffect, useState } from 'react';
import { detectXrCapability, type XrCapability } from './xrCapability.ts';
import { xrStore } from './xrStore.ts';

export function useXrCapability(): XrCapability {
  const [capability, setCapability] = useState<XrCapability>({ status: 'checking' });

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      void detectXrCapability().then((next) => {
        if (!cancelled) setCapability(next);
      });
    };

    check();
    // The emulator lands in store state once injected; re-check when it does.
    const unsubscribe = xrStore.subscribe((state, previous) => {
      if (state.emulator !== previous.emulator) check();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return capability;
}

/**
 * Whether the development emulator is actually driving WebXR.
 *
 * Three states, not a boolean, because the middle one is real and confusing:
 * IWER's `installRuntime()` deliberately refuses to replace an existing
 * `navigator.xr` unless forced, and `@pmndrs/xr` does not force it. Every
 * desktop Chrome ships `navigator.xr` — present, but offering no device — so on
 * a normal development machine the emulator object is constructed and then does
 * nothing.
 *
 * Reporting that as "emulator active" would be a claim the app cannot support,
 * and would leave someone wondering why Enter VR stays disabled while a badge
 * says emulation is running.
 */
export type EmulationState =
  /** No emulator: a deployed origin, or a browser with real WebXR. */
  | 'off'
  /** The emulator installed its runtime and is serving WebXR. */
  | 'active'
  /** Constructed, but a native `navigator.xr` was already present, so it stood down. */
  | 'inert';

export function useEmulationState(): EmulationState {
  return useXR((state) => {
    const emulator = state.emulator;
    if (emulator == null) return 'off';
    return emulator.isNativeXRAvailable() ? 'inert' : 'active';
  });
}
