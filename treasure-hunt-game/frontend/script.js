// =================== DEBUG & SOCKET.IO ===================
console.log('[client] script.js loaded');

const socket = io();

socket.on('connect', () => console.log('[client] connected:', socket.id));
socket.on('connect_error', (err) => console.error('[client] connect_error', err));
socket.on('disconnect', (reason) => console.log('[client] disconnected:', reason));

// =================== GAME DATA ===================
const levels = [
  { guardian: "Gatekeeper Troll", question: "What has keys but can't open locks?", answer: "keyboard", hint: "You use it to type!" },
  { guardian: "Wizard of Puzzles", question: "What runs but never walks?", answer: "river", hint: "It flows but doesn’t walk!" },
  { guardian: "The Sphinx", question: "The more of this you take, the more you leave behind. What is it?", answer: "footsteps", hint: "You leave it as you walk." },
  { guardian: "Dragon of Knowledge", question: "I speak without a mouth and hear without ears. I have nobody, but I come alive with wind. What am I?", answer: "echo", hint: "You can hear it in mountains." }
];

let currentLevel = 0;
let score = 0;
let lives = 3;
let timer;
let timeLeft = 30;
let roomId = null;
let startTime = Date.now();

// =================== DOM ===================
const levelContainer = document.getElementById('level-container');
const guardianText = document.getElementById('guardian-text');
const hintBtn = document.getElementById('hint-btn');
const hintText = document.getElementById('hint-text');
const livesDisplay = document.getElementById('lives');
const scoreDisplay = document.getElementById('score');
const timerDisplay = document.getElementById('timer');
const secretRoomContainer = document.getElementById('secret-room-container');
const enterSecretBtn = document.getElementById('enter-secret-btn');
const winnerBox = document.getElementById("winner-announcement");
const winnerText = document.getElementById("winner-text");

// Overlay messages
const messageBox = document.createElement("div");
messageBox.id = "message-box";
Object.assign(messageBox.style, {
  position: "fixed",
  top: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  background: "rgba(0,0,0,0.7)",
  color: "#fff",
  padding: "10px 20px",
  borderRadius: "8px",
  zIndex: "1000",
  display: "none"
});
document.body.appendChild(messageBox);

function showMessage(msg, duration = 2000) {
  messageBox.innerText = msg;
  messageBox.style.display = "block";
  setTimeout(() => messageBox.style.display = "none", duration);
}

// Sounds
const correctSound = document.getElementById('correct-sound');
const wrongSound = document.getElementById('wrong-sound');
const levelUpSound = document.getElementById('levelup-sound');
const treasureSound = document.getElementById('treasure-sound');
const lifeLostSound = document.getElementById('life-lost-sound');
const victorySound = document.getElementById('victory-sound');

// =================== MULTIPLAYER ===================
socket.emit('join-match');

socket.on('waiting', msg => showMessage(msg, 3000));
socket.on('match-found', data => {
  roomId = data.roomId;
  showMessage("Match found! Get ready...", 3000);
});
socket.on('start-game', () => { startTime = Date.now(); resetGame(); showMessage("✅ Game Started!", 3000); });
socket.on('game-over', ({ scores, winner }) => showWinner(scores, winner));
socket.on('opponent-disconnected', data => { showMessage(data.message || "Opponent disconnected.", 4000); resetGame(); });

// =================== GAME LOGIC ===================
function loadLevel(level) {
  guardianText.innerText = `👑 ${levels[level].guardian} asks:`;
  levelContainer.innerHTML = `
    <h2>${levels[level].question}</h2>
    <input type="text" id="answer-input" placeholder="Enter your answer" />
    <button id="submit-btn">Submit</button>
  `;
  levelContainer.classList.remove("correct", "wrong");
  hintText.innerText = "";
  secretRoomContainer.classList.add('hidden');
  document.getElementById('submit-btn').addEventListener('click', checkAnswer);
  resetTimer();
}

function checkAnswer() {
  const ans = document.getElementById('answer-input').value.toLowerCase().trim();
  if (ans === levels[currentLevel].answer.toLowerCase()) {
    correctSound.play();
    score += hintText.innerText ? 50 : 100;
    updateHUD();
    levelContainer.classList.add("correct");
    triggerConfetti();
    currentLevel++;
    if (currentLevel < levels.length) {
      levelUpSound.play();
      setTimeout(() => { loadLevel(currentLevel); if (currentLevel === 2) secretRoomContainer.classList.remove('hidden'); }, 1000);
    } else victory();
  } else wrongAnswer();
}

function wrongAnswer() {
  wrongSound.play();
  lives--;
  updateLives();
  levelContainer.classList.add("wrong");
  lifeLostSound.play();
  if (lives <= 0) { showMessage("😢 You lost all lives! Restarting...", 3000); resetGame(); }
}

