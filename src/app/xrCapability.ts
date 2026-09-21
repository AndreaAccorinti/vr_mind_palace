/**
 * WebXR capability detection, kept out of React so it can be reasoned about and
 * tested on its own.
 *
 * The states are deliberately distinct: "this browser has no WebXR at all",
 * "it has WebXR but not immersive VR", and "the check itself failed" lead to
 * different advice for the user, and collapsing them into a boolean is how an
 * entry page ends up telling a Quest owner their headset is unsupported.
 */

export type XrCapability =
  | { readonly status: 'checking' }
  /** No `navigator.xr`: an ordinary desktop browser, or an insecure origin. */
  | { readonly status: 'no-webxr'; readonly secureContext: boolean }
  /** WebXR exists but `immersive-vr` is not offered. */
  | { readonly status: 'no-immersive-vr' }
  | { readonly status: 'supported' }
  /** `isSessionSupported` threw or was blocked by permissions policy. */
  | { readonly status: 'check-failed'; readonly message: string };

export async function detectXrCapability(): Promise<XrCapability> {
  // WebXR is only exposed in a secure context. Reporting that distinctly is what
  // turns a mystifying "unsupported" into an actionable "use the HTTPS address".
  const secureContext = typeof globalThis.isSecureContext === 'boolean' ? globalThis.isSecureContext : true;

  const xr = typeof navigator === 'undefined' ? undefined : navigator.xr;
  if (xr === undefined) {
    return { status: 'no-webxr', secureContext };
  }

  try {
    const supported = await xr.isSessionSupported('immersive-vr');
    return supported ? { status: 'supported' } : { status: 'no-immersive-vr' };
  } catch (error) {
    return {
      status: 'check-failed',
      message: error instanceof Error ? error.message : 'The WebXR support check did not complete.',
    };
  }
}

/** Whether a WebGL2 context can actually be created. */
export function detectWebGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2');
    if (context === null) return false;
    // Release the probe context immediately; browsers cap how many exist at once.
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}
