/* ═══════════════════════════════════════════════════
   BLOODY QUIZ — script.js  v5
   NEW: Difficulty · Lives · 50/50 · 3-2-1 Countdown
        Question slide-in · ABCD labels
        New Best highlight · Accuracy bar on end screen
   ═══════════════════════════════════════════════════ */

// ══════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════
let playerPosition  = 1;
let timer;
let timerBarAnim;
let timeLeft        = 10;
let timerDuration   = 10;   // set by difficulty
let penaltySteps    = 3;    // set by difficulty
let maxLives        = 3;    // set by difficulty
let lives           = 3;
let fiftyPending  = false;  // true = next question gets auto 50/50 + 15s timer
let currentQuestionIndex = 0;
let questions       = [];
let score           = 0;
let correctCount    = 0;
let totalAnswered   = 0;
let streak          = 0;
let bestStreak      = 0;
let playerName      = "Player";
let playerEmoji     = "🎮";
let playerGif       = "assets/mario.gif";
let playerColor     = "#e74c3c";
let isWin           = false;
let isPaused        = false;
let isHopping       = false;

// ── DOM refs ───────────────────────────────────────
const bgMusic         = document.getElementById("background-music");
const board           = document.getElementById("board");
const startBtn        = document.getElementById("start-btn");
const gameContainer   = document.getElementById("game-container");
const startScreen     = document.getElementById("start-screen");
const questionEl      = document.getElementById("question");
const optionsDiv      = document.getElementById("options");
const timerEl         = document.getElementById("timer");
const timerNumEl      = document.getElementById("timer-num");
const timerRowEl      = document.getElementById("timer-row");
const timerBarEl      = document.getElementById("timer-bar");
const endScreen       = document.getElementById("end-screen");
const pauseScreen     = document.getElementById("pause-screen");
const lbModal         = document.getElementById("leaderboard-modal");
const nameInput       = document.getElementById("player-name-input");
const playerDisplay   = document.getElementById("player-display-name");
const playerEmojiEl   = document.getElementById("player-emoji");
const statName        = document.getElementById("stat-name");
const statEmoji       = document.getElementById("stat-emoji");
const statCell        = document.getElementById("stat-cell");
const statScoreVal    = document.getElementById("stat-score-val");
const statStreakVal   = document.getElementById("stat-streak-val");
const crackOverlay    = document.getElementById("crack-overlay");
const categoryBadge   = document.getElementById("category-badge");
const streakBanner    = document.getElementById("streak-banner");
const streakRewardToast = document.getElementById("streak-reward-toast");
const livesDisplay    = document.getElementById("lives-display");
const countdownOverlay = document.getElementById("countdown-overlay");
const countdownNumber  = document.getElementById("countdown-number");

// ══════════════════════════════════════════════════
// AUDIO ENGINE
// ══════════════════════════════════════════════════
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function playTone(freq, type, duration, volume = 0.3, delay = 0) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration);
  } catch(e) {}
}
const SFX = {
  correct()    { playTone(523,'sine',.12,.3); playTone(659,'sine',.12,.3,.1); playTone(784,'sine',.2,.3,.2); },
  wrong()      { playTone(220,'sawtooth',.15,.35); playTone(180,'sawtooth',.2,.3,.15); },
  tick()       { playTone(880,'square',.04,.1); },
  urgentTick() { playTone(1100,'square',.06,.18); },
  win()        { [523,659,784,1047].forEach((f,i) => playTone(f,'sine',.25,.35,i*.12)); },
  lose()       { [300,250,200,150].forEach((f,i) => playTone(f,'sawtooth',.2,.3,i*.12)); },
  hop()        { playTone(440,'sine',.06,.15); },
  click()      { playTone(600,'sine',.06,.12); },
  streak()     { playTone(880,'sine',.08,.25); playTone(1100,'sine',.1,.25,.08); },
  countdown()  { playTone(660,'sine',.15,.4); },
  go()         { playTone(880,'sine',.08,.4); playTone(1100,'sine',.15,.4,.08); },
  loseLife()   { playTone(300,'sawtooth',.2,.4); },
  fiftyFifty() { playTone(700,'sine',.08,.25); playTone(900,'sine',.1,.25,.1); }
};

