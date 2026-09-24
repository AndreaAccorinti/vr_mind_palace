# Quest 3 acceptance record

Status: **First run done, 23 September 2026 — FAILED.** Controllers did not
work at all and the floor flickered. Both causes were found and fixed; a
re-test is needed. No row below is marked passed.

**Before you start:** WebXR is only offered in a secure context. A `npm run dev`
LAN address will not work — the page will honestly report no WebXR, which is not
a bug. Build and serve over HTTPS, then open the **top-level** URL in Meta Quest
Browser. `docs/M0-REVIEW.md` §3 holds the numbered acceptance criteria (C1–C22)
and the measurements to record (M1–M3); this table is the summary to fill in.

Record app revision, URL, Quest model, Horizon OS/browser version, controller/hand mode, selected quality and supported/selected refresh rate. Use the deployed top-level HTTPS URL. Keep any copied private content out of public diagnostics.

| Check | Procedure | Pass condition |
| --- | --- | --- |
| Entry | Open URL in Quest Browser; choose Enter VR | Permission/session handling is clear; room appears without a blank view. |
| Selection | Point at and select each prop and action | Target feedback is visible; one input performs one intended action. |
| Teleport | Move to each valid pad, including from a physical offset | No unintended displacement, floor jump or trapped position. |
| Turning | Snap left/right while away from the initial origin | Turns around the user correctly; no unexpected orbit or head motion. |
| Seated use | Sit, recenter and repeat selection/reveal | Panels and controls stay reachable/readable; floor alignment is reasonable. |
| Readability | Read cue and exact answer at the chosen distance | Text fits, is not clipped and does not require leaning into the panel. |
| Recall | Cue, attempt, optional hint, reveal, rate | Answer remains concealed until reveal; rating saves once. |
| Route stability | Return after adding or sorting items | Saved landmarks and item locations are unchanged. |
| Lifecycle | Exit and re-enter VR three times; sleep/wake headset | No duplicate input listeners, stale controllers, missing UI or lost progress. |
| Performance | Rehearse the representative room for five minutes with **Frame stats** open, then **Save run** | Paste the saved report below. Record measurements, not an assumed FPS; dropped frames in that report are inferred from intervals, not a compositor count. |
| File handoff | Download/import exported content before VR | Computer-authored content actually appears on Quest. |
| Offline, when built | Load/cache selected palace; close/reopen it without network | Required local room/media and review flow work; uncached content explains its state. |
| Persistence | Reload, revisit and export | Content and reviews persist as designed; errors do not masquerade as saves. |
| Comfort | Complete a short seated and standing rehearsal | User can move and stop voluntarily; record any discomfort and its trigger. |

IWER and desktop browser checks are useful earlier, but do not mark any of the physical-device rows passed.

## Recorded run

After the rehearsal, press **Save run** in the in-scene Frame stats panel, exit
VR, and use "Copy for QUEST-TEST.md" on the 2D page. Paste it here, then add the
headset model, Horizon OS version and browser version, which the app cannot
know.

### Run 1 — 23 September 2026 — FAILED

Device: Meta Quest 3, Quest Browser (`Chrome/152.0.7977.64 VR Safari/537.36`).
Build: `db8b5fa`. Recorded with the in-scene Frame stats panel.

```
Reported frame rate: not reported
Supported frame rates: not reported
Time to first frame: 3811.9 ms
Input sources at end: 0

Samples: 2797 over 38.7 s
Mean interval: 13.84 ms (72.3 fps)
Median: 13.88 ms
p95: 14.63 ms
p99: 15.38 ms
Max: 77 ms
Stalls (>= 100 ms): 0
Estimated dropped frames: no target rate reported
Suspensions excluded: 0
```

Observed by the tester: **controllers did not work**, and the **floor
flickered**.

**Rendering performance is good and this evidence stands.** 72.3 fps mean
against a 13.9 ms target, p99 15.38 ms, zero stalls over 38.7 s. The single
77 ms maximum is one frame, consistent with an asset finishing its load.

**Three of the reported fields were wrong, and the app was at fault**, so they
are struck from the record rather than believed:

- `Input sources at end: 0`, `Reported frame rate: not reported` and
  `Supported frame rates: not reported` were read from the XRSession at the
  moment it ended, when the runtime has already cleared the frame rate and
  fired `inputsourceschange` removing every input. They describe the capture
  bug, not the session. Fixed: facts are now sampled while the session is alive.

**Root causes found:**

1. **Controllers dead** — `profilesList.json` advertised all 42 upstream
   profiles while only two directories were bundled, so the reported profile id
   resolved to a 404. `@pmndrs/xr` swallows that with `.catch(console.error)`
   and never registers the controller: no ray, no model, no selection, and
   nothing on screen explaining it. Fixed by generating the listing from the
   bundled directories, with Quest and Oculus ids aliased onto the profile that
   is actually shipped.
2. **Floor flicker** — z-fighting. The wall box and the skirting box both had
   their bottom faces at exactly `y = 0`, coplanar with the floor plane around
   the whole perimeter. Invisible on a desktop GPU, flickering on the headset.
   Fixed by sinking both below the floor, moving the floor decals to polygon
   offset instead of millimetre gaps, and raising the camera near plane from
   0.05 m to 0.1 m.

**Still unknown:** whether Quest Browser reports `frameRate` and
`supportedFrameRates` at all. The capture bug masked it, so run 2 answers it.

### Run 2

```
(not yet recorded)
```
