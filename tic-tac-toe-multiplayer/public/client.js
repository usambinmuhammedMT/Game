// client.js
const socket = io();

const findBtn = document.getElementById('findBtn');
const lobbyStatus = document.getElementById('lobbyStatus');
const lobbyDiv = document.getElementById('lobby');

const gameDiv = document.getElementById('game');
const boardDiv = document.getElementById('board');
const myMarkDiv = document.getElementById('myMark');
const turnDiv = document.getElementById('turn');
const resultDiv = document.getElementById('result');
const rematchBtn = document.getElementById('rematchBtn');
const leaveBtn = document.getElementById('leaveBtn');

const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatLog = document.getElementById('chatLog');

let myMark = null;
let currentTurn = null;
let board = Array(9).fill(null);
let roomId = null;

function renderBoard() {
  boardDiv.innerHTML = '';
  board.forEach((cell, idx) => {
    const el = document.createElement('div');
    el.className = 'cell' + (cell ? ' disabled' : '');
    el.textContent = cell || '';
    el.addEventListener('click', () => {
      if (!myMark || board[idx] || resultDiv.textContent) return;
      // only allow click if it's our turn
      if (currentTurn !== myMark) return;
      socket.emit('makeMove', { idx });
    });
    boardDiv.appendChild(el);
  });
}

findBtn.addEventListener('click', () => {
  lobbyStatus.textContent = 'Finding a match...';
  socket.emit('findGame');
});

socket.on('waiting', () => {
  lobbyStatus.textContent = 'Waiting for opponent...';
});

socket.on('gameStart', (data) => {
  // data: { roomId, markFor, turn }
  lobbyDiv.classList.add('hidden');
  gameDiv.classList.remove('hidden');

  roomId = data.roomId;
  // determine our mark
  myMark = data.markFor[socket.id] || (data.markFor ? Object.values(data.markFor)[0] : null);
  myMarkDiv.textContent = `Mark: ${myMark}`;
  currentTurn = data.turn;
  turnDiv.textContent = `Turn: ${currentTurn}`;
  resultDiv.textContent = '';
  board = Array(9).fill(null);
  renderBoard();
  rematchBtn.disabled = true;
});

socket.on('moveMade', ({ board: newBoard, lastMove, turn }) => {
  board = newBoard;
  currentTurn = turn;
  turnDiv.textContent = `Turn: ${currentTurn}`;
  renderBoard();
});

socket.on('gameOver', ({ winner }) => {
  if (winner === 'draw') {
    resultDiv.textContent = `Draw!`;
  } else {
    resultDiv.textContent = (winner === myMark) ? `You won! (${winner})` : `You lost. (${winner})`;
  }
  rematchBtn.disabled = false;
});

socket.on('chat', ({ id, text }) => {
  const el = document.createElement('div');
  el.className = 'msg';
  el.textContent = `${id === socket.id ? 'You' : 'Opponent'}: ${text}`;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  socket.emit('sendChat', { text });
  chatInput.value = '';
});

rematchBtn.addEventListener('click', () => {
  socket.emit('requestRematch');
  rematchBtn.disabled = true;
});

socket.on('rematchVote', ({ socketId }) => {
  const el = document.createElement('div');
  el.className = 'msg';
  el.textContent = `Player ${socketId} voted for rematch.`;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
});

socket.on('rematchStart', ({ board: newBoard, turn }) => {
  board = newBoard;
  currentTurn = turn;
  resultDiv.textContent = '';
  renderBoard();
  rematchBtn.disabled = true;
});

socket.on('opponentLeft', ({ leftId }) => {
  resultDiv.textContent = 'Opponent left. Game ended.';
  rematchBtn.disabled = true;
});

leaveBtn.addEventListener('click', () => {
  window.location.reload();
});

// helper: get our socket id into mark mapping after connect
socket.on('connect', () => {
  console.log('connected', socket.id);
});