// ══════════════════════════════════════════════════
// BOARD SETUP
// ══════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════
// DIFFICULTY SELECTOR
// ══════════════════════════════════════════════════
const DIFF_CLASSES = ['easy','medium','hard'];
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => {
      b.classList.remove('active', ...DIFF_CLASSES);
    });
    btn.classList.add('active');
    // colour class based on title
    const t = btn.title.toLowerCase();
    if (t === 'easy')   btn.classList.add('easy');
    if (t === 'medium') btn.classList.add('medium');
    if (t === 'hard')   btn.classList.add('hard');
    SFX.click();
  });
  // Set initial active colour
  if (btn.classList.contains('active')) btn.classList.add('medium');
});

function getDiffSettings() {
  const active = document.querySelector('.diff-btn.active');
  return {
    time:    parseInt(active?.dataset.time    || 10),
    lives:   parseInt(active?.dataset.lives   || 3),
    penalty: parseInt(active?.dataset.penalty || 3),
  };
}

// ══════════════════════════════════════════════════
// CHARACTER SELECT
// ══════════════════════════════════════════════════
document.querySelectorAll('.char-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    playerGif   = btn.dataset.gif   || "";
    playerEmoji = btn.dataset.emoji || "🎮";
    playerColor = btn.dataset.color || "#e74c3c";
    updatePlayerBadge();
    SFX.click();
  });
});
nameInput.addEventListener('input', updatePlayerBadge);
function updatePlayerBadge() {
  playerDisplay.textContent = nameInput.value.trim() || "Player";
  playerEmojiEl.textContent = playerEmoji;
}

