// server.js
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = 3000;

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ===== Multiplayer Logic =====
let waitingPlayer = null;
const games = {}; // { roomId: { players:[], scores:{}, finished:{} } }

function makeRoomId() {
  return crypto.randomBytes(6).toString('hex');
}

io.on('connection', (socket) => {
  console.log(`[io] New connection: ${socket.id}`);

  socket.on('join-match', () => {
    if (waitingPlayer && waitingPlayer.connected) {
      const roomId = makeRoomId();
      socket.join(roomId);
      waitingPlayer.join(roomId);

      games[roomId] = {
        players: [waitingPlayer.id, socket.id],
        scores: { [waitingPlayer.id]: 0, [socket.id]: 0 },
        finished: {}
      };

      io.to(roomId).emit('match-found', { roomId });

      setTimeout(() => {
        io.to(roomId).emit('start-game');
      }, 300);

      waitingPlayer = null;
    } else {
      waitingPlayer = socket;
      socket.emit('waiting', 'Waiting for an opponent...');
    }
  });

  socket.on('level-complete', ({ roomId, time }) => {
    const game = games[roomId];
    if (!game) return;

    game.finished[socket.id] = time;
    game.scores[socket.id] = Math.max(0, 1000 - time);

    if (Object.keys(game.finished).length === game.players.length) {
      const [p1, p2] = game.players;
      let winner;
      if (game.scores[p1] === game.scores[p2]) winner = 'draw';
      else winner = game.scores[p1] > game.scores[p2] ? p1 : p2;

      io.to(roomId).emit('game-over', { scores: game.scores, winner });
      delete games[roomId];
    }
  });

  socket.on('disconnect', (reason) => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }

    for (const roomId of Object.keys(games)) {
      const game = games[roomId];
      if (game.players.includes(socket.id)) {
        const other = game.players.find(id => id !== socket.id);
        if (other) io.to(other).emit('opponent-disconnected', { message: 'Opponent disconnected. Match ended.' });
        delete games[roomId];
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
