/**
 * The controller that binds the domain model, the repositories and the scene.
 *
 * All learning and viewer state lives here as plain domain values. React holds
 * them; it does not define them. That is the boundary the blueprint asks for:
 * swapping the renderer, or adding Dexie behind the repository interface, does
 * not touch any rule in `src/domain`.
 */

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import {
  chunkCount,
  createViewerState,
  findRoom,
  floorBoundsOf,
  itemAtLocus,
  lociOfRoom,
  recenter as recenterViewer,
  roomEntryPose,
  reviewReducer,
  setPosture,
  snapTurn,
  startReview,
  teleportTo,
  type LocusId,
  type PalaceContent,
  type ReviewRating,
  type TurnDirection,
  type Vec3,
  type ViewerState,
} from '../domain/index.ts';
import {
  createLocalPreferencesRepository,
  createMemoryContentRepository,
  DEFAULT_PREFERENCES,
  type ContentRepository,
  type PreferencesRepository,
} from '../persistence/index.ts';

export type ContentStatus =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly content: PalaceContent }
  | { readonly kind: 'failed'; readonly message: string };

export interface PalaceSession {
  readonly status: ContentStatus;
  readonly roomId: string | null;
  readonly viewer: ViewerState;
  readonly review: ReturnType<typeof startReview>;
  readonly selectedLocusId: LocusId | null;
  /** Set when a preference could not be saved. Shown, never swallowed. */
  readonly storageNotice: string | null;
  readonly selectLocus: (locusId: LocusId) => void;
  readonly snapTurn: (direction: TurnDirection) => void;
  readonly teleport: (point: Vec3) => void;
  readonly recenter: () => void;
  readonly togglePosture: () => void;
  readonly hint: () => void;
  readonly nextChunk: () => void;
  readonly reveal: () => void;
  readonly rate: (rating: ReviewRating) => void;
  readonly restart: () => void;
  readonly dismissStorageNotice: () => void;
}

export interface PalaceSessionOptions {
  readonly contentRepository?: ContentRepository;
  readonly preferencesRepository?: PreferencesRepository;
}

/** A neutral starting pose used before content has loaded. */
const FALLBACK_VIEWER = createViewerState({ position: [0, 0, 1.2], yawDegrees: 0 });

export function usePalaceSession(options: PalaceSessionOptions = {}): PalaceSession {
  const contentRepository = useMemo(
    () => options.contentRepository ?? createMemoryContentRepository(),
    [options.contentRepository],
  );
  const preferencesRepository = useMemo(
    () => options.preferencesRepository ?? createLocalPreferencesRepository(),
    [options.preferencesRepository],
  );

  const [status, setStatus] = useState<ContentStatus>({ kind: 'loading' });
  const [viewer, setViewer] = useState<ViewerState>(FALLBACK_VIEWER);
  const [selectedLocusId, setSelectedLocusId] = useState<LocusId | null>(null);
  const [review, dispatchReview] = useReducer(reviewReducer, startReview(''));

  // Preferences are read once, during the first render, so the scene's first
  // frame already has the user's posture: changing it afterwards would move the
  // floor under someone who has just put a headset on. A read failure becomes
  // the initial notice rather than an effect, which keeps the first paint
  // truthful without a second render pass.
  const [initialPreferences] = useState(() => preferencesRepository.load());
  const [preferences, setPreferences] = useState(() =>
    initialPreferences.ok ? initialPreferences.value : DEFAULT_PREFERENCES,
  );
  const [storageNotice, setStorageNotice] = useState<string | null>(() =>
    initialPreferences.ok ? null : initialPreferences.message,
  );

  useEffect(() => {
    let cancelled = false;
    void contentRepository
      .loadContent()
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setStatus({ kind: 'failed', message: result.message });
          return;
        }
        const content = result.value;
        setStatus({ kind: 'ready', content });

        const firstRoomId = content.palace.roomOrder[0];
        const room = firstRoomId === undefined ? undefined : findRoom(content, firstRoomId);
        if (room === undefined) {
          setStatus({ kind: 'failed', message: 'This palace lists no rooms to show.' });
          return;
        }

        // Arrive looking at the whole route rather than at one plinth, and
        // select the first item so there is something to recall immediately.
        const firstLocus = lociOfRoom(content, room.id)[0];
        setViewer(createViewerState(roomEntryPose(room), preferences.posture));
        if (firstLocus !== undefined) {
          setSelectedLocusId(firstLocus.id);
          const item = itemAtLocus(content, firstLocus.id);
          dispatchReview({ type: 'select-item', itemId: item?.id ?? '' });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus({
          kind: 'failed',
          message: error instanceof Error ? error.message : 'The palace could not be loaded.',
        });
      });
    return () => {
      cancelled = true;
    };
    // `preferences.posture` is read once to seed the viewer; later changes go
    // through `togglePosture`, which must not reload content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentRepository]);

  const content = status.kind === 'ready' ? status.content : null;
  const roomId = content?.palace.roomOrder[0] ?? null;
  const room = content !== null && roomId !== null ? findRoom(content, roomId) : undefined;

  const persistPreferences = useCallback(
    (next: typeof preferences) => {
      setPreferences(next);
      const saved = preferencesRepository.save(next);
      if (!saved.ok) setStorageNotice(saved.message);
    },
    [preferencesRepository],
  );

  const selectLocus = useCallback(
    (locusId: LocusId) => {
      setSelectedLocusId(locusId);
      if (content === null) return;
      const item = itemAtLocus(content, locusId);
      // Selecting a different locus starts that item's recall from the cue, so
      // a revealed answer never carries over to the next item.
      dispatchReview({ type: 'select-item', itemId: item?.id ?? `empty:${locusId}` });
    },
    [content],
  );

  const handleSnapTurn = useCallback((direction: TurnDirection) => {
    setViewer((current) => snapTurn(current, direction));
  }, []);

  const teleport = useCallback(
    (point: Vec3) => {
      if (room === undefined) return;
      setViewer((current) => teleportTo(current, point, floorBoundsOf(room)));
    },
    [room],
  );

  const recenter = useCallback(() => {
    setViewer((current) => recenterViewer(current));
  }, []);

  const togglePosture = useCallback(() => {
    setViewer((current) => {
      const next = current.posture === 'seated' ? 'standing' : 'seated';
      persistPreferences({ ...preferences, posture: next });
      return setPosture(current, next);
    });
  }, [persistPreferences, preferences]);

  const selectedItem =
    content !== null && selectedLocusId !== null ? itemAtLocus(content, selectedLocusId) : undefined;
  const chunkTotal = selectedItem === undefined ? 1 : chunkCount(selectedItem.mnemonic);

  return {
    status,
    roomId,
    viewer,
    review,
    selectedLocusId,
    storageNotice,
    selectLocus,
    snapTurn: handleSnapTurn,
    teleport,
    recenter,
    togglePosture,
    hint: useCallback(() => dispatchReview({ type: 'show-hint' }), []),
    nextChunk: useCallback(
      () => dispatchReview({ type: 'next-chunk', chunkCount: chunkTotal }),
      [chunkTotal],
    ),
    reveal: useCallback(() => dispatchReview({ type: 'reveal' }), []),
    rate: useCallback((rating: ReviewRating) => dispatchReview({ type: 'rate', rating }), []),
    restart: useCallback(() => dispatchReview({ type: 'restart' }), []),
    dismissStorageNotice: useCallback(() => setStorageNotice(null), []),
  };
}