// ══════════════════════════════════════════════════
// LOAD QUESTIONS
// ══════════════════════════════════════════════════
async function loadQuestions() {
  try {
    const res = await fetch("questions.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    questions = await res.json();
    questions.sort(() => Math.random() - 0.5);
  } catch(err) {
    console.error("Error loading questions:", err);
    questionEl.innerText = "⚠️ Failed to load questions!";
  }
}

// ══════════════════════════════════════════════════
// START GAME
// ══════════════════════════════════════════════════
startBtn.addEventListener("click", async () => {
  SFX.click();
  playerName  = nameInput.value.trim() || "Player";
  playerEmoji = document.querySelector('.char-btn.active')?.dataset.emoji || "🎮";
  playerGif   = document.querySelector('.char-btn.active')?.dataset.gif   || "";
  playerColor = document.querySelector('.char-btn.active')?.dataset.color || "#e74c3c";

  const diff  = getDiffSettings();
  timerDuration = diff.time;
  maxLives      = diff.lives;
  penaltySteps  = diff.penalty;

  startScreen.style.display = "none";
  gameContainer.style.display = "flex";
  document.getElementById("header-actions").style.visibility = "visible";
  bgMusic.play().catch(() => {});

  await loadQuestions();
  if (questions.length > 0) {
    resetGame();
    startCountdown(() => loadQuestion());
  }
});

// ══════════════════════════════════════════════════
// 3-2-1 COUNTDOWN
// ══════════════════════════════════════════════════
function startCountdown(onDone) {
  const steps = ['3','2','1','GO!'];
  let i = 0;
  countdownOverlay.style.display = "flex";

  function showStep() {
    countdownNumber.textContent = steps[i];
    // Re-trigger pop animation
    countdownNumber.style.animation = 'none';
    void countdownNumber.offsetWidth;
    countdownNumber.style.animation = '';

    if (steps[i] === 'GO!') {
      SFX.go();
      setTimeout(() => {
        countdownOverlay.style.display = "none";
        onDone();
      }, 700);
    } else {
      SFX.countdown();
      i++;
      setTimeout(showStep, 900);
    }
  }
  showStep();
}

// ══════════════════════════════════════════════════
// RESET
// ══════════════════════════════════════════════════
function resetGame() {
  playerPosition = 1; currentQuestionIndex = 0;
  score = 0; correctCount = 0; totalAnswered = 0;
  streak = 0; bestStreak = 0; isWin = false;
  isPaused = false; isHopping = false;
  lives = maxLives; fiftyPending = false;

  clearInterval(timer); cancelAnimationFrame(timerBarAnim);
  updateBoardInstant();
  updateStats();
  updateLivesDisplay();

  timerEl.innerText = "Time Left:";
  timerNumEl.textContent = timerDuration;
  timerRowEl.classList.remove("urgent");
  timerBarEl.style.width = "100%";
  timerBarEl.classList.remove("urgent");
  questionEl.innerText = "";
  optionsDiv.innerHTML = "";
  categoryBadge.style.display = "none";
  streakBanner.style.display = "none";
  if (streakRewardToast) streakRewardToast.style.display = "none";
}

// ══════════════════════════════════════════════════
// LIVES DISPLAY
// ══════════════════════════════════════════════════
function updateLivesDisplay() {
  const full  = '❤️';
  const empty = '🖤';
  livesDisplay.textContent = full.repeat(lives) + empty.repeat(Math.max(0, maxLives - lives));
}

// (50/50 is now fully automatic — no button needed)

function loseLife() {
  lives--;
  SFX.loseLife();
  // Animate the hearts
  livesDisplay.classList.remove('heart-lose');
  void livesDisplay.offsetWidth;
  livesDisplay.classList.add('heart-lose');
  livesDisplay.addEventListener('animationend', () => livesDisplay.classList.remove('heart-lose'), { once: true });
  updateLivesDisplay();
  if (lives <= 0) {
    setTimeout(() => endGame(false), 800);
    return true; // game over
  }
  return false;
}

// ══════════════════════════════════════════════════
// STATS BAR
// ══════════════════════════════════════════════════
function updateStats() {
  statName.textContent      = playerName;
  statEmoji.textContent     = playerEmoji;
  statCell.textContent      = playerPosition;
  statScoreVal.textContent  = score;
  statStreakVal.textContent  = streak;
  const qEl = document.getElementById("stat-q-val");
  if (qEl) qEl.textContent = currentQuestionIndex + 1;
}

// ══════════════════════════════════════════════════
// CATEGORY BADGE
// ══════════════════════════════════════════════════
const CAT_META = {
  science:   { label:'🔬 Science',   cls:'cat-science'   },
  history:   { label:'📜 History',   cls:'cat-history'   },
  sports:    { label:'⚽ Sports',    cls:'cat-sports'    },
  geography: { label:'🌍 Geography', cls:'cat-geography' },
  math:      { label:'➕ Math',      cls:'cat-math'      },
  general:   { label:'💡 General',   cls:''              },
};
function showCategoryBadge(cat) {
  if (!cat) { categoryBadge.style.display = 'none'; return; }
  const meta = CAT_META[cat.toLowerCase()] || { label:'💡 '+cat, cls:'' };
  categoryBadge.className = 'category-badge ' + meta.cls;
  categoryBadge.textContent = meta.label;
  categoryBadge.style.display = 'inline-block';
  void categoryBadge.offsetWidth;
  categoryBadge.style.animation = 'none';
  requestAnimationFrame(() => { categoryBadge.style.animation = ''; });
}

// ══════════════════════════════════════════════════
// LOAD QUESTION
// ══════════════════════════════════════════════════
const LABELS = ['A','B','C','D'];

function loadQuestion() {
  if (isPaused) return;
  if (currentQuestionIndex >= questions.length) { endGame(false); return; }

  const q = questions[currentQuestionIndex];
  showCategoryBadge(q.category || null);

  // Slide-in animation for question text
  questionEl.classList.remove('slide-in');
  void questionEl.offsetWidth;
  questionEl.classList.add('slide-in');
  questionEl.innerText = q.question;

  optionsDiv.innerHTML = "";
  streakBanner.style.display = "none";

  q.options.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.classList.add("option");
    // ABCD label
    const label = document.createElement("span");
    label.classList.add("option-label");
    label.textContent = LABELS[i] + ".";
    btn.appendChild(label);
    btn.appendChild(document.createTextNode(opt));
    btn.dataset.answer = opt;
    btn.onclick = () => checkAnswer(opt, q.correct, btn);
    optionsDiv.appendChild(btn);
  });

  // Auto 50/50: if fiftyPending, eliminate 2 wrong options immediately
  const bonusTimer = fiftyPending;
  if (fiftyPending) {
    fiftyPending = false;
    setTimeout(() => {
      const allBtns   = Array.from(optionsDiv.querySelectorAll('.option'));
      const wrongBtns = allBtns.filter(b => b.dataset.answer !== q.correct);
      wrongBtns.sort(() => Math.random() - 0.5).slice(0, 2).forEach(b => {
        b.classList.add('eliminated');
        b.disabled = true;
      });
    }, 50);
  }

  startTimer(bonusTimer ? 15 : null);
}

