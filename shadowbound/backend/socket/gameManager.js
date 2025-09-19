import { log, warn } from '../utils/logger.js';

const ROOM_CAP = 4;
const TICK_RATE = 20; // updates per second

const rooms = {}; // roomId -> room

function createRoom(roomId, io) {
  rooms[roomId] = {
    id: roomId,
    players: {},
    state: { ts: Date.now() },
    io,
    interval: null
  };
  startTick(roomId);
  log('Created room', roomId);
}

function deleteRoom(roomId) {
  const r = rooms[roomId];
  if (!r) return;
  if (r.interval) clearInterval(r.interval);
  delete rooms[roomId];
  log('Deleted room', roomId);
}

function startTick(roomId) {
  const room = rooms[roomId];
  if (!room) return;
  room.interval = setInterval(() => {
    const now = Date.now();
    // advance per-player fear and shadow behavior
    for (const [sid, p] of Object.entries(room.players)) {
      // passive fear increase when moving or when near other shadow events
      p.fear = Math.min(100, p.fear + (p.moving ? 0.25 : 0.08));

      if (p.fear >= 100 && !p.shadowActive) {
        p.shadowActive = true;
        p.shadowSince = now;
        // when unleashed server can trigger events
        room.io.to(roomId).emit('shadowUnleashed', { id: sid });
      }

      if (p.shadowActive) {
        p.shadowStrength = Math.min(100, (p.shadowStrength || 0) + 0.6);
      }
    }

    room.state.ts = now;

    // broadcast state snapshot
    room.io.to(roomId).emit('stateUpdate', {
      players: mapPlayersForClient(room.players),
      ts: room.state.ts
    });
  }, 1000 / TICK_RATE);
}

function mapPlayersForClient(players) {
  const out = {};
  for (const [sid, p] of Object.entries(players)) {
    out[sid] = {
      id: p.id,
      name: p.name,
      pos: p.pos,
      fear: Math.round(p.fear),
      shadowActive: !!p.shadowActive,
      shadowStrength: Math.round(p.shadowStrength || 0)
    };
  }
  return out;
}

export default function gameManager(io, socket) {
  socket.on('createRoom', ({ roomId }, ack) => {
    if (!roomId) return ack?.({ ok: false, msg: 'roomId required' });
    if (!rooms[roomId]) {
      createRoom(roomId, io);
      ack?.({ ok: true });
    } else {
      ack?.({ ok: false, msg: 'room exists' });
    }
  });

  socket.on('joinRoom', ({ roomId, name }, ack) => {
    if (!roomId || !name) return ack?.({ ok: false, msg: 'roomId & name required' });
    if (!rooms[roomId]) createRoom(roomId, io);
    const room = rooms[roomId];

    const count = Object.keys(room.players).length;
    if (count >= ROOM_CAP) return ack?.({ ok: false, msg: 'room full' });

    const player = {
      id: socket.id,
      name,
      pos: { x: 100 + Math.random() * 400, y: 100 + Math.random() * 300 },
      fear: 0,
      shadowActive: false,
      moving: false,
      lastInputTs: Date.now(),
      shadowStrength: 0
    };

    room.players[socket.id] = player;
    socket.join(roomId);
    socket.roomId = roomId;

    socket.emit('joined', { ok: true, players: mapPlayersForClient(room.players), you: player });
    io.to(roomId).emit('playerJoined', { id: socket.id, player: mapPlayersForClient({ [socket.id]: player })[socket.id] });
    ack?.({ ok: true });

    socket.on('input', (input) => {
      const p = room.players[socket.id];
      if (!p) return;
      p.moving = !!input.moving;
      p.lastInputTs = Date.now();

      if (input.dir) {
        const speed = input.moving ? 140 : 0;
        const mag = Math.sqrt(input.dir.x * input.dir.x + input.dir.y * input.dir.y) || 1;
        const nx = input.dir.x / mag;
        const ny = input.dir.y / mag;
        // authoritative server movement step
        p.pos.x += nx * (speed / TICK_RATE);
        p.pos.y += ny * (speed / TICK_RATE);
        p.pos.x = Math.max(0, Math.min(800, p.pos.x));
        p.pos.y = Math.max(0, Math.min(600, p.pos.y));
      }

      if (input.tryUnleash && p.fear >= 80) {
        p.shadowActive = true;
        io.to(roomId).emit('shadowUnleashed', { id: p.id });
      }

      if (input.pingEvent) {
        // increase fear on nearby players
        for (const [sid, other] of Object.entries(room.players)) {
          if (sid === socket.id) continue;
          const dx = other.pos.x - p.pos.x;
          const dy = other.pos.y - p.pos.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 200 * 200) {
            other.fear = Math.min(100, other.fear + 10);
          }
        }
      }
    });

    socket.on('disconnect', () => {
      log('disconnect', socket.id);
      if (!room) return;
      delete room.players[socket.id];
      io.to(roomId).emit('playerLeft', { id: socket.id });
      socket.leave(roomId);
      if (Object.keys(room.players).length === 0) deleteRoom(roomId);
    });
  });

  socket.on('leaveRoom', () => {
    const roomId = socket.roomId;
    if (!roomId || !rooms[roomId]) return;
    delete rooms[roomId].players[socket.id];
    socket.leave(roomId);
    io.to(roomId).emit('playerLeft', { id: socket.id });
    if (Object.keys(rooms[roomId].players).length === 0) deleteRoom(roomId);
  });
}