function resetGame() {
  clearInterval(timer);
  currentLevel = 0;
  score = 0;
  lives = 3;
  updateHUD();
  loadLevel(currentLevel);
  hintBtn.style.display = "block";
  winnerBox.classList.add("hidden");
}

function updateHUD() { updateLives(); scoreDisplay.innerText = `Score: ${score}`; }
function updateLives() { livesDisplay.innerHTML = "❤️ ".repeat(lives); }

function resetTimer() {
  clearInterval(timer);
  timeLeft = 30;
  updateTimerDisplay();
  timer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) { clearInterval(timer); wrongAnswer(); if (lives>0) loadLevel(currentLevel); }
  }, 1000);
}
function updateTimerDisplay() { timerDisplay.innerText = `${String(Math.floor(timeLeft/60)).padStart(2,'0')}:${String(timeLeft%60).padStart(2,'0')}`; }

// =================== HINT & SECRET ROOM ===================
hintBtn.addEventListener('click', () => { hintText.innerText = levels[currentLevel].hint; score=Math.max(0,score-50); updateHUD(); });
enterSecretBtn.addEventListener('click', () => { showMessage("🌟 Secret room! +100 points",3000); score+=100; updateHUD(); });

// =================== FINALE ===================
function victory() {
  clearInterval(timer);
  treasureSound.play(); victorySound.play();
  const totalTime = Math.floor((Date.now() - startTime)/1000);
  if (roomId) { socket.emit('level-complete', { roomId, time: totalTime }); levelContainer.innerHTML="<h2>Waiting for opponent...</h2>"; }
  else levelContainer.innerHTML=`<h2>🎉 You are the Riddle Master! 🎉</h2><img src="assets/images/treasure.png" class="treasure-animate"><button onclick="showLeaderboard()">View Leaderboard</button>`;
  hintBtn.style.display="none"; saveScore();
}

// =================== WINNER ===================
function showWinner(scores, winner) {
  const myScore = scores[socket.id] || 0;
  const oppScore = Object.entries(scores).find(([id])=>id!==socket.id)?.[1]||0;
  levelContainer.innerHTML=""; hintBtn.style.display="none";
  if(winner==="draw") winnerText.innerHTML=`🤝 Draw!<br>Your Score: ${myScore}<br>Opponent: ${oppScore}`;
  else if(winner===socket.id) winnerText.innerHTML=`🎉 You Win!<br>Your Score: ${myScore}<br>Opponent: ${oppScore}`;
  else winnerText.innerHTML=`😢 Opponent Wins!<br>Your Score: ${myScore}<br>Opponent: ${oppScore}`;
  winnerBox.classList.remove("hidden"); triggerConfetti();
}

// =================== LEADERBOARD ===================
function saveScore() { let leaderboard=JSON.parse(localStorage.getItem("leaderboard"))||[]; leaderboard.push(score); leaderboard.sort((a,b)=>b-a); leaderboard=leaderboard.slice(0,5); localStorage.setItem("leaderboard",JSON.stringify(leaderboard)); }
function showLeaderboard() { const list=document.getElementById("leaderboard-list"); list.innerHTML=""; const scores=JSON.parse(localStorage.getItem("leaderboard"))||[]; scores.forEach((s,i)=>{const li=document.createElement("li"); li.innerText=`#${i+1}: ${s} pts`; list.appendChild(li); }); winnerBox.classList.add("hidden"); document.getElementById("leaderboard").classList.remove("hidden"); }
function closeLeaderboard(){document.getElementById("leaderboard").classList.add("hidden");}

// =================== CONFETTI ===================
function triggerConfetti(){
  const duration=2000,end=Date.now()+duration;
  const colors=['#ff0','#f00','#0f0','#0ff','#f0f','#fff'];
  const canvas=document.getElementById('confetti-canvas');
  const ctx=canvas.getContext('2d');
  canvas.width=window.innerWidth; canvas.height=window.innerHeight;
  const confettis=Array.from({length:150},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height-canvas.height,r:Math.random()*6+4,color:colors[Math.floor(Math.random()*colors.length)],d:Math.random()*5+2}));
  function draw(){ ctx.clearRect(0,0,canvas.width,canvas.height); confettis.forEach(c=>{ctx.fillStyle=c.color;ctx.beginPath();ctx.arc(c.x,c.y,c.r,0,2*Math.PI);ctx.fill();c.y+=c.d;if(c.y>canvas.height)c.y=-10;}); }
  const interval=setInterval(()=>{ draw(); if(Date.now()>end){ clearInterval(interval); ctx.clearRect(0,0,canvas.width,canvas.height); } },20);
}

// =================== START ===================
updateHUD(); loadLevel(currentLevel);