// ══════════════════════════════════════════════════
// TIMER + PROGRESS BAR
// ══════════════════════════════════════════════════
function startTimer(overrideDuration) {
  const dur = overrideDuration || timerDuration;
  timeLeft = dur;
  timerEl.innerText = "Time Left:";
  timerNumEl.textContent = timeLeft;
  timerRowEl.classList.remove("urgent");
  timerBarEl.classList.remove("urgent");
  timerBarEl.style.transition = "none";
  timerBarEl.style.width = "100%";

  clearInterval(timer);
  requestAnimationFrame(() => {
    timerBarEl.style.transition = `width ${dur}s linear`;
    timerBarEl.style.width = "0%";
  });

  const urgentAt = Math.min(3, Math.floor(dur * 0.3));

  timer = setInterval(() => {
    if (isPaused) return;
    timeLeft--;
    timerNumEl.textContent = timeLeft;

    if (timeLeft <= urgentAt) {
      timerRowEl.classList.add("urgent");
      timerBarEl.classList.add("urgent");
      SFX.urgentTick();
    } else {
      SFX.tick();
    }

    if (timeLeft <= 0) {
      clearInterval(timer);
      timerRowEl.classList.remove("urgent");
      timerBarEl.classList.remove("urgent");
      totalAnswered++;
      streak = 0;
      updateStats();
      Array.from(optionsDiv.children).forEach(b => b.disabled = true);
      const gameOver = loseLife();
      if (gameOver) return;
      const penaltyTarget = Math.max(1, playerPosition - penaltySteps);
      questionEl.innerHTML = `<span class="feedback feedback--wrong">⏰ Time's Up! Back ${penaltySteps} steps! 😱</span>`;
      SFX.wrong(); triggerCrack();
      setTimeout(() => {
        hopToCell(playerPosition, penaltyTarget, () => {
          playerPosition = penaltyTarget;
          updateStats();
          setTimeout(() => { currentQuestionIndex++; loadQuestion(); }, 400);
        });
      }, 600);
    }
  }, 1000);
}

function pauseTimerBar() {
  const computed = getComputedStyle(timerBarEl).width;
  timerBarEl.style.transition = "none";
  timerBarEl.style.width = computed;
}
function resumeTimerBar() {
  timerBarEl.style.transition = `width ${timeLeft}s linear`;
  timerBarEl.style.width = "0%";
}

