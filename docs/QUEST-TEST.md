# Quest 3 acceptance record

Status: **Not run.** M0 is implemented and passes its automated checks, but no
row below has been verified on a headset.

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

```
(not yet recorded)
```
