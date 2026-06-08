import { useReducer, useState, useRef, useEffect } from 'react';
import { createInitialState } from '../logic/gameState.js';
import { reducer } from './useGameState.js';
import * as svc from '../services/onlineGame.js';

export function useOnlineGame() {
  const sessionId = svc.getSessionId();

  const [state, dispatch]             = useReducer(reducer, createInitialState());
  // Start in 'restoring' (not 'idle') when a game is remembered, so the app
  // shows a neutral reconnecting screen on first paint — never the lobby.
  const [connectionPhase, setPhase]   = useState(() => svc.getActiveRoom() ? 'restoring' : 'idle');
  const [roomCode, setRoomCode]       = useState(null);
  const [gameId, setGameId]           = useState(null);
  const [myPlayerIndex, setMyIdx]     = useState(null);
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [errorMessage, setError]      = useState(null);

  // Mutable refs — readable in stale closures (channel callbacks)
  const channelRef        = useRef(null);
  const gameIdRef         = useRef(null);
  const roomCodeRef       = useRef(null);
  const myIdxRef          = useRef(null);
  const phaseRef          = useRef('idle');
  const stateRef          = useRef(state);
  const playerSessionsRef = useRef([]);  // { sessionId, name, playerIndex }[]
  const hasConnectedRef   = useRef(false);
  const reconnectStartedRef = useRef(false);

  // Keep refs current
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { phaseRef.current = connectionPhase; }, [connectionPhase]);
  useEffect(() => { gameIdRef.current = gameId; }, [gameId]);
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { myIdxRef.current = myPlayerIndex; }, [myPlayerIndex]);

  // On mount, if a game is remembered, rejoin straight into it — no lobby detour.
  useEffect(() => {
    if (reconnectStartedRef.current) return; // run once (guards StrictMode double-mount)
    const code = svc.getActiveRoom();
    if (!code) return;
    reconnectStartedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const snap     = await svc.fetchGameSnapshot(code);
        const okStatus = snap && (snap.status === 'playing' || snap.status === 'gameover');
        const sessions = snap?.player_sessions || [];
        const me       = sessions.find(s => s.sessionId === sessionId);
        if (cancelled) return;
        if (!okStatus || !me) { svc.clearActiveRoom(); setPhase('idle'); return; }

        setRoomCode(code);        roomCodeRef.current = code;
        setGameId(snap.id);       gameIdRef.current   = snap.id;
        setMyIdx(me.playerIndex); myIdxRef.current    = me.playerIndex;
        if (snap.state && snap.state.phase) dispatch({ type: '__RESTORE__', state: snap.state });

        openChannel(code, { name: me.name, playerIndex: me.playerIndex }, sessions);
        hasConnectedRef.current = true; // already hydrated from the snapshot
        setPhase('playing');
      } catch {
        if (!cancelled) { svc.clearActiveRoom(); setPhase('idle'); }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMyTurn = myPlayerIndex !== null && state.currentPlayerIndex === myPlayerIndex;

  // ─── Presence handler ─────────────────────────────────────────────────────
  function handlePresenceChange(presenceState) {
    const onlineIds = new Set(Object.keys(presenceState));
    const phase = phaseRef.current;

    if (phase === 'playing' || phase === 'reconnecting') {
      // In-game: use stored session map to determine online/offline per player
      setOnlinePlayers(
        playerSessionsRef.current
          .map(s => ({ name: s.name, playerIndex: s.playerIndex, isOnline: onlineIds.has(s.sessionId) }))
          .sort((a, b) => a.playerIndex - b.playerIndex)
      );
    } else {
      // Lobby: derive directly from presence (everyone online is present)
      const players = Object.entries(presenceState)
        .map(([sid, arr]) => ({
          sessionId:   sid,
          name:        arr[0]?.name ?? 'Unknown',
          playerIndex: arr[0]?.playerIndex ?? -1,
          isOnline:    true,
        }))
        .filter(p => p.playerIndex >= 0)
        .sort((a, b) => a.playerIndex - b.playerIndex);

      // Grow playerSessionsRef as new players appear in presence
      players.forEach(p => {
        if (!playerSessionsRef.current.find(s => s.sessionId === p.sessionId)) {
          playerSessionsRef.current = [...playerSessionsRef.current, p]
            .sort((a, b) => a.playerIndex - b.playerIndex);
        }
      });

      setOnlinePlayers(players);
    }
  }

  // ─── Channel status handler ────────────────────────────────────────────────
  function handleStatusChange(status) {
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      if (phaseRef.current === 'playing') setPhase('reconnecting');
    } else if (status === 'SUBSCRIBED') {
      if (hasConnectedRef.current && phaseRef.current === 'reconnecting') {
        // Reconnected — hydrate state from DB snapshot
        svc.fetchGameSnapshot(roomCodeRef.current)
          .then(({ state: snapshot }) => {
            if (snapshot && snapshot.phase) {
              dispatch({ type: '__RESTORE__', state: snapshot });
            }
            setPhase('playing');
          })
          .catch(() => setPhase('playing'));
      }
      hasConnectedRef.current = true;
    }
  }

  // ─── Subscribe helper ─────────────────────────────────────────────────────
  function openChannel(code, presencePayload, initialSessions) {
    playerSessionsRef.current = initialSessions || [];
    hasConnectedRef.current = false;

    const channel = svc.subscribeToRoom(
      code, sessionId, presencePayload,
      // onAction — received from other players
      (action) => {
        dispatch(action);
        // Guest auto-transitions when host starts game
        if (action.type === 'SETUP_MULTIPLAYER') {
          if (action.playerSessions) playerSessionsRef.current = action.playerSessions;
          svc.saveActiveRoom(roomCodeRef.current);
          setPhase('playing');
        }
      },
      handlePresenceChange,
      handleStatusChange,
    );

    channelRef.current = channel;
    return channel;
  }

  // ─── Create room ──────────────────────────────────────────────────────────
  async function createRoom(hostName) {
    try {
      setPhase('creating');
      setError(null);
      const { roomCode: code, gameId: id } = await svc.createRoom(hostName);
      setRoomCode(code);
      setGameId(id);
      setMyIdx(0);
      roomCodeRef.current = code;
      gameIdRef.current   = id;
      myIdxRef.current    = 0;

      openChannel(
        code,
        { name: hostName, playerIndex: 0 },
        [{ sessionId, name: hostName, playerIndex: 0 }],
      );
      setPhase('lobby-host');
    } catch {
      setError('Could not create room. Please try again.');
      setPhase('error');
    }
  }

  // ─── Join room ────────────────────────────────────────────────────────────
  async function joinRoom(code, playerName) {
    const upper = code.toUpperCase();
    // Let errors propagate to the caller so the UI can show specific messages
    const { row, playerIndex } = await svc.joinRoom(upper, playerName);
    setRoomCode(upper);
    setGameId(row.id);
    setMyIdx(playerIndex);
    roomCodeRef.current = upper;
    gameIdRef.current   = row.id;
    myIdxRef.current    = playerIndex;

    openChannel(
      upper,
      { name: playerName, playerIndex },
      row.player_sessions || [],
    );
    setPhase('lobby-guest');
  }

  // ─── Start game (host only) ───────────────────────────────────────────────
  async function startGame() {
    if (phaseRef.current !== 'lobby-host') return;

    const sessions = [...playerSessionsRef.current].sort((a, b) => a.playerIndex - b.playerIndex);
    const names    = sessions.map(s => s.name);
    // Include playerSessions so guests can build their session→index map
    const action   = { type: 'SETUP_MULTIPLAYER', names, playerSessions: sessions };

    const newState = reducer(stateRef.current, action);
    dispatch(action);
    svc.saveActiveRoom(roomCodeRef.current);
    setPhase('playing');

    await Promise.all([
      svc.persistState(gameIdRef.current, newState, 'playing'),
      svc.broadcastAction(channelRef.current, action),
    ]);
  }

  // ─── Leave / cleanup ─────────────────────────────────────────────────────
  function leaveRoom() {
    const phase = phaseRef.current;
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    // Abandon the DB row only when the host leaves the lobby (guests or in-game: just disconnect)
    if (gameIdRef.current && phase === 'lobby-host') {
      svc.abandonRoom(gameIdRef.current).catch(() => {});
    }
    svc.clearActiveRoom();
    playerSessionsRef.current = [];
    hasConnectedRef.current   = false;
    setPhase('idle');
    setRoomCode(null);
    setGameId(null);
    setMyIdx(null);
    setOnlinePlayers([]);
    setError(null);
    dispatch({ type: 'GO_HOME' });
  }

  // ─── Game actions ─────────────────────────────────────────────────────────
  function dispatchAndBroadcast(action) {
    const newState = reducer(stateRef.current, action);
    dispatch(action);
    svc.broadcastAction(channelRef.current, action).catch(console.error);
    // Keep the persisted status in sync so reconnects land in the right place
    // (notably a rematch flips gameover → playing).
    const newStatus = newState.phase === 'gameover' ? 'gameover' : 'playing';
    svc.persistState(gameIdRef.current, newState, newStatus).catch(console.error);
  }

  function roll() {
    if (!isMyTurn) return;
    const s = stateRef.current;
    if (s.rollsLeft === 0) return;
    // Pre-roll on the active client and include the result in the broadcast
    // so all clients apply identical dice values (rollDice uses Math.random).
    const newDice = s.dice.map(die =>
      die.held ? die : { ...die, value: Math.ceil(Math.random() * 6) }
    );
    dispatchAndBroadcast({ type: 'ROLL', dice: newDice });
  }

  function toggleHold(index) {
    if (!isMyTurn) return;
    dispatchAndBroadcast({ type: 'TOGGLE_HOLD', index });
  }

  function scoreCategory(category) {
    if (!isMyTurn) return;
    dispatchAndBroadcast({ type: 'PENDING_SCORE', category });
  }

  function dismissHandoff() {
    // The NEXT player (handoff target) calls this
    const target = state.pendingScore?.nextPlayerIdx ?? state.currentPlayerIndex;
    if (target !== myPlayerIndex) return;
    dispatchAndBroadcast({ type: 'DISMISS_HANDOFF' });
  }

  function cancelPending() {
    // Only the player who placed the score can cancel
    if (state.currentPlayerIndex !== myPlayerIndex) return;
    dispatchAndBroadcast({ type: 'CANCEL_PENDING' });
  }

  function toggleOracle() {
    // Local preference — never broadcast
    dispatch({ type: 'TOGGLE_ORACLE' });
  }

  function playAgain() {
    // Host-only rematch: reset the game for everyone, staying in the room.
    if (myPlayerIndex !== 0) return;
    dispatchAndBroadcast({ type: 'PLAY_AGAIN' });
  }

  function goHome() {
    leaveRoom();
  }

  return {
    connectionPhase,
    roomCode,
    gameId,
    myPlayerIndex,
    isHost: myPlayerIndex === 0,
    sessionId,
    onlinePlayers,
    errorMessage,
    state,
    isMyTurn,
    createRoom,
    joinRoom,
    startGame,
    leaveRoom,
    roll,
    toggleHold,
    scoreCategory,
    dismissHandoff,
    cancelPending,
    toggleOracle,
    playAgain,
    goHome,
  };
}