// ══════════════════════════════════════════════════
// CHECK ANSWER
// ══════════════════════════════════════════════════
function checkAnswer(selected, correct, btn) {
  if (isHopping) return;
  clearInterval(timer);
  timerRowEl.classList.remove("urgent");
  timerBarEl.classList.remove("urgent");
  timerBarEl.style.transition = "none";
  Array.from(optionsDiv.children).forEach(b => b.disabled = true);
  totalAnswered++;

  if (selected === correct) {
    btn.classList.add("correct");
    correctCount++;
    streak++;
    if (streak > bestStreak) bestStreak = streak;

    const points = timeLeft * 10 + (streak > 1 ? streak * 5 : 0);
    score += points;
    const bonusText = streak > 1 ? ` 🔥 x${streak} combo! +${streak*5}` : '';
    questionEl.innerHTML = `<span class="feedback feedback--correct">✅ Correct! +${timeLeft*10} pts${bonusText}</span>`;
    SFX.correct();

    // Every 3rd streak (3, 6, 9, 12...): grant auto 50/50 + 15s for NEXT question
    if (streak % 3 === 0) {
      fiftyPending = true;
      showStreakRewardToast();
    }
    if (streak >= 3) showStreakBanner(streak);
    updateStats();

    const target = Math.min(playerPosition + timeLeft, 100);
    hopToCell(playerPosition, target, () => {
      playerPosition = target;
      updateStats();
      if (playerPosition >= 100) { endGame(true); return; }
      currentQuestionIndex++;
      loadQuestion();
    });

  } else {
    btn.classList.add("wrong");
    streak = 0;
    Array.from(optionsDiv.children).forEach(b => { if (b.dataset.answer === correct) b.classList.add("correct"); });
    SFX.wrong(); triggerCrack(); updateStats();

    const gameOver = loseLife();
    if (gameOver) {
      questionEl.innerHTML = `<span class="feedback feedback--wrong">❌ Wrong! Answer: <em>${correct}</em></span>`;
      return;
    }

    const target = Math.max(1, playerPosition - penaltySteps);
    questionEl.innerHTML = `<span class="feedback feedback--wrong">❌ Wrong! Answer: <em>${correct}</em> — Back ${penaltySteps} steps! 😱</span>`;
    setTimeout(() => {
      hopToCell(playerPosition, target, () => {
        playerPosition = target;
        updateStats();
        setTimeout(() => { currentQuestionIndex++; loadQuestion(); }, 400);
      });
    }, 700);
  }
}

// ══════════════════════════════════════════════════
// HOP-BY-HOP MOVEMENT
// ══════════════════════════════════════════════════
function hopToCell(from, to, onComplete) {
  if (from === to) { updateBoardInstant(); if (onComplete) onComplete(); return; }
  isHopping = true;
  const step = from < to ? 1 : -1;
  let current = from;

  function doHop() {
    current += step;
    placePlayerAt(current);
    SFX.hop();
    const cell = document.getElementById(`cell-${current}`);
    if (cell) {
      cell.classList.remove('flash-land');
      void cell.offsetWidth;
      cell.classList.add('flash-land');
      cell.addEventListener('animationend', () => cell.classList.remove('flash-land'), { once: true });
    }
    if (current !== to) {
      setTimeout(doHop, 120);
    } else {
      isHopping = false;
      if (onComplete) setTimeout(onComplete, 200);
    }
  }
  doHop();
}

// ══════════════════════════════════════════════════
// BOARD RENDER
// ══════════════════════════════════════════════════
function placePlayerAt(pos) {
  document.querySelectorAll(".player").forEach(el => el.remove());
  const piece = document.createElement("div");
  piece.classList.add("player", "hopping");
  piece.addEventListener('animationend', () => piece.classList.remove('hopping'), { once: true });
  applyPieceStyle(piece);
  const cell = document.getElementById(`cell-${pos}`);
  if (cell) cell.appendChild(piece);
}
function updateBoardInstant() {
  document.querySelectorAll(".player").forEach(el => el.remove());
  const piece = document.createElement("div");
  piece.classList.add("player");
  applyPieceStyle(piece);
  const cell = document.getElementById(`cell-${playerPosition}`);
  if (cell) cell.appendChild(piece);
}
function applyPieceStyle(piece) {
  if (playerGif) {
    const img = new Image();
    img.src = playerGif;
    img.onload  = () => { piece.style.backgroundImage = `url('${playerGif}')`; };
    img.onerror = () => { renderEmojiPiece(piece); };
    piece.style.backgroundImage = `url('${playerGif}')`;
  } else {
    renderEmojiPiece(piece);
  }
}
function renderEmojiPiece(piece) {
  piece.style.backgroundImage = "none";
  piece.style.background = `radial-gradient(circle at 35% 35%, ${playerColor}cc, ${playerColor}88)`;
  piece.style.display = "flex"; piece.style.alignItems = "center";
  piece.style.justifyContent = "center"; piece.style.fontSize = "18px";
  piece.style.lineHeight = "1"; piece.textContent = playerEmoji;
}
updateBoardInstant();

