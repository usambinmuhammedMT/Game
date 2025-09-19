// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

// Simple matchmaking queue
let waitingPlayer = null;
let roomCount = 0;

function createEmptyGame() {
  return {
    board: Array(9).fill(null),
    turn: 'X', // 'X' always starts
    players: { X: null, O: null }, // socket.id => mark
    status: 'playing', // playing, ended
    winner: null,
  };
}

const games = {}; // roomId -> game state

io.on('connection', (socket) => {
  console.log('conn:', socket.id);

  socket.on('findGame', () => {
    if (waitingPlayer === null) {
      waitingPlayer = socket;
      socket.emit('waiting');
    } else {
      // pair waitingPlayer and this socket into a room
      const roomId = `room-${++roomCount}`;
      const p1 = waitingPlayer;
      const p2 = socket;
      waitingPlayer = null;

      p1.join(roomId);
      p2.join(roomId);

      const game = createEmptyGame();
      game.players.X = p1.id;
      game.players.O = p2.id;
      games[roomId] = game;

      // attach roomId on sockets
      p1.data = { roomId, mark: 'X' };
      p2.data = { roomId, mark: 'O' };

      io.to(roomId).emit('gameStart', {
        roomId,
        markFor: { [p1.id]: 'X', [p2.id]: 'O' },
        turn: game.turn,
      });

      console.log(`Started ${roomId} with ${p1.id} (X) and ${p2.id} (O)`);
    }
  });

  socket.on('makeMove', ({ idx }) => {
    const { roomId, mark } = socket.data || {};
    if (!roomId) return;
    const game = games[roomId];
    if (!game || game.status !== 'playing') return;

    // validate turn and empty spot
    if (game.turn !== mark) return;
    if (game.board[idx] !== null) return;

    game.board[idx] = mark;
    // check win/draw
    const winner = checkWinner(game.board);
    if (winner) {
      game.status = 'ended';
      game.winner = winner;
      io.to(roomId).emit('moveMade', { board: game.board, lastMove: { idx, mark }, turn: game.turn });
      io.to(roomId).emit('gameOver', { winner });
    } else if (game.board.every(cell => cell !== null)) {
      game.status = 'ended';
      game.winner = 'draw';
      io.to(roomId).emit('moveMade', { board: game.board, lastMove: { idx, mark }, turn: game.turn });
      io.to(roomId).emit('gameOver', { winner: 'draw' });
    } else {
      // switch turn
      game.turn = (game.turn === 'X') ? 'O' : 'X';
      io.to(roomId).emit('moveMade', { board: game.board, lastMove: { idx, mark }, turn: game.turn });
    }
  });

  socket.on('sendChat', ({ text }) => {
    const { roomId } = socket.data || {};
    if (!roomId) return;
    io.to(roomId).emit('chat', { id: socket.id, text });
  });

  socket.on('requestRematch', () => {
    const { roomId } = socket.data || {};
    if (!roomId) return;
    const game = games[roomId];
    if (!game) return;

    // store rematch votes on socket for simplicity
    socket.data.rematch = true;
    const clients = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const allAgree = clients.every(id => {
      const s = io.sockets.sockets.get(id);
      return s && s.data && s.data.rematch;
    });
    if (allAgree) {
      // reset
      game.board = Array(9).fill(null);
      game.turn = 'X';
      game.status = 'playing';
      game.winner = null;
      // clear rematch flags
      clients.forEach(id => {
        const s = io.sockets.sockets.get(id);
        if (s) s.data.rematch = false;
      });
      io.to(roomId).emit('rematchStart', { board: game.board, turn: game.turn });
    } else {
      io.to(roomId).emit('rematchVote', { socketId: socket.id });
    }
  });

  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    // if socket was waiting, remove from queue
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
    // inform opponent and clean up
    const { roomId } = socket.data || {};
    if (roomId) {
      const game = games[roomId];
      if (game) {
        game.status = 'ended';
        const opponentId = (game.players.X === socket.id) ? game.players.O : game.players.X;
        io.to(roomId).emit('opponentLeft', { leftId: socket.id });
        // remove game after a short delay
        setTimeout(() => {
          delete games[roomId];
        }, 1000 * 60); // keep briefly
      }
    }
  });
});

function checkWinner(b) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b1,c] of lines) {
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  }
  return null;
}

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
