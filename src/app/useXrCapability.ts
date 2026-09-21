/**
 * Capability and session state for the entry page.
 *
 * Re-checks support when the development emulator injects itself, because the
 * emulator patches `navigator.xr` asynchronously after the store is built and a
 * single check at mount would report "no WebXR" for the rest of the session.
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

/** True when the session is the development emulator rather than a device. */
export function useIsEmulated(): boolean {
  return useXR((state) => state.emulator != null);
}