// ══════════════════════════════════════════════════
// STREAK FIRE BANNER
// ══════════════════════════════════════════════════
function showStreakBanner(n) {
  const fires = '🔥'.repeat(Math.min(n, 6));
  streakBanner.innerHTML = `<span class="fire">${fires}</span> ${n} IN A ROW! +${n*5} BONUS <span class="fire">${fires}</span>`;
  streakBanner.style.display = "block";
  void streakBanner.offsetWidth;
  streakBanner.style.animation = 'none';
  requestAnimationFrame(() => { streakBanner.style.animation = ''; });
  SFX.streak();
  setTimeout(() => { streakBanner.style.display = "none"; }, 2200);
}

// ══════════════════════════════════════════════════
// STREAK REWARD TOAST (streak=3 auto reward)
// ══════════════════════════════════════════════════
function showStreakRewardToast() {
  streakRewardToast.innerHTML =
    `<span class="spin">💡</span> 3 STREAK BONUS! Next question: 50/50 + 15 seconds <span class="spin">⏱</span>`;
  streakRewardToast.style.display = "block";
  void streakRewardToast.offsetWidth;
  streakRewardToast.style.animation = 'none';
  requestAnimationFrame(() => { streakRewardToast.style.animation = ''; });
  SFX.fiftyFifty();
  setTimeout(() => { streakRewardToast.style.display = "none"; }, 3000);
}

// ══════════════════════════════════════════════════
// CRACK OVERLAY
// ══════════════════════════════════════════════════
function triggerCrack() {
  crackOverlay.classList.remove('active');
  void crackOverlay.offsetWidth;
  crackOverlay.classList.add('active');
  crackOverlay.addEventListener('animationend', () => crackOverlay.classList.remove('active'), { once: true });
  try { navigator.vibrate && navigator.vibrate([100, 50, 100]); } catch(e) {}
}

// ══════════════════════════════════════════════════
// PAUSE
// ══════════════════════════════════════════════════
function pauseGame() {
  if (isPaused) return;
  isPaused = true;
  clearInterval(timer);
  pauseTimerBar();
  bgMusic.pause();
  pauseScreen.style.display = "flex";
}
function resumeGame() {
  if (!isPaused) return;
  isPaused = false;
  pauseScreen.style.display = "none";
  bgMusic.play().catch(() => {});
  resumeTimerBar();
  const urgentAt = Math.min(3, Math.floor(timerDuration * 0.3));
  timer = setInterval(() => {
    if (isPaused) return;
    timeLeft--;
    timerNumEl.textContent = timeLeft;
    if (timeLeft <= urgentAt) { timerRowEl.classList.add("urgent"); timerBarEl.classList.add("urgent"); SFX.urgentTick(); }
    else SFX.tick();
    if (timeLeft <= 0) {
      clearInterval(timer);
      timerRowEl.classList.remove("urgent"); timerBarEl.classList.remove("urgent");
      totalAnswered++; streak = 0; updateStats();
      Array.from(optionsDiv.children).forEach(b => b.disabled = true);
      const gameOver = loseLife();
      if (gameOver) return;
      const penaltyTarget = Math.max(1, playerPosition - penaltySteps);
      questionEl.innerHTML = `<span class="feedback feedback--wrong">⏰ Time's Up! Back ${penaltySteps} steps! 😱</span>`;
      SFX.wrong(); triggerCrack();
      setTimeout(() => {
        hopToCell(playerPosition, penaltyTarget, () => {
          playerPosition = penaltyTarget;
          updateStats();
          setTimeout(() => { currentQuestionIndex++; loadQuestion(); }, 400);
        });
      }, 600);
    }
  }, 1000);
}
document.getElementById("pause-btn").addEventListener("click",        () => { SFX.click(); pauseGame(); });
document.getElementById("resume-btn").addEventListener("click",       () => { SFX.click(); resumeGame(); });
document.getElementById("pause-restart-btn").addEventListener("click",() => { SFX.click(); goToStartScreen(); });

