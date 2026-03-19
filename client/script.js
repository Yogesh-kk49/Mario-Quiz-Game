let playerPosition = 1;
let timer;
let timeLeft = 10;
let currentQuestionIndex = 0;
let questions = [];

let playerGif = "assets/mario.gif";
const testImg = new Image();
testImg.src = playerGif;
testImg.onerror = () => { playerGif = ""; };

const bgMusic = document.getElementById("background-music");
const board = document.getElementById("board");
const startBtn = document.getElementById("start-btn");
const gameContainer = document.getElementById("game-container");
const startScreen = document.getElementById("start-screen");
const questionEl = document.getElementById("question");
const optionsDiv = document.getElementById("options");
const timerEl = document.getElementById("timer");

// Create board
for (let i = 1; i <= 100; i++) {
  const cell = document.createElement("div");
  cell.classList.add("cell");
  cell.id = `cell-${i}`;
  const num = document.createElement("span");
  num.classList.add("cell-number");
  num.innerText = i;
  cell.appendChild(num);
  board.appendChild(cell);
}

// Load questions
async function loadQuestions() {
  try {
    const res = await fetch("questions.json");
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    questions = await res.json();
    questions.sort(() => Math.random() - 0.5);
  } catch (err) {
    console.error("Error loading questions:", err);
    questionEl.innerText = "⚠️ Failed to load questions!";
  }
}

// Start game
startBtn.addEventListener("click", async () => {
  startScreen.style.display = "none";
  gameContainer.style.display = "flex";
  await loadQuestions();
  if (questions.length > 0) {
    resetGame();
    loadQuestion();
  }
});

// Reset
function resetGame() {
  playerPosition = 1;
  currentQuestionIndex = 0;
  clearInterval(timer);
  updateBoard();
  timerEl.innerText = "";
  questionEl.innerText = "Game Started!";
  optionsDiv.innerHTML = "";
}

// Load question
function loadQuestion() {
  if (currentQuestionIndex >= questions.length) {
    endGame("No more questions! Game Over.");
    return;
  }
  const q = questions[currentQuestionIndex];
  questionEl.innerText = q.question;
  optionsDiv.innerHTML = "";
  q.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.classList.add("option");
    btn.innerText = opt;
    btn.onclick = () => checkAnswer(opt, q.correct, btn);
    optionsDiv.appendChild(btn);
  });
  startTimer();
}

// Timer
function startTimer() {
  timeLeft = 10;
  timerEl.innerText = `Time Left: ${timeLeft}`;
  clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    timerEl.innerText = `Time Left: ${timeLeft}`;
    if (timeLeft <= 0) {
      clearInterval(timer);
      currentQuestionIndex++;
      loadQuestion();
    }
  }, 1000);
}

// Check answer
function checkAnswer(selected, correct, btn) {
  clearInterval(timer);

  if (selected === correct) {
    btn.classList.add("correct");
    playerPosition += timeLeft;
    if (playerPosition >= 100) {
      playerPosition = 100;
      updateBoard();
      endGame("🎉 You Win!");
      return;
    }
    setTimeout(() => {
      currentQuestionIndex++;
      updateBoard();
      loadQuestion();
    }, 1000);
  } else {
    questionEl.innerText = "❌ Wrong Answer!";
    if (btn) btn.classList.add("wrong");
    Array.from(optionsDiv.children).forEach((button) => {
      if (button.innerText === correct) button.classList.add("correct");
    });
    setTimeout(() => {
      currentQuestionIndex++;
      loadQuestion();
    }, 1500);
  }
}

// End game
function endGame(msg) {
  optionsDiv.innerHTML = "";
  questionEl.innerText = msg;
  timerEl.innerText = "";
  const restart = document.createElement("button");
  restart.innerText = "🔄 Restart Game";
  restart.onclick = () => { resetGame(); loadQuestion(); };
  optionsDiv.appendChild(restart);
  bgMusic.pause();
}

// Update board
function updateBoard() {
  document.querySelectorAll(".player").forEach((el) => el.remove());
  const piece = document.createElement("div");
  piece.classList.add("player");
  if (playerGif) {
    piece.style.backgroundImage = `url('${playerGif}')`;
  } else {
    piece.style.backgroundColor = "red";
  }
  piece.style.width = "30px";
  piece.style.height = "30px";
  document.getElementById(`cell-${playerPosition}`).appendChild(piece);
}
updateBoard();

// Board numbers style
const style = document.createElement("style");
style.innerHTML = `
  .cell { position: relative; }
  .cell-number {
    position: absolute;
    top: 2px;
    right: 4px;
    font-size: x-small;
    font-weight: bold;
    color: white;
  }
`;
document.head.appendChild(style);

// Music toggle
window.addEventListener("load", () => {
  const toggle = document.getElementById("sound-toggle");
  const icon = document.getElementById("sound-icon");
  toggle.addEventListener("click", () => {
    if (bgMusic.paused) {
      bgMusic.play();
      icon.src = "assets/speaker.png";
    } else {
      bgMusic.pause();
      icon.src = "assets/mute.png";
    }
  });
});
