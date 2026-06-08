import { supabase } from './supabase.js';

// ─── Session Identity ─────────────────────────────────────────────────────────

export function getSessionId() {
  const KEY = 'balut_session_id';
  // localStorage (not sessionStorage) so identity — and the ability to rejoin a
  // game in progress — survives a full reload or mobile tab eviction.
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// Remembers the room the player is actively in, so we can rejoin straight into
// the game on reload instead of bouncing through the lobby.
const ACTIVE_ROOM_KEY = 'balut_active_room';
export function saveActiveRoom(roomCode) { try { localStorage.setItem(ACTIVE_ROOM_KEY, roomCode); } catch { /* ignore */ } }
export function getActiveRoom()           { try { return localStorage.getItem(ACTIVE_ROOM_KEY); } catch { return null; } }
export function clearActiveRoom()         { try { localStorage.removeItem(ACTIVE_ROOM_KEY); } catch { /* ignore */ } }

// ─── Room Code ────────────────────────────────────────────────────────────────

// Uppercase A-Z + 2-9, omitting I/O/0/1 to avoid visual confusion
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}

// ─── Room Lifecycle ───────────────────────────────────────────────────────────

export async function createRoom(hostName, retries = 3) {
  if (!supabase) throw new Error('Supabase not configured');
  const sessionId = getSessionId();
  const hostSession = { sessionId, name: hostName, playerIndex: 0 };

  for (let attempt = 0; attempt < retries; attempt++) {
    const roomCode = generateRoomCode();
    const { data, error } = await supabase
      .from('online_games')
      .insert({
        room_code:       roomCode,
        host_session:    sessionId,
        player_sessions: [hostSession],
        state:           {},
        status:          'lobby',
      })
      .select('id, room_code')
      .single();

    if (!error) return { roomCode: data.room_code, gameId: data.id };
    if (error.code === '23505' && attempt < retries - 1) continue; // unique collision, retry
    throw error;
  }
  throw new Error('Failed to generate a unique room code after retries');
}

export async function joinRoom(roomCode, playerName) {
  if (!supabase) throw new Error('Supabase not configured');
  const sessionId = getSessionId();
  const upper = roomCode.toUpperCase();

  const { data: row, error } = await supabase
    .from('online_games')
    .select('id, player_sessions, status')
    .eq('room_code', upper)
    .single();

  if (error || !row) throw { code: 'NOT_FOUND' };
  if (row.status !== 'lobby') throw { code: 'ALREADY_STARTED' };

  const sessions = row.player_sessions || [];

  // Already in the room (e.g. page refresh during lobby)
  const existing = sessions.find(s => s.sessionId === sessionId);
  if (existing) return { row, playerIndex: existing.playerIndex };

  if (sessions.length >= 4) throw { code: 'FULL' };

  const playerIndex = sessions.length;
  const newSession  = { sessionId, name: playerName, playerIndex };
  const updated     = [...sessions, newSession];

  const { error: updateError } = await supabase
    .from('online_games')
    .update({ player_sessions: updated })
    .eq('id', row.id);

  if (updateError) throw { code: 'ERROR', detail: updateError };
  return { row: { ...row, player_sessions: updated }, playerIndex };
}

export async function fetchGameSnapshot(roomCode) {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('online_games')
    .select('state, status, player_sessions, id')
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error) throw error;
  return data;
}

export async function persistState(gameId, newState, status) {
  if (!supabase || !gameId) return;
  const update = { state: newState, updated_at: new Date().toISOString() };
  if (status) update.status = status;
  await supabase.from('online_games').update(update).eq('id', gameId);
}

export async function abandonRoom(gameId) {
  if (!supabase || !gameId) return;
  await supabase
    .from('online_games')
    .update({ status: 'abandoned', updated_at: new Date().toISOString() })
    .eq('id', gameId);
}

// ─── Realtime Channel ─────────────────────────────────────────────────────────

export function subscribeToRoom(
  roomCode, sessionId, presencePayload,
  onAction, onPresenceChange, onStatusChange,
) {
  if (!supabase) throw new Error('Supabase not configured');

  const channel = supabase.channel(`game:${roomCode.toUpperCase()}`, {
    config: {
      broadcast: { self: false },
      presence:  { key: sessionId },
    },
  });

  channel
    .on('broadcast', { event: 'action' }, ({ payload }) => {
      if (payload?.action) onAction(payload.action);
    })
    .on('presence', { event: 'sync' }, () => {
      onPresenceChange(channel.presenceState());
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track(presencePayload);
      }
      if (onStatusChange) onStatusChange(status);
    });

  return channel;
}

export async function broadcastAction(channel, action) {
  if (!channel) return;
  await channel.send({ type: 'broadcast', event: 'action', payload: { action } });
}