// ══════════════════════════════════════════════════
// END GAME
// ══════════════════════════════════════════════════
function endGame(win) {
  isWin = win;
  clearInterval(timer);
  timerRowEl.classList.remove("urgent"); timerBarEl.classList.remove("urgent");
  bgMusic.pause();

  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  // Check new best BEFORE saving
  const prevBest = loadScores()[0]?.score || 0;
  const isNewBest = score > prevBest;
  saveScore({ name: playerName, emoji: playerEmoji, score, correct: correctCount, accuracy, bestStreak });

  document.getElementById("end-score").textContent       = score;
  document.getElementById("end-correct").textContent     = correctCount;
  document.getElementById("end-accuracy").textContent    = accuracy + "%";
  document.getElementById("end-best-streak").textContent = bestStreak;

  // Accuracy bar
  const pctEl  = document.getElementById("accuracy-bar-pct");
  const fillEl = document.getElementById("accuracy-bar-fill");
  pctEl.textContent = accuracy + "%";
  fillEl.style.width = "0%";
  setTimeout(() => { fillEl.style.width = accuracy + "%"; }, 300);
  // Colour the bar by performance
  if (accuracy >= 80) fillEl.style.background = "linear-gradient(90deg,var(--neon-cyan),var(--neon-green))";
  else if (accuracy >= 50) fillEl.style.background = "linear-gradient(90deg,var(--gold),var(--orange))";
  else fillEl.style.background = "linear-gradient(90deg,var(--blood),var(--gore))";

  // New best badge
  const newBestBadge = document.getElementById("new-best-badge");
  newBestBadge.style.display = (isNewBest && score > 0) ? "block" : "none";

  const titleEl = document.getElementById("end-title");
  const subEl   = document.getElementById("end-subtitle");
  const trEl    = document.getElementById("end-trophy");

  if (win) {
    titleEl.textContent = "YOU WIN!"; titleEl.classList.remove("loss");
    subEl.textContent   = score > 500 ? "Absolutely legendary! 🔥" : "Well played, champion!";
    trEl.textContent    = "🏆"; SFX.win(); startConfetti();
  } else {
    titleEl.textContent = lives <= 0 ? "NO LIVES LEFT!" : "GAME OVER";
    titleEl.classList.add("loss");
    subEl.textContent   = "Better luck next time, warrior.";
    trEl.textContent    = "💀"; SFX.lose();
  }

  endScreen.style.display = "flex";
  document.getElementById("end-restart-btn").onclick     = () => { SFX.click(); goToStartScreen(); };
  document.getElementById("end-leaderboard-btn").onclick = () => { SFX.click(); openLeaderboard(); };
}

// ══════════════════════════════════════════════════
// CONFETTI
// ══════════════════════════════════════════════════
let confettiAnim = null;
const CONF_COLORS = ['#f5c518','#c0392b','#00f5ff','#ff00cc','#00ff88','#ff4444','#fff'];
function startConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  const ctx    = canvas.getContext("2d");
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const particles = Array.from({length:160}, () => ({
    x:Math.random()*canvas.width, y:Math.random()*canvas.height - canvas.height,
    w:Math.random()*10+5, h:Math.random()*6+3,
    color:CONF_COLORS[Math.floor(Math.random()*CONF_COLORS.length)],
    rot:Math.random()*Math.PI*2, vx:(Math.random()-.5)*3, vy:Math.random()*3+2,
    vr:(Math.random()-.5)*.15, opacity:Math.random()*.5+.5,
  }));
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      ctx.save(); ctx.globalAlpha=p.opacity;
      ctx.translate(p.x+p.w/2, p.y+p.h/2); ctx.rotate(p.rot);
      ctx.fillStyle=p.color; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
      if(p.y>canvas.height){p.y=-p.h; p.x=Math.random()*canvas.width;}
    });
    confettiAnim = requestAnimationFrame(draw);
  }
  draw();
}
function stopConfetti() {
  if (confettiAnim) { cancelAnimationFrame(confettiAnim); confettiAnim=null; }
  const c = document.getElementById("confetti-canvas");
  c.getContext("2d").clearRect(0,0,c.width,c.height);
}

// ══════════════════════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════════════════════
const LS_KEY = "bloodyquiz_scores";
function loadScores() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; } catch { return []; } }
function saveScore(entry) {
  const scores = loadScores();
  scores.push({...entry, date: new Date().toLocaleDateString()});
  scores.sort((a,b) => b.score-a.score);
  localStorage.setItem(LS_KEY, JSON.stringify(scores.slice(0,10)));
}
function renderLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  const scores = loadScores();
  list.innerHTML = "";
  if (!scores.length) { list.innerHTML = `<p class="lb-empty">No scores yet — be the first! 🩸</p>`; return; }
  scores.forEach((s,i) => {
    const row = document.createElement("div"); row.classList.add("lb-row");
    row.style.animationDelay = `${i*.06}s`;
    const rc = i===0?'gold':i===1?'silver':i===2?'bronze':'';
    const md = i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`;
    row.innerHTML = `<span class="lb-rank ${rc}">${md}</span><span class="lb-name">${s.emoji||''} ${s.name}</span><span class="lb-score">${s.score} pts</span>`;
    list.appendChild(row);
  });
}
function openLeaderboard() { renderLeaderboard(); lbModal.style.display = "flex"; }
document.getElementById("leaderboard-btn").addEventListener("click",  () => { SFX.click(); openLeaderboard(); });
document.getElementById("modal-close").addEventListener("click",      () => { SFX.click(); lbModal.style.display="none"; });
document.getElementById("modal-backdrop").addEventListener("click",   () => { lbModal.style.display="none"; });
document.getElementById("clear-scores-btn").addEventListener("click", () => { SFX.click(); localStorage.removeItem(LS_KEY); renderLeaderboard(); });

// ══════════════════════════════════════════════════
// GO TO START SCREEN
// ══════════════════════════════════════════════════
function goToStartScreen() {
  endScreen.style.display    = "none";
  pauseScreen.style.display  = "none";
  gameContainer.style.display = "none";
  countdownOverlay.style.display = "none";
  stopConfetti();
  clearInterval(timer);
  isPaused = false; isHopping = false;
  bgMusic.pause(); bgMusic.currentTime = 0;
  document.getElementById("header-actions").style.visibility = "hidden";
  startScreen.style.display = "flex";
  playerPosition = 1;
  updateBoardInstant();
}

// ══════════════════════════════════════════════════
// IN-GAME RESTART
// ══════════════════════════════════════════════════
document.getElementById("in-game-restart-btn").addEventListener("click", () => {
  SFX.click();
  const existing = document.getElementById("restart-confirm");
  if (existing) { existing.remove(); return; }
  const banner = document.createElement("div");
  banner.id = "restart-confirm";
  banner.innerHTML = `<span style="flex:1;text-align:left;font-size:.85rem;color:var(--text)">Restart game?</span>
    <button id="confirm-yes" class="btn-blood" style="padding:6px 18px;font-size:1rem;">Yes</button>
    <button id="confirm-no"  class="btn-ghost" style="padding:6px 14px;font-size:1rem;">No</button>`;
  banner.style.cssText = `display:flex;align-items:center;gap:10px;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--surface2);border:1px solid var(--border-hot);border-radius:12px;padding:12px 20px;z-index:500;box-shadow:var(--glow-blood),0 8px 32px rgba(0,0,0,.6);animation:feedbackPop .25s cubic-bezier(.22,.68,0,1.3) both;min-width:280px;`;
  document.body.appendChild(banner);
  document.getElementById("confirm-yes").onclick = () => { SFX.click(); banner.remove(); goToStartScreen(); };
  document.getElementById("confirm-no").onclick  = () => { SFX.click(); banner.remove(); };
});

// ══════════════════════════════════════════════════
// SOUND TOGGLE
// ══════════════════════════════════════════════════
window.addEventListener("load", () => {
  const toggle = document.getElementById("sound-toggle");
  const icon   = document.getElementById("sound-icon");
  let muted = false;
  toggle.addEventListener("click", () => {
    muted = !muted;
    bgMusic.muted = muted;
    if (icon) icon.src = muted ? "assets/mute.png" : "assets/speaker.png";
    else toggle.textContent = muted ? '🔇' : '🔊';
  });
});