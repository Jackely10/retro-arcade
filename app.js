const yearNode = document.querySelector("#year");

if (yearNode) {
  yearNode.textContent = String(new Date().getFullYear());
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const arcadeI18n = window.arcadeI18n || null;

function t(key, variables, fallback) {
  if (arcadeI18n && typeof arcadeI18n.t === "function") {
    return arcadeI18n.t(key, variables, fallback || key);
  }
  return String(fallback || key).replace(/\{(\w+)\}/g, function (_, name) {
    if (!variables || !(name in variables)) {
      return "";
    }
    return String(variables[name]);
  });
}

function mapArcadeServerMessage(message) {
  if (!message) {
    return "";
  }
  if (arcadeI18n && typeof arcadeI18n.mapServerMessage === "function") {
    return arcadeI18n.mapServerMessage(message);
  }
  return message;
}

function registerArcadeUiRefresh(listener) {
  if (arcadeI18n && typeof arcadeI18n.registerRefresh === "function") {
    arcadeI18n.registerRefresh(listener);
  }
}

const arcadeStorageKeys = {
  snakeScore: "retroArcade.snake.highScore",
  memoryBestMoves: "retroArcade.memory.bestMoves",
  profileName: "retroArcade.profile.name",
  soundEnabled: "retroArcade.audio.enabled",
  stats: "retroArcade.stats.v1",
  legacyPongName: "retroArcadePongName",
};

function normalizeArcadeProfileName(value) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18);
}

function readStoredNumber(key) {
  try {
    const rawValue = window.localStorage.getItem(key);
    if (rawValue === null) {
      return null;
    }

    const parsedValue = Number(rawValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  } catch (error) {
    return null;
  }
}

function readStoredString(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function readStoredJson(key) {
  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) {
      return null;
    }
    return JSON.parse(rawValue);
  } catch (error) {
    return null;
  }
}

function writeStoredNumber(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
    return true;
  } catch (error) {
    return false;
  }
}

function writeStoredString(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    return false;
  }
}

function writeStoredJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

function removeStoredKey(key) {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    return false;
  }
}

function getSnakeHighScore() {
  return readStoredNumber(arcadeStorageKeys.snakeScore) ?? 0;
}

function getMemoryBestMoves() {
  const storedValue = readStoredNumber(arcadeStorageKeys.memoryBestMoves);
  return storedValue !== null && storedValue > 0 ? storedValue : null;
}

function createDefaultArcadeStats() {
  return {
    totalStarts: 0,
    totalWins: 0,
    snake: {
      plays: 0,
      totalScore: 0,
      highScore: 0,
    },
    memory: {
      plays: 0,
      wins: 0,
      bestMoves: null,
    },
    pong: {
      matches: 0,
      wins: 0,
      losses: 0,
    },
  };
}

function sanitizeArcadeStatNumber(value) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }
  return Math.floor(parsedValue);
}

function sanitizeArcadeBestMoves(value) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }
  return Math.floor(parsedValue);
}

function sanitizeArcadeStats(rawValue) {
  const defaults = createDefaultArcadeStats();
  const snakeHighScore = getSnakeHighScore();
  const memoryBestMoves = getMemoryBestMoves();
  const rawStats = rawValue && typeof rawValue === "object" ? rawValue : {};
  const rawSnake = rawStats.snake && typeof rawStats.snake === "object" ? rawStats.snake : {};
  const rawMemory = rawStats.memory && typeof rawStats.memory === "object" ? rawStats.memory : {};
  const rawPong = rawStats.pong && typeof rawStats.pong === "object" ? rawStats.pong : {};
  const storedMemoryBest = sanitizeArcadeBestMoves(rawMemory.bestMoves);

  return {
    totalStarts: sanitizeArcadeStatNumber(rawStats.totalStarts),
    totalWins: sanitizeArcadeStatNumber(rawStats.totalWins),
    snake: {
      plays: sanitizeArcadeStatNumber(rawSnake.plays),
      totalScore: sanitizeArcadeStatNumber(rawSnake.totalScore),
      highScore: Math.max(sanitizeArcadeStatNumber(rawSnake.highScore), snakeHighScore, defaults.snake.highScore),
    },
    memory: {
      plays: sanitizeArcadeStatNumber(rawMemory.plays),
      wins: sanitizeArcadeStatNumber(rawMemory.wins),
      bestMoves: storedMemoryBest === null
        ? memoryBestMoves
        : (memoryBestMoves === null ? storedMemoryBest : Math.min(storedMemoryBest, memoryBestMoves)),
    },
    pong: {
      matches: sanitizeArcadeStatNumber(rawPong.matches),
      wins: sanitizeArcadeStatNumber(rawPong.wins),
      losses: sanitizeArcadeStatNumber(rawPong.losses),
    },
  };
}

function getStoredArcadeProfileName() {
  const nextValue = normalizeArcadeProfileName(
    readStoredString(arcadeStorageKeys.profileName)
    || readStoredString(arcadeStorageKeys.legacyPongName)
    || "",
  );
  return nextValue;
}

function getArcadeProfileName() {
  return getStoredArcadeProfileName() || t("common.guest", {}, "Gast");
}

function setArcadeProfileName(name) {
  const normalizedName = normalizeArcadeProfileName(name);
  if (!normalizedName) {
    removeStoredKey(arcadeStorageKeys.profileName);
    removeStoredKey(arcadeStorageKeys.legacyPongName);
    syncStoredRecords();
    return "";
  }

  writeStoredString(arcadeStorageKeys.profileName, normalizedName);
  writeStoredString(arcadeStorageKeys.legacyPongName, normalizedName);
  syncStoredRecords();
  return normalizedName;
}

function isArcadeSoundEnabled() {
  const rawValue = readStoredString(arcadeStorageKeys.soundEnabled);
  return rawValue !== "0";
}

function setArcadeSoundEnabled(enabled) {
  writeStoredString(arcadeStorageKeys.soundEnabled, enabled ? "1" : "0");
  syncStoredRecords();
  return enabled;
}

function getArcadeStats() {
  return sanitizeArcadeStats(readStoredJson(arcadeStorageKeys.stats));
}

function updateArcadeStats(updater) {
  const baseStats = getArcadeStats();
  const workingCopy = JSON.parse(JSON.stringify(baseStats));
  const updatedStats = updater(workingCopy) || workingCopy;
  const sanitizedStats = sanitizeArcadeStats(updatedStats);
  writeStoredJson(arcadeStorageKeys.stats, sanitizedStats);
  syncStoredRecords();
  return sanitizedStats;
}

function recordArcadeStart(game) {
  updateArcadeStats((stats) => {
    stats.totalStarts += 1;
    if (game === "snake") {
      stats.snake.plays += 1;
    }
    if (game === "memory") {
      stats.memory.plays += 1;
    }
    return stats;
  });
}

function recordSnakeFinish(score) {
  updateArcadeStats((stats) => {
    const safeScore = sanitizeArcadeStatNumber(score);
    stats.snake.totalScore += safeScore;
    stats.snake.highScore = Math.max(stats.snake.highScore, safeScore);
    return stats;
  });
}

function recordMemoryWin(moves) {
  updateArcadeStats((stats) => {
    const safeMoves = sanitizeArcadeBestMoves(moves);
    stats.totalWins += 1;
    stats.memory.wins += 1;
    if (safeMoves !== null && (stats.memory.bestMoves === null || safeMoves < stats.memory.bestMoves)) {
      stats.memory.bestMoves = safeMoves;
    }
    return stats;
  });
}

function recordPongMatchStart() {
  updateArcadeStats((stats) => {
    stats.totalStarts += 1;
    return stats;
  });
}

function recordPongMatchResult(didWin) {
  updateArcadeStats((stats) => {
    stats.pong.matches += 1;
    if (didWin) {
      stats.pong.wins += 1;
      stats.totalWins += 1;
    } else {
      stats.pong.losses += 1;
    }
    return stats;
  });
}

function getArcadeStatDisplayValue(statKey, stats) {
  switch (statKey) {
    case "total-starts":
      return String(stats.totalStarts);
    case "total-wins":
      return String(stats.totalWins);
    case "snake-plays":
      return String(stats.snake.plays);
    case "snake-total-score":
      return String(stats.snake.totalScore);
    case "memory-plays":
      return String(stats.memory.plays);
    case "memory-wins":
      return String(stats.memory.wins);
    case "pong-matches":
      return String(stats.pong.matches);
    case "pong-wins":
      return String(stats.pong.wins);
    case "pong-losses":
      return String(stats.pong.losses);
    case "pong-record":
      return `${stats.pong.wins} - ${stats.pong.losses}`;
    default:
      return "0";
  }
}

function syncStoredRecords() {
  const snakeHighScore = getSnakeHighScore();
  document.querySelectorAll('[data-arcade-record="snake-score"]').forEach((node) => {
    node.textContent = String(snakeHighScore);
  });

  const memoryBestMoves = getMemoryBestMoves();
  document.querySelectorAll('[data-arcade-record="memory-best-moves"]').forEach((node) => {
    node.textContent = memoryBestMoves === null ? "--" : String(memoryBestMoves);
  });

  const profileName = getArcadeProfileName();
  document.querySelectorAll('[data-arcade-profile-name]').forEach((node) => {
    node.textContent = profileName;
  });

  const draftName = getStoredArcadeProfileName();
  document.querySelectorAll('[data-arcade-profile-input]').forEach((input) => {
    if (document.activeElement !== input) {
      input.value = draftName;
    }
  });

  const soundEnabled = isArcadeSoundEnabled();
  const soundButtonText = soundEnabled ? t("common.soundButton.on", {}, "Sound: AN") : t("common.soundButton.off", {}, "Sound: AUS");
  const soundLabelText = soundEnabled ? t("common.soundLabel.on", {}, "AN") : t("common.soundLabel.off", {}, "AUS");
  document.querySelectorAll('[data-arcade-sound-toggle]').forEach((button) => {
    button.textContent = soundButtonText;
    button.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
  });
  document.querySelectorAll('[data-arcade-sound-label]').forEach((node) => {
    node.textContent = soundLabelText;
  });

  const stats = getArcadeStats();
  document.querySelectorAll('[data-arcade-stat]').forEach((node) => {
    node.textContent = getArcadeStatDisplayValue(node.getAttribute('data-arcade-stat'), stats);
  });
}

function initGlobalArcadeUi() {
  document.querySelectorAll('[data-arcade-profile-input]').forEach((input) => {
    if (input.dataset.arcadeBound === 'true') {
      return;
    }
    input.dataset.arcadeBound = 'true';
    input.addEventListener('input', () => {
      input.value = normalizeArcadeProfileName(input.value);
    });
    input.addEventListener('keydown', (event) => {
      const scope = input.closest('[data-arcade-profile-scope]');
      const saveButton = scope ? scope.querySelector('[data-arcade-profile-save]') : null;
      if (event.key === 'Enter' && saveButton) {
        event.preventDefault();
        saveButton.click();
      }
    });
  });

  document.querySelectorAll('[data-arcade-profile-save]').forEach((button) => {
    if (button.dataset.arcadeBound === 'true') {
      return;
    }
    button.dataset.arcadeBound = 'true';
    button.addEventListener('click', () => {
      const scope = button.closest('[data-arcade-profile-scope]');
      const input = scope ? scope.querySelector('[data-arcade-profile-input]') : document.querySelector('[data-arcade-profile-input]');
      if (!input) {
        return;
      }
      const normalizedName = setArcadeProfileName(input.value);
      input.value = normalizedName;
      arcadeAudio.unlock();
      arcadeAudio.uiConfirm();
    });
  });

  document.querySelectorAll('[data-arcade-sound-toggle]').forEach((button) => {
    if (button.dataset.arcadeBound === 'true') {
      return;
    }
    button.dataset.arcadeBound = 'true';
    button.addEventListener('click', () => {
      const nextEnabled = !isArcadeSoundEnabled();
      setArcadeSoundEnabled(nextEnabled);
      if (nextEnabled) {
        arcadeAudio.unlock();
        arcadeAudio.uiConfirm();
      }
    });
  });

  syncStoredRecords();
}

syncStoredRecords();
registerArcadeUiRefresh(syncStoredRecords);
function createArcadeAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let context = null;
  let masterGain = null;

  function ensureContext() {
    if (!AudioContextClass) {
      return null;
    }

    if (!context) {
      context = new AudioContextClass();
      masterGain = context.createGain();
      masterGain.gain.value = 0.04;
      masterGain.connect(context.destination);
    }

    return context;
  }

  function unlock() {
    const ctx = ensureContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {
        // Ignored: browsers may defer audio until the next gesture.
      });
    }
  }

  function playPattern(pattern) {
    const ctx = ensureContext();
    if (!ctx || ctx.state === "suspended" || !masterGain || !isArcadeSoundEnabled()) {
      return;
    }

    const startTime = ctx.currentTime;
    pattern.forEach((step) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const time = startTime + (step.time || 0);
      const duration = step.duration || 0.08;
      const targetGain = (step.gain || 1) * masterGain.gain.value;

      oscillator.type = step.type || "square";
      oscillator.frequency.setValueAtTime(step.frequency || 440, time);
      gainNode.gain.setValueAtTime(0.0001, time);
      gainNode.gain.linearRampToValueAtTime(targetGain, time + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      oscillator.connect(gainNode);
      gainNode.connect(masterGain);
      oscillator.start(time);
      oscillator.stop(time + duration + 0.03);
    });
  }

  return {
    unlock,
    uiConfirm() {
      playPattern([
        { frequency: 480, duration: 0.07, gain: 0.85 },
        { frequency: 620, duration: 0.08, gain: 0.65, time: 0.07 },
      ]);
    },
    startRound() {
      playPattern([
        { frequency: 360, duration: 0.08, gain: 0.7 },
        { frequency: 520, duration: 0.09, gain: 0.75, time: 0.08 },
      ]);
    },
    snakeEat() {
      playPattern([
        { frequency: 700, duration: 0.06, gain: 0.8 },
        { frequency: 920, duration: 0.08, gain: 0.55, time: 0.05 },
      ]);
    },
    snakeCrash() {
      playPattern([
        { frequency: 260, duration: 0.12, gain: 0.9, type: "sawtooth" },
        { frequency: 160, duration: 0.18, gain: 0.6, time: 0.07, type: "triangle" },
      ]);
    },
    memoryFlip() {
      playPattern([
        { frequency: 520, duration: 0.05, gain: 0.45 },
      ]);
    },
    memoryMatch() {
      playPattern([
        { frequency: 540, duration: 0.05, gain: 0.65 },
        { frequency: 720, duration: 0.08, gain: 0.5, time: 0.05 },
      ]);
    },
    memoryMiss() {
      playPattern([
        { frequency: 260, duration: 0.06, gain: 0.5 },
        { frequency: 210, duration: 0.08, gain: 0.35, time: 0.06 },
      ]);
    },
    memoryWin() {
      playPattern([
        { frequency: 420, duration: 0.08, gain: 0.65 },
        { frequency: 560, duration: 0.08, gain: 0.65, time: 0.08 },
        { frequency: 760, duration: 0.12, gain: 0.7, time: 0.16 },
      ]);
    },
    pongScore() {
      playPattern([
        { frequency: 330, duration: 0.06, gain: 0.75 },
        { frequency: 410, duration: 0.09, gain: 0.55, time: 0.06 },
      ]);
    },
    pongWin(isWinner) {
      playPattern(isWinner
        ? [
          { frequency: 420, duration: 0.09, gain: 0.7 },
          { frequency: 560, duration: 0.09, gain: 0.7, time: 0.08 },
          { frequency: 760, duration: 0.14, gain: 0.8, time: 0.16 },
        ]
        : [
          { frequency: 320, duration: 0.1, gain: 0.55 },
          { frequency: 240, duration: 0.14, gain: 0.55, time: 0.09 },
          { frequency: 180, duration: 0.18, gain: 0.45, time: 0.2 },
        ]);
    },
  };
}

const arcadeAudio = createArcadeAudio();
document.addEventListener("pointerdown", () => arcadeAudio.unlock(), { passive: true });
document.addEventListener("keydown", () => arcadeAudio.unlock());
window.addEventListener("storage", () => syncStoredRecords());
initGlobalArcadeUi();

function initSnakePage() {
  const canvas = document.querySelector("#snake-canvas");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  const resetButton = document.querySelector("#snake-reset");
  const scoreEl = document.querySelector("#snake-score");
  const statusEl = document.querySelector("#snake-status");
  const elements = {
    overlay: document.querySelector("#snake-overlay"),
    overlayTitle: document.querySelector("#snake-overlay-title"),
    overlayText: document.querySelector("#snake-overlay-text"),
    overlayMeta: document.querySelector("#snake-overlay-meta"),
    overlayAction: document.querySelector("#snake-overlay-action"),
  };
  const state = {
    gridSize: 20,
    tileSize: canvas.width / 20,
    intervalId: null,
    pendingDirection: null,
    body: [],
    direction: { x: 1, y: 0 },
    food: { x: 10, y: 10 },
    score: 0,
    startDelay: 165,
    tickDelay: 165,
    minDelay: 72,
    speedStep: 6,
    phase: "intro",
    lastStatusKey: "snake.status.ready",
    lastStatusFallback: "Bereit",
    lastStatusVars: {},
    lastRunWasHighScore: false,
  };

  function setSnakeStatus(key, fallback, variables) {
    state.lastStatusKey = key;
    state.lastStatusFallback = fallback;
    state.lastStatusVars = variables || {};
    statusEl.textContent = t(key, state.lastStatusVars, fallback);
  }

  function randomPosition() {
    return Math.floor(Math.random() * state.gridSize);
  }

  function placeFood() {
    let validPosition = false;

    while (!validPosition) {
      const candidate = { x: randomPosition(), y: randomPosition() };
      validPosition = !state.body.some((segment) => segment.x === candidate.x && segment.y === candidate.y);
      if (validPosition) {
        state.food = candidate;
      }
    }
  }

  function getOverlayRecordText() {
    const bestScore = getSnakeHighScore();
    return bestScore > 0
      ? t("snake.best.value", { value: bestScore }, `Bestwert: ${bestScore}`)
      : t("snake.best.open", {}, "Bestwert: Noch offen");
  }

  function renderOverlay(options) {
    if (!elements.overlay) {
      return;
    }

    const visible = Boolean(options && options.visible);
    elements.overlay.classList.toggle("is-hidden", !visible);
    if (!visible) {
      return;
    }

    elements.overlayTitle.textContent = options.title;
    elements.overlayText.textContent = options.text;
    elements.overlayMeta.textContent = options.meta || getOverlayRecordText();
    elements.overlayAction.textContent = options.actionLabel || t("snake.overlay.start", {}, "Spiel starten");
  }

  function draw(gameOver) {
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#0b1220";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.strokeStyle = "rgba(148, 163, 184, 0.08)";
    for (let offset = 0; offset <= canvas.width; offset += state.tileSize) {
      context.beginPath();
      context.moveTo(offset, 0);
      context.lineTo(offset, canvas.height);
      context.stroke();
      context.beginPath();
      context.moveTo(0, offset);
      context.lineTo(canvas.width, offset);
      context.stroke();
    }

    context.shadowColor = "rgba(34, 197, 94, 0.45)";
    context.shadowBlur = 14;
    context.fillStyle = "#22c55e";
    context.fillRect(
      state.food.x * state.tileSize + 4,
      state.food.y * state.tileSize + 4,
      state.tileSize - 8,
      state.tileSize - 8,
    );

    context.shadowBlur = 0;
    state.body.forEach((segment, index) => {
      context.fillStyle = index === 0 ? "#f8fafc" : "#94a3b8";
      context.fillRect(
        segment.x * state.tileSize + 3,
        segment.y * state.tileSize + 3,
        state.tileSize - 6,
        state.tileSize - 6,
      );
    });

    if (gameOver) {
      context.fillStyle = "rgba(15, 23, 42, 0.82)";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#f8fafc";
      context.textAlign = "center";
      context.font = '600 30px Inter, "Segoe UI", sans-serif';
      context.fillText(t("snake.status.gameOver", {}, "Game Over"), canvas.width / 2, canvas.height / 2 - 14);
      context.fillStyle = "#cbd5e1";
      context.font = '16px Inter, "Segoe UI", sans-serif';
      context.fillText(t("snake.canvas.hint", {}, "Leertaste oder Neu starten"), canvas.width / 2, canvas.height / 2 + 20);
    }
  }

  function refreshSnakeLanguage() {
    setSnakeStatus(state.lastStatusKey, state.lastStatusFallback, state.lastStatusVars);
    if (state.phase === "intro") {
      renderOverlay({
        visible: true,
        title: t("snake.overlay.title", {}, "Bereit fuer den Start"),
        text: t("snake.overlay.text", {}, "Starte eine Runde und jage einen moeglichst langen neon-gruenen Lauf."),
        meta: getOverlayRecordText(),
        actionLabel: t("snake.overlay.start", {}, "Spiel starten"),
      });
    }
    if (state.phase === "gameover") {
      renderOverlay({
        visible: true,
        title: state.lastRunWasHighScore ? t("snake.status.highscore", {}, "Neuer Highscore") : t("snake.status.gameOver", {}, "Game Over"),
        text: state.lastRunWasHighScore
          ? t("snake.finish.highscore", { score: state.score }, `Starker Lauf. Du hast ${state.score} Punkte erreicht.`)
          : t("snake.finish.normal", { score: state.score }, `Dein Lauf endet bei ${state.score} Punkten. Versuch es direkt noch einmal.`),
        meta: getOverlayRecordText(),
        actionLabel: t("snake.overlay.replay", {}, "Nochmal spielen"),
      });
    }
    draw(state.phase === "gameover");
  }

  function stopGame() {
    if (state.intervalId) {
      window.clearInterval(state.intervalId);
      state.intervalId = null;
    }
  }

  function startGameLoop() {
    stopGame();
    state.intervalId = window.setInterval(stepGame, state.tickDelay);
  }

  function prepareRound() {
    stopGame();
    state.body = [
      { x: 8, y: 10 },
      { x: 7, y: 10 },
      { x: 6, y: 10 },
      { x: 5, y: 10 },
    ];
    state.direction = { x: 1, y: 0 };
    state.pendingDirection = null;
    state.score = 0;
    state.tickDelay = state.startDelay;
    state.lastRunWasHighScore = false;
    scoreEl.textContent = "0";
    syncStoredRecords();
    placeFood();
    draw(false);
  }

  function startRun(initialDirection) {
    arcadeAudio.unlock();
    prepareRound();
    recordArcadeStart("snake");
    if (initialDirection) {
      state.direction = initialDirection;
    }
    state.phase = "running";
    setSnakeStatus("snake.status.running", "Laeuft");
    renderOverlay({ visible: false });
    draw(false);
    startGameLoop();
    canvas.focus();
    arcadeAudio.startRound();
  }

  function openIntroScreen() {
    prepareRound();
    state.phase = "intro";
    setSnakeStatus("snake.status.ready", "Bereit");
    renderOverlay({
      visible: true,
      title: t("snake.overlay.title", {}, "Bereit fuer den Start"),
      text: t("snake.overlay.text", {}, "Starte eine Runde und jage einen moeglichst langen neon-gruenen Lauf."),
      meta: getOverlayRecordText(),
      actionLabel: t("snake.overlay.start", {}, "Spiel starten"),
    });
  }

  function finishRun() {
    const hasNewHighScore = storeSnakeHighScore(state.score);
    recordSnakeFinish(state.score);
    state.phase = "gameover";
    state.lastRunWasHighScore = hasNewHighScore;
    setSnakeStatus(hasNewHighScore ? "snake.status.highscore" : "snake.status.gameOver", hasNewHighScore ? "Neuer Highscore" : "Game Over");
    stopGame();
    draw(true);
    renderOverlay({
      visible: true,
      title: hasNewHighScore ? t("snake.status.highscore", {}, "Neuer Highscore") : t("snake.status.gameOver", {}, "Game Over"),
      text: hasNewHighScore
        ? t("snake.finish.highscore", { score: state.score }, `Starker Lauf. Du hast ${state.score} Punkte erreicht.`)
        : t("snake.finish.normal", { score: state.score }, `Dein Lauf endet bei ${state.score} Punkten. Versuch es direkt noch einmal.`),
      meta: getOverlayRecordText(),
      actionLabel: t("snake.overlay.replay", {}, "Nochmal spielen"),
    });
    arcadeAudio.snakeCrash();
  }

  function queueDirection(nextDirection) {
    const currentDirection = state.pendingDirection || state.direction;
    const isReverse =
      currentDirection.x + nextDirection.x === 0 &&
      currentDirection.y + nextDirection.y === 0;

    if (!isReverse) {
      state.pendingDirection = nextDirection;
    }
  }

  function handleDirectionalInput(nextDirection) {
    if (state.phase !== "running") {
      startRun(nextDirection);
      return;
    }

    queueDirection(nextDirection);
  }

  function stepGame() {
    if (state.phase !== "running") {
      return;
    }

    if (state.pendingDirection) {
      state.direction = state.pendingDirection;
      state.pendingDirection = null;
    }

    const head = state.body[0];
    const nextHead = {
      x: head.x + state.direction.x,
      y: head.y + state.direction.y,
    };
    const willEatFood = nextHead.x === state.food.x && nextHead.y === state.food.y;
    const collisionBody = willEatFood ? state.body : state.body.slice(0, -1);
    const hitsWall =
      nextHead.x < 0 ||
      nextHead.x >= state.gridSize ||
      nextHead.y < 0 ||
      nextHead.y >= state.gridSize;
    const hitsSelf = collisionBody.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);

    if (hitsWall || hitsSelf) {
      finishRun();
      return;
    }

    state.body.unshift(nextHead);

    if (willEatFood) {
      state.score += 10;
      scoreEl.textContent = String(state.score);
      const hasNewHighScore = storeSnakeHighScore(state.score);
      setSnakeStatus(hasNewHighScore ? "snake.status.highscoreBang" : "snake.status.point", hasNewHighScore ? "Neuer Highscore!" : "Punkt!");
      placeFood();
      arcadeAudio.snakeEat();

      const nextDelay = Math.max(state.minDelay, state.tickDelay - state.speedStep);
      if (nextDelay !== state.tickDelay) {
        state.tickDelay = nextDelay;
        startGameLoop();
      }
    } else {
      state.body.pop();
      setSnakeStatus("snake.status.running", "Laeuft");
    }

    draw(false);
  }

  function handleKeydown(event) {
    const key = event.key.toLowerCase();

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(key)) {
      event.preventDefault();
    }

    if (key === "arrowup" || key === "w") {
      handleDirectionalInput({ x: 0, y: -1 });
    }
    if (key === "arrowdown" || key === "s") {
      handleDirectionalInput({ x: 0, y: 1 });
    }
    if (key === "arrowleft" || key === "a") {
      handleDirectionalInput({ x: -1, y: 0 });
    }
    if (key === "arrowright" || key === "d") {
      handleDirectionalInput({ x: 1, y: 0 });
    }
    if (key === " " && state.phase !== "running") {
      startRun();
    }
  }

  resetButton.addEventListener("click", () => startRun());
  elements.overlayAction.addEventListener("click", () => startRun());
  document.addEventListener("keydown", handleKeydown);
  canvas.addEventListener("pointerdown", () => {
    canvas.focus();
    arcadeAudio.unlock();
  });

  registerArcadeUiRefresh(refreshSnakeLanguage);
  openIntroScreen();
}

function initPongPage() {
  const canvas = document.querySelector("#pong-canvas");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  const elements = {
    canvas,
    playerLabel: document.querySelector("#pong-player-label"),
    opponentLabel: document.querySelector("#pong-ai-label"),
    playerScore: document.querySelector("#pong-player-score"),
    opponentScore: document.querySelector("#pong-ai-score"),
    role: document.querySelector("#pong-role"),
    status: document.querySelector("#pong-status"),
    help: document.querySelector("#pong-help"),
    rematchNote: document.querySelector("#pong-rematch-note"),
    reset: document.querySelector("#pong-reset"),
    serverUrl: document.querySelector("#pong-server-url"),
    connect: document.querySelector("#pong-connect"),
    disconnect: document.querySelector("#pong-disconnect"),
    connection: document.querySelector("#pong-connection"),
    phase: document.querySelector("#pong-phase"),
    roomCode: document.querySelector("#pong-room-code"),
    players: document.querySelector("#pong-players"),
    createRoom: document.querySelector("#pong-create-room"),
    leaveRoom: document.querySelector("#pong-leave-room"),
    roomInput: document.querySelector("#pong-room-input"),
    joinRoom: document.querySelector("#pong-join-room"),
    copyCode: document.querySelector("#pong-copy-code"),
    playerName: document.querySelector("#pong-player-name"),
    saveName: document.querySelector("#pong-save-name"),
    copyLink: document.querySelector("#pong-copy-link"),
    shareNote: document.querySelector("#pong-share-note"),
    youName: document.querySelector("#pong-you-name"),
    youState: document.querySelector("#pong-you-state"),
    opponentName: document.querySelector("#pong-opponent-name"),
    opponentState: document.querySelector("#pong-opponent-state"),
    matchOverlay: document.querySelector("#pong-match-overlay"),
    matchTitle: document.querySelector("#pong-match-title"),
    matchText: document.querySelector("#pong-match-text"),
    matchAction: document.querySelector("#pong-match-action"),
  };

  function normalizePlayerName(value) {
    return String(value || "")
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 18);
  }

  function normalizeRoomCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
  }

  function readStoredName() {
    return normalizePlayerName(getStoredArcadeProfileName());
  }

  function persistName(name) {
    setArcadeProfileName(name);
  }

  function getRoomCodeFromQuery() {
    try {
      const params = new URLSearchParams(window.location.search);
      return normalizeRoomCode(params.get("room") || "");
    } catch (error) {
      return "";
    }
  }

  const state = {
    width: canvas.width,
    height: canvas.height,
    paddleWidth: 14,
    paddleHeight: 92,
    ballRadius: 10,
    socket: null,
    connection: t("pong.connection.disconnected", {}, "Nicht verbunden"),
    roomCode: "",
    role: null,
    players: {
      leftConnected: false,
      rightConnected: false,
      leftName: "",
      rightName: "",
    },
    scores: { left: 0, right: 0 },
    paddles: {
      left: (canvas.height - 92) / 2,
      right: (canvas.height - 92) / 2,
    },
    ball: {
      x: canvas.width / 2,
      y: canvas.height / 2,
    },
    running: false,
    winner: null,
    statusText: t("pong.help.offline", {}, "Server starten und verbinden"),
    localPaddleY: (canvas.height - 92) / 2,
    lastSentY: null,
    lastSentAt: 0,
    keys: { up: false, down: false },
    controlSpeed: 720,
    connecting: false,
    disconnectReason: "",
    selfName: readStoredName(),
    pendingAutoJoinRoomCode: getRoomCodeFromQuery(),
  };

  function getDefaultServerUrl() {
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      const socketProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      return `${socketProtocol}//${window.location.host}/ws`;
    }

    return "ws://localhost:8080/ws";
  }

  function getRoleLabel(role) {
    if (role === "left") {
      return t("pong.side.left", {}, "Links");
    }
    if (role === "right") {
      return t("pong.side.right", {}, "Rechts");
    }
    return "-";
  }

  function getPlayerCount() {
    return [state.players.leftConnected, state.players.rightConnected].filter(Boolean).length;
  }

  function isConnected() {
    return Boolean(state.socket && state.socket.readyState === WebSocket.OPEN);
  }

  function getSelfName() {
    return state.selfName || t("common.guest", {}, "Gast");
  }

  function getSideName(side) {
    if (side === "left") {
      return state.players.leftName || t("pong.side.left", {}, "Links");
    }
    if (side === "right") {
      return state.players.rightName || t("pong.side.right", {}, "Rechts");
    }
    return "";
  }

  function getOpponentSide() {
    if (state.role === "left") {
      return "right";
    }
    if (state.role === "right") {
      return "left";
    }
    return null;
  }

  function getPhaseText() {
    if (!isConnected()) {
      return t("pong.phase.offline", {}, "Offline");
    }
    if (!state.roomCode) {
      return t("pong.phase.lobby", {}, "Lobby");
    }
    if (!state.players.leftConnected || !state.players.rightConnected) {
      return t("pong.phase.waiting", {}, "Warten");
    }
    if (state.running) {
      return t("pong.phase.live", {}, "Live");
    }
    if (state.winner) {
      return t("pong.phase.matchEnd", {}, "Match Ende");
    }
    return t("pong.phase.ready", {}, "Bereit");
  }

  function getHelpText() {
    if (!isConnected()) {
      return t("pong.help.offline", {}, "Server starten und dann verbinden.");
    }
    if (!state.roomCode) {
      return state.pendingAutoJoinRoomCode
        ? t("pong.help.invite", { roomCode: state.pendingAutoJoinRoomCode }, `Einladung fuer Raum ${state.pendingAutoJoinRoomCode} erkannt. Verbindung wird vorbereitet.`)
        : t("pong.help.lobby", {}, "Namen setzen und dann einen Raum erstellen oder einem beitreten.");
    }
    if (!state.players.leftConnected || !state.players.rightConnected) {
      return t("pong.help.waiting", { roomCode: state.roomCode }, `Raum ${state.roomCode} wartet auf Spieler 2. Teile den Code oder den Einladungslink.`);
    }
    if (state.winner) {
      return t("pong.help.rematch", {}, "Match beendet. Ihr koennt im selben Raum direkt ein Rematch starten.");
    }
    if (!state.running) {
      return state.statusText || t("pong.help.ready", {}, "Die Arena ist bereit.");
    }
    return t("pong.help.running", {}, "W oder Pfeil hoch nach oben, S oder Pfeil runter nach unten. Maus im Spielfeld funktioniert ebenfalls.");
  }

  function getYouStateText() {
    if (!state.roomCode) {
      return isConnected() ? t("pong.you.readyRoom", {}, "Bereit fuer einen Raum") : t("pong.you.notConnected", {}, "Noch nicht verbunden");
    }
    if (!state.role) {
      return t("pong.you.serverConnected", {}, "Mit dem Server verbunden");
    }
    if (!state.players.leftConnected || !state.players.rightConnected) {
      return state.role === "left" ? t("pong.you.holdLeft", {}, "Du haeltst die linke Seite frei.") : t("pong.you.holdRight", {}, "Du haeltst die rechte Seite frei.");
    }
    if (state.winner) {
      return state.winner === state.role ? t("pong.you.won", {}, "Du hast das Match gewonnen.") : t("pong.you.finished", {}, "Das Match ist vorbei.");
    }
    return state.role === "left" ? t("pong.you.playLeft", {}, "Du spielst auf der linken Seite.") : t("pong.you.playRight", {}, "Du spielst auf der rechten Seite.");
  }

  function getOpponentDisplayName() {
    const opponentSide = getOpponentSide();
    if (!opponentSide) {
      return state.players.rightName || state.players.leftName || t("pong.side.waiting", {}, "Wartet");
    }
    return getSideName(opponentSide);
  }

  function getOpponentStateText() {
    if (!state.roomCode) {
      return t("pong.opponent.starts", {}, "Sobald jemand beitritt, startet das Match.");
    }
    const opponentSide = getOpponentSide();
    if (!opponentSide) {
      return getPlayerCount() > 0 ? t("pong.opponent.filling", {}, "Die Spielplaetze fuellen sich gerade.") : t("pong.opponent.none", {}, "Noch niemand im Raum.");
    }
    const opponentConnected = opponentSide === "left" ? state.players.leftConnected : state.players.rightConnected;
    if (!opponentConnected) {
      return t("pong.opponent.wait", {}, "Warte auf den zweiten Spieler.");
    }
    if (state.winner) {
      return state.winner === opponentSide ? t("pong.opponent.won", {}, "Der Gegner hat dieses Match gewonnen.") : t("pong.opponent.rematch", {}, "Bereit fuer die Revanche.");
    }
    return state.running ? t("pong.opponent.active", {}, "Der Gegner ist im Match aktiv.") : t("pong.opponent.ready", {}, "Gegner verbunden und bereit.");
  }

  function getPlayerNameForPayload() {
    const normalized = normalizePlayerName(elements.playerName.value);
    if (normalized) {
      state.selfName = normalized;
      persistName(normalized);
      return normalized;
    }
    return state.selfName || "";
  }

  function syncNameInput() {
    const nextValue = state.selfName || "";
    if (document.activeElement !== elements.playerName) {
      elements.playerName.value = nextValue;
    }
  }

  function resetRoomView() {
    state.roomCode = "";
    state.role = null;
    state.players = {
      leftConnected: false,
      rightConnected: false,
      leftName: "",
      rightName: "",
    };
    state.scores = { left: 0, right: 0 };
    state.paddles = {
      left: (state.height - state.paddleHeight) / 2,
      right: (state.height - state.paddleHeight) / 2,
    };
    state.ball = {
      x: state.width / 2,
      y: state.height / 2,
    };
    state.running = false;
    state.winner = null;
    state.localPaddleY = (state.height - state.paddleHeight) / 2;
    state.lastSentY = null;
  }

  function updateMatchOverlay() {
    if (!elements.matchOverlay || !elements.matchTitle || !elements.matchText || !elements.matchAction) {
      return;
    }

    const bothPlayers = state.players.leftConnected && state.players.rightConnected;
    const showOverlay = Boolean(state.roomCode && state.winner && bothPlayers);
    elements.matchOverlay.classList.toggle("is-hidden", !showOverlay);
    if (!showOverlay) {
      return;
    }

    const winnerName = getSideName(state.winner) || (state.winner === "left" ? t("pong.side.left", {}, "Links") : t("pong.side.right", {}, "Rechts"));
    const youWon = state.role ? state.role === state.winner : false;
    elements.matchTitle.textContent = youWon ? t("pong.overlay.winTitle", {}, "Du hast gewonnen") : t("pong.overlay.loseTitle", { winnerName }, `${winnerName} gewinnt dieses Match`);
    elements.matchText.textContent = youWon
      ? "Starke Runde. Der Raum bleibt offen, also koennt ihr direkt die Revanche starten."
      : `${winnerName} hat diese Runde geholt. Wenn beide verbunden bleiben, startet die Revanche sofort im selben Raum.`;
    elements.matchAction.disabled = !isConnected() || !state.roomCode || !bothPlayers;
  }

  function updateInterface() {
    const leftName = getSideName("left");
    const rightName = getSideName("right");
    const playerName = getSelfName();
    const opponentName = getOpponentDisplayName();

    if (state.role === "left") {
      elements.playerLabel.textContent = playerName;
      elements.opponentLabel.textContent = opponentName;
      elements.playerScore.textContent = String(state.scores.left);
      elements.opponentScore.textContent = String(state.scores.right);
    } else if (state.role === "right") {
      elements.playerLabel.textContent = playerName;
      elements.opponentLabel.textContent = opponentName;
      elements.playerScore.textContent = String(state.scores.right);
      elements.opponentScore.textContent = String(state.scores.left);
    } else {
      elements.playerLabel.textContent = leftName;
      elements.opponentLabel.textContent = rightName;
      elements.playerScore.textContent = String(state.scores.left);
      elements.opponentScore.textContent = String(state.scores.right);
    }

    elements.role.textContent = getRoleLabel(state.role);
    elements.status.textContent = state.statusText;
    elements.connection.textContent = state.connection;
    elements.phase.textContent = getPhaseText();
    elements.roomCode.textContent = state.roomCode || "----";
    elements.players.textContent = `${getPlayerCount()}/2`;
    elements.help.textContent = getHelpText();
    elements.youName.textContent = playerName;
    elements.youState.textContent = getYouStateText();
    elements.opponentName.textContent = opponentName;
    elements.opponentState.textContent = getOpponentStateText();
    elements.shareNote.textContent = state.roomCode
      ? t("pong.share.room", { roomCode: state.roomCode }, `Sende Raum ${state.roomCode} per Code oder per Einladungslink weiter.`)
      : t("pong.share.default", {}, "Einladungslinks tragen den Raumcode direkt in die Seite ein.");

    const connected = isConnected();
    const connecting = state.connecting;
    const hasRoom = Boolean(state.roomCode);
    const roomInput = normalizeRoomCode(elements.roomInput.value);
    const bothPlayers = state.players.leftConnected && state.players.rightConnected;
    const hasName = normalizePlayerName(elements.playerName.value).length > 0;
    const rematchReady = Boolean(state.winner && bothPlayers);

    elements.connect.disabled = connected || connecting;
    elements.disconnect.disabled = !connected && !connecting;
    elements.saveName.disabled = connecting || !hasName;
    elements.createRoom.disabled = !connected || connecting;
    elements.joinRoom.disabled = !connected || connecting || roomInput.length < 4;
    elements.leaveRoom.disabled = !connected || connecting || !hasRoom;
    elements.copyCode.disabled = !hasRoom;
    elements.copyLink.disabled = !hasRoom;
    elements.reset.disabled = !connected || connecting || !hasRoom || !bothPlayers;
    elements.reset.textContent = rematchReady ? t("pong.button.rematch", {}, "Rematch starten") : t("pong.button.newRound", {}, "Neue Runde");

    if (elements.rematchNote) {
      if (!hasRoom) {
        elements.rematchNote.textContent = t("pong.rematch.noRoom", {}, "Nach dem Match koennt ihr im selben Raum direkt ein Rematch starten, ohne Raumcode oder Verbindung neu aufzusetzen.");
      } else if (!bothPlayers) {
        elements.rematchNote.textContent = t("pong.rematch.waiting", {}, "Sobald zwei Spieler im Raum sind, bleibt die Verbindung fuer spaetere Revanchen bestehen.");
      } else if (rematchReady) {
        elements.rematchNote.textContent = t("pong.rematch.ready", {}, "Beide Spieler sind noch verbunden. Ein Klick startet sofort die Revanche im selben Raum.");
      } else {
        elements.rematchNote.textContent = t("pong.rematch.active", {}, "Der Raum bleibt aktiv. Fuer eine Revanche muesst ihr weder den Code neu eingeben noch die Verbindung trennen.");
      }
    }

    updateMatchOverlay();
  }

  function sendMessage(payload) {
    if (!isConnected()) {
      return false;
    }

    state.socket.send(JSON.stringify(payload));
    return true;
  }

  function applyRoomState(message) {
    const previousScores = { ...state.scores };
    const previousWinner = state.winner;
    const previousRunning = state.running;

    state.roomCode = message.roomCode || "";
    state.role = message.role || null;
    state.players = {
      leftConnected: Boolean(message.players && message.players.leftConnected),
      rightConnected: Boolean(message.players && message.players.rightConnected),
      leftName: normalizePlayerName(message.players && message.players.leftName),
      rightName: normalizePlayerName(message.players && message.players.rightName),
    };
    state.scores = {
      left: Number(message.scores && message.scores.left) || 0,
      right: Number(message.scores && message.scores.right) || 0,
    };
    state.paddles = {
      left: Number(message.paddles && message.paddles.left) || 0,
      right: Number(message.paddles && message.paddles.right) || 0,
    };
    state.ball = {
      x: Number(message.ball && message.ball.x) || state.width / 2,
      y: Number(message.ball && message.ball.y) || state.height / 2,
    };
    state.running = Boolean(message.running);
    state.winner = message.winner || null;
    state.statusText = mapArcadeServerMessage(message.status || state.statusText);

    const normalizedSelfName = normalizePlayerName(message.selfName || "");
    if (normalizedSelfName) {
      state.selfName = normalizedSelfName;
      persistName(normalizedSelfName);
      syncNameInput();
    }

    if (state.roomCode) {
      elements.roomInput.value = state.roomCode;
    }

    if (state.role === "left") {
      state.localPaddleY = state.paddles.left;
    }
    if (state.role === "right") {
      state.localPaddleY = state.paddles.right;
    }

    const scoreChanged =
      state.scores.left !== previousScores.left ||
      state.scores.right !== previousScores.right;
    if (!previousRunning && state.running && state.players.leftConnected && state.players.rightConnected) {
      recordPongMatchStart();
      arcadeAudio.startRound();
    }
    if (previousRunning && !previousWinner && state.winner && state.role) {
      recordPongMatchResult(state.winner === state.role);
    }
    if (!previousWinner && state.winner) {
      arcadeAudio.pongWin(Boolean(state.role) ? state.winner === state.role : true);
    } else if (scoreChanged) {
      arcadeAudio.pongScore();
    }

    updateInterface();
  }

  function joinRoomWithCode(roomCode, fromInvite) {
    if (!isConnected()) {
      state.statusText = t("pong.local.connectFirst", {}, "Bitte zuerst verbinden");
      updateInterface();
      return;
    }

    const normalizedCode = normalizeRoomCode(roomCode);
    if (normalizedCode.length < 4) {
      state.statusText = t("pong.local.validRoomCode", {}, "Bitte einen gueltigen Raumcode eingeben");
      updateInterface();
      return;
    }

    elements.roomInput.value = normalizedCode;
    const payload = { type: "join_room", roomCode: normalizedCode };
    const playerName = getPlayerNameForPayload();
    if (playerName) {
      payload.playerName = playerName;
    }

    sendMessage(payload);
    state.statusText = fromInvite
      ? `Einladung erkannt. Trete Raum ${normalizedCode} bei.`
      : `Trete Raum ${normalizedCode} bei`;
    updateInterface();
  }

  function handleServerMessage(rawMessage) {
    let message;

    try {
      message = JSON.parse(rawMessage.data);
    } catch (error) {
      state.statusText = t("pong.local.badResponse", {}, "Server-Antwort konnte nicht gelesen werden");
      updateInterface();
      return;
    }

    if (message.type === "welcome") {
      const normalizedName = normalizePlayerName(message.playerName || "");
      if (normalizedName) {
        state.selfName = normalizedName;
        persistName(normalizedName);
        syncNameInput();
      }
      state.connection = t("pong.connection.connected", {}, "Verbunden");
      state.statusText = mapArcadeServerMessage(message.message || t("pong.local.connectedStatus", {}, "Verbunden. Raum erstellen oder beitreten."));
      updateInterface();

      if (state.pendingAutoJoinRoomCode && !state.roomCode) {
        const pendingRoomCode = state.pendingAutoJoinRoomCode;
        state.pendingAutoJoinRoomCode = "";
        joinRoomWithCode(pendingRoomCode, true);
      }
      return;
    }

    if (message.type === "room_state") {
      applyRoomState(message);
      return;
    }

    if (message.type === "info") {
      state.statusText = mapArcadeServerMessage(message.message || state.statusText);
      updateInterface();
      return;
    }

    if (message.type === "error") {
      state.statusText = mapArcadeServerMessage(message.message || t("pong.local.serverError", {}, "Serverfehler"));
      updateInterface();
    }
  }

  function closeSocket(manualStatus) {
    if (manualStatus) {
      state.disconnectReason = manualStatus;
    }

    if (state.socket) {
      try {
        state.socket.close();
      } catch (error) {
        // Ignored: the socket may already be closing.
      }
    }

    state.socket = null;
    state.connecting = false;
    state.connection = t("pong.connection.disconnected", {}, "Nicht verbunden");
    resetRoomView();
    if (manualStatus) {
      state.statusText = manualStatus;
    }
    updateInterface();
  }

  function connect() {
    if (isConnected() || state.connecting) {
      return;
    }

    const normalizedName = normalizePlayerName(elements.playerName.value);
    if (normalizedName) {
      state.selfName = normalizedName;
      persistName(normalizedName);
    }

    const url = elements.serverUrl.value.trim() || getDefaultServerUrl();
    let socket;

    try {
      socket = new WebSocket(url);
      state.socket = socket;
    } catch (error) {
      state.connection = t("pong.connection.error", {}, "Fehler");
      state.connecting = false;
      state.statusText = t("pong.local.socketInvalid", {}, "WebSocket-URL ist ungueltig");
      updateInterface();
      return;
    }

    state.connecting = true;
    state.disconnectReason = "";
    state.connection = t("pong.connection.connecting", {}, "Verbinde...");
    state.statusText = t("pong.local.connectionStarting", {}, "Verbindung wird aufgebaut");
    updateInterface();

    socket.addEventListener("open", () => {
      state.socket = socket;
      state.connecting = false;
      state.connection = t("pong.connection.connected", {}, "Verbunden");
      state.statusText = mapArcadeServerMessage("Verbunden. Erstelle einen Raum oder tritt einem bei.");
      updateInterface();
    });

    socket.addEventListener("message", handleServerMessage);

    socket.addEventListener("close", () => {
      if (state.socket === socket) {
        state.socket = null;
      }
      state.connecting = false;
      state.connection = t("pong.connection.disconnected", {}, "Nicht verbunden");
      resetRoomView();
      state.statusText = state.disconnectReason || t("pong.local.connectionClosed", {}, "Verbindung beendet");
      state.disconnectReason = "";
      updateInterface();
    });

    socket.addEventListener("error", () => {
      state.connecting = false;
      state.connection = t("pong.connection.error", {}, "Fehler");
      state.statusText = t("pong.local.serverUnavailable", {}, "Server nicht erreichbar");
      updateInterface();
    });
  }

  function leaveRoom() {
    if (!isConnected() || !state.roomCode) {
      return;
    }

    sendMessage({ type: "leave_room" });
    resetRoomView();
    state.statusText = t("pong.local.roomLeft", {}, "Raum verlassen");
    updateInterface();
  }

  function createRoom() {
    if (!isConnected()) {
      state.statusText = t("pong.local.connectFirst", {}, "Bitte zuerst verbinden");
      updateInterface();
      return;
    }

    const payload = { type: "create_room" };
    const playerName = getPlayerNameForPayload();
    if (playerName) {
      payload.playerName = playerName;
    }

    sendMessage(payload);
    state.statusText = t("pong.local.roomCreating", {}, "Raum wird erstellt");
    updateInterface();
  }

  function joinRoom() {
    joinRoomWithCode(elements.roomInput.value, false);
  }

  function buildShareUrl() {
    let shareUrl;

    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      shareUrl = new URL(window.location.href);
    } else {
      const fallbackUrl = elements.serverUrl.value.trim() || getDefaultServerUrl();
      shareUrl = new URL(fallbackUrl.replace(/^ws/i, "http"));
      shareUrl.pathname = "/pong.html";
      shareUrl.search = "";
      shareUrl.hash = "";
    }

    shareUrl.pathname = "/pong.html";
    shareUrl.searchParams.set("room", state.roomCode);
    return shareUrl.toString();
  }

  function copyText(text, successMessage) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      state.statusText = t("pong.local.copyFailed", {}, "Kopieren nicht moeglich");
      updateInterface();
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      state.statusText = successMessage;
      updateInterface();
    }).catch(() => {
      state.statusText = t("pong.local.copyFailed", {}, "Kopieren nicht moeglich");
      updateInterface();
    });
  }

  function copyRoomCode() {
    if (!state.roomCode) {
      return;
    }

    copyText(state.roomCode, t("pong.local.roomCodeCopied", { roomCode: state.roomCode }, `Raumcode ${state.roomCode} kopiert`));
  }

  function copyShareLink() {
    if (!state.roomCode) {
      return;
    }

    copyText(buildShareUrl(), t("pong.local.inviteCopied", { roomCode: state.roomCode }, `Einladungslink fuer ${state.roomCode} kopiert`));
  }

  function saveName(announce) {
    const normalized = normalizePlayerName(elements.playerName.value);
    if (!normalized) {
      state.statusText = t("pong.local.enterName", {}, "Bitte einen Namen eingeben");
      updateInterface();
      return;
    }

    state.selfName = normalized;
    elements.playerName.value = normalized;
    persistName(normalized);

    if (isConnected()) {
      sendMessage({ type: "set_name", playerName: normalized });
    }

    if (announce) {
      state.statusText = t("pong.local.nameSaved", { name: normalized }, `Name gespeichert: ${normalized}`);
      updateInterface();
    }
  }

  function requestRematch() {
    if (isConnected() && state.roomCode) {
      sendMessage({ type: "reset_match" });
      state.statusText = state.winner ? t("pong.local.rematchRequested", {}, "Rematch angefragt") : t("pong.local.resetRequested", {}, "Neue Runde angefragt");
      arcadeAudio.uiConfirm();
      updateInterface();
      canvas.focus();
    }
  }

  function sendPaddlePosition(force) {
    if (!isConnected() || !state.role || !state.roomCode) {
      return;
    }

    const now = performance.now();
    if (!force) {
      if (state.lastSentY !== null && Math.abs(state.lastSentY - state.localPaddleY) < 0.5 && now - state.lastSentAt < 50) {
        return;
      }
      if (now - state.lastSentAt < 16) {
        return;
      }
    }

    state.lastSentY = state.localPaddleY;
    state.lastSentAt = now;
    sendMessage({ type: "paddle", y: Math.round(state.localPaddleY * 100) / 100 });
  }

  function drawOverlay(title, subtitle) {
    context.fillStyle = "rgba(15, 23, 42, 0.82)";
    context.fillRect(0, 0, state.width, state.height);
    context.fillStyle = "#f8fafc";
    context.textAlign = "center";
    context.font = '600 34px Inter, "Segoe UI", sans-serif';
    context.fillText(title, state.width / 2, state.height / 2 - 18);
    context.fillStyle = "#cbd5e1";
    context.font = '16px Inter, "Segoe UI", sans-serif';
    context.fillText(subtitle, state.width / 2, state.height / 2 + 20);
  }

  function draw() {
    context.clearRect(0, 0, state.width, state.height);
    context.fillStyle = "#0b1220";
    context.fillRect(0, 0, state.width, state.height);

    context.strokeStyle = "rgba(148, 163, 184, 0.16)";
    context.setLineDash([14, 12]);
    context.beginPath();
    context.moveTo(state.width / 2, 0);
    context.lineTo(state.width / 2, state.height);
    context.stroke();
    context.setLineDash([]);

    const leftY = state.role === "left" ? state.localPaddleY : state.paddles.left;
    const rightY = state.role === "right" ? state.localPaddleY : state.paddles.right;

    context.fillStyle = "#f8fafc";
    context.fillRect(24, leftY, state.paddleWidth, state.paddleHeight);
    context.fillStyle = "#22c55e";
    context.fillRect(state.width - 24 - state.paddleWidth, rightY, state.paddleWidth, state.paddleHeight);

    context.shadowColor = "rgba(248, 250, 252, 0.3)";
    context.shadowBlur = 16;
    context.fillStyle = "#e2e8f0";
    context.beginPath();
    context.arc(state.ball.x, state.ball.y, state.ballRadius, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;

    if (!isConnected()) {
      drawOverlay(t("pong.canvas.offlineTitle", {}, "Offline"), t("pong.canvas.offlineText", {}, "Server starten und dann verbinden"));
      return;
    }

    if (!state.roomCode) {
      drawOverlay(t("pong.canvas.lobbyTitle", {}, "Lobby"), state.pendingAutoJoinRoomCode ? t("pong.canvas.lobbyInvite", { roomCode: state.pendingAutoJoinRoomCode }, `Einladung ${state.pendingAutoJoinRoomCode} wird vorbereitet`) : t("pong.canvas.lobbyText", {}, "Raum erstellen oder Code eingeben"));
      return;
    }

    if (!state.players.leftConnected || !state.players.rightConnected) {
      drawOverlay(t("pong.canvas.waitingTitle", {}, "Wartebereich"), t("pong.canvas.waitingText", { roomCode: state.roomCode }, `Raum ${state.roomCode} wartet auf Spieler 2`));
      return;
    }

    if (!state.running) {
      if (state.winner) {
        const youWon = state.role ? state.role === state.winner : false;
        drawOverlay(youWon ? t("pong.canvas.victory", {}, "Victory") : t("pong.canvas.gameOver", {}, "Game Over"), state.statusText || t("pong.button.newRound", {}, "Neue Runde starten"));
      } else {
        drawOverlay(t("pong.canvas.readyTitle", {}, "Bereit"), state.statusText || t("pong.canvas.readyText", {}, "Warte auf die Runde"));
      }
    }
  }

  let lastFrameTime = performance.now();

  function loop(now) {
    const deltaSeconds = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    if (state.role && isConnected() && state.roomCode) {
      const moveDirection = (state.keys.down ? 1 : 0) - (state.keys.up ? 1 : 0);
      if (moveDirection !== 0) {
        state.localPaddleY = clamp(
          state.localPaddleY + moveDirection * state.controlSpeed * deltaSeconds,
          0,
          state.height - state.paddleHeight,
        );
        sendPaddlePosition(false);
      }
    }

    draw();
    window.requestAnimationFrame(loop);
  }

  function handleKeydown(event) {
    const key = event.key.toLowerCase();
    if (["w", "s", "arrowup", "arrowdown"].includes(key)) {
      event.preventDefault();
    }
    if (key === "w" || key === "arrowup") {
      state.keys.up = true;
    }
    if (key === "s" || key === "arrowdown") {
      state.keys.down = true;
    }
  }

  function handleKeyup(event) {
    const key = event.key.toLowerCase();
    if (key === "w" || key === "arrowup") {
      state.keys.up = false;
    }
    if (key === "s" || key === "arrowdown") {
      state.keys.down = false;
    }
  }

  elements.serverUrl.value = getDefaultServerUrl();
  elements.playerName.value = state.selfName;
  elements.roomInput.value = state.pendingAutoJoinRoomCode;

  elements.playerName.addEventListener("input", () => {
    elements.playerName.value = normalizePlayerName(elements.playerName.value);
    updateInterface();
  });
  elements.playerName.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveName(true);
    }
  });
  elements.roomInput.addEventListener("input", () => {
    elements.roomInput.value = normalizeRoomCode(elements.roomInput.value);
    updateInterface();
  });
  elements.roomInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      joinRoom();
    }
  });
  elements.connect.addEventListener("click", connect);
  elements.disconnect.addEventListener("click", () => closeSocket(t("pong.local.connectionClosed", {}, "Verbindung getrennt")));
  elements.saveName.addEventListener("click", () => saveName(true));
  elements.copyLink.addEventListener("click", copyShareLink);
  elements.createRoom.addEventListener("click", createRoom);
  elements.joinRoom.addEventListener("click", joinRoom);
  elements.copyCode.addEventListener("click", copyRoomCode);
  elements.leaveRoom.addEventListener("click", leaveRoom);
  elements.reset.addEventListener("click", requestRematch);
  if (elements.matchAction) {
    elements.matchAction.addEventListener("click", requestRematch);
  }
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("keyup", handleKeyup);
  canvas.addEventListener("pointerdown", () => {
    canvas.focus();
    arcadeAudio.unlock();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!state.role) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleY = state.height / rect.height;
    const relativeY = (event.clientY - rect.top) * scaleY;
    state.localPaddleY = clamp(relativeY - state.paddleHeight / 2, 0, state.height - state.paddleHeight);
    sendPaddlePosition(true);
  });

  if (state.pendingAutoJoinRoomCode) {
    state.statusText = t("pong.local.inviteDetected", { roomCode: state.pendingAutoJoinRoomCode }, `Einladungslink fuer Raum ${state.pendingAutoJoinRoomCode} erkannt`);
  }

  registerArcadeUiRefresh(() => {
    if (state.connecting) {
      state.connection = t("pong.connection.connecting", {}, "Verbinde...");
    } else if (isConnected()) {
      state.connection = t("pong.connection.connected", {}, "Verbunden");
    }
    updateInterface();
    draw();
  });

  updateInterface();
  draw();
  window.requestAnimationFrame(loop);

  if (state.pendingAutoJoinRoomCode) {
    connect();
  }
}

function initMemoryPage() {
  const grid = document.querySelector("#memory-grid");
  if (!grid) {
    return;
  }

  const resetButton = document.querySelector("#memory-reset");
  const movesEl = document.querySelector("#memory-moves");
  const matchesEl = document.querySelector("#memory-matches");
  const statusEl = document.querySelector("#memory-status");
  const elements = {
    overlay: document.querySelector("#memory-overlay"),
    overlayTitle: document.querySelector("#memory-overlay-title"),
    overlayText: document.querySelector("#memory-overlay-text"),
    overlayMeta: document.querySelector("#memory-overlay-meta"),
    overlayAction: document.querySelector("#memory-overlay-action"),
  };
  const symbols = ["JOY", "PIX", "RAM", "DOS", "WAV", "VHS", "ZAP", "WIN"];
  const state = {
    cards: [],
    flipped: [],
    moves: 0,
    matches: 0,
    busy: false,
    timeoutId: null,
    phase: "intro",
    lastStatusKey: "memory.status.ready",
    lastStatusFallback: "Bereit",
    lastStatusVars: {},
    lastRunWasBest: false,
  };

  function setMemoryStatus(key, fallback, variables) {
    state.lastStatusKey = key;
    state.lastStatusFallback = fallback;
    state.lastStatusVars = variables || {};
    statusEl.textContent = t(key, state.lastStatusVars, fallback);
  }

  function getOverlayRecordText() {
    const bestMoves = getMemoryBestMoves();
    return bestMoves === null
      ? t("memory.best.unknown", {}, "Bestwert: --")
      : t("memory.best.value", { value: bestMoves }, `Bestwert: ${bestMoves} Zuege`);
  }

  function renderOverlay(options) {
    if (!elements.overlay) {
      return;
    }

    const visible = Boolean(options && options.visible);
    elements.overlay.classList.toggle("is-hidden", !visible);
    if (!visible) {
      return;
    }

    elements.overlayTitle.textContent = options.title;
    elements.overlayText.textContent = options.text;
    elements.overlayMeta.textContent = options.meta || getOverlayRecordText();
    elements.overlayAction.textContent = options.actionLabel || t("memory.overlay.start", {}, "Runde starten");
  }

  function refreshMemoryLanguage() {
    setMemoryStatus(state.lastStatusKey, state.lastStatusFallback, state.lastStatusVars);
    grid.querySelectorAll(".memory-card").forEach((card) => {
      card.setAttribute("aria-label", t("memory.card.hidden", {}, "Verdeckte Karte"));
    });
    if (state.phase === "intro") {
      renderOverlay({
        visible: true,
        title: t("memory.overlay.title", {}, "Bereit fuer den Run"),
        text: t("memory.overlay.text", {}, "Starte eine Runde und finde alle acht Paare in moeglichst wenigen Zuegen."),
        meta: getOverlayRecordText(),
        actionLabel: t("memory.overlay.start", {}, "Runde starten"),
      });
    }
    if (state.phase === "won") {
      renderOverlay({
        visible: true,
        title: state.lastRunWasBest ? t("memory.status.newBest", {}, "Neuer Bestwert") : t("memory.status.done", {}, "Geschafft"),
        text: state.lastRunWasBest
          ? t("memory.finish.newBest", { moves: state.moves }, `Starker Run. Du hast alle Paare in ${state.moves} Zuegen geloest.`)
          : t("memory.finish.normal", { moves: state.moves }, `Runde beendet. Du hast ${state.moves} Zuege gebraucht.`),
        meta: getOverlayRecordText(),
        actionLabel: t("memory.overlay.replay", {}, "Nochmal spielen"),
      });
    }
  }

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function createCard(symbol, index) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "memory-card";
    button.dataset.symbol = symbol;
    button.dataset.index = String(index);
    button.setAttribute("aria-label", t("memory.card.hidden", {}, "Verdeckte Karte"));
    button.innerHTML = `
      <span class="memory-card-inner">
        <span class="memory-card-face memory-card-front">?</span>
        <span class="memory-card-face memory-card-back">${symbol}</span>
      </span>
    `;
    button.addEventListener("click", () => flipCard(button));
    return button;
  }

  function render() {
    grid.innerHTML = "";
    state.cards.forEach((card, index) => {
      grid.appendChild(createCard(card, index));
    });
  }

  function prepareBoard() {
    if (state.timeoutId) {
      window.clearTimeout(state.timeoutId);
      state.timeoutId = null;
    }

    state.cards = shuffle([...symbols, ...symbols]);
    state.flipped = [];
    state.moves = 0;
    state.matches = 0;
    state.busy = false;
    state.lastRunWasBest = false;
    movesEl.textContent = "0";
    matchesEl.textContent = "0";
    syncStoredRecords();
    render();
  }

  function openIntroScreen() {
    prepareBoard();
    state.phase = "intro";
    setMemoryStatus("memory.status.ready", "Bereit");
    renderOverlay({
      visible: true,
      title: t("memory.overlay.title", {}, "Bereit fuer den Run"),
      text: t("memory.overlay.text", {}, "Starte eine Runde und finde alle acht Paare in moeglichst wenigen Zuegen."),
      meta: getOverlayRecordText(),
      actionLabel: t("memory.overlay.start", {}, "Runde starten"),
    });
  }

  function startRun() {
    arcadeAudio.unlock();
    prepareBoard();
    recordArcadeStart("memory");
    state.phase = "running";
    setMemoryStatus("memory.status.running", "Laeuft");
    renderOverlay({ visible: false });
    arcadeAudio.startRound();
  }

  function finishRun() {
    const hasNewBest = storeMemoryBestMoves(state.moves);
    recordMemoryWin(state.moves);
    state.phase = "won";
    state.lastRunWasBest = hasNewBest;
    setMemoryStatus(hasNewBest ? "memory.status.newBest" : "memory.status.done", hasNewBest ? "Neuer Bestwert" : "Geschafft");
    renderOverlay({
      visible: true,
      title: hasNewBest ? t("memory.status.newBest", {}, "Neuer Bestwert") : t("memory.status.done", {}, "Geschafft"),
      text: hasNewBest
        ? t("memory.finish.newBest", { moves: state.moves }, `Starker Run. Du hast alle Paare in ${state.moves} Zuegen geloest.`)
        : t("memory.finish.normal", { moves: state.moves }, `Runde beendet. Du hast ${state.moves} Zuege gebraucht.`),
      meta: getOverlayRecordText(),
      actionLabel: t("memory.overlay.replay", {}, "Nochmal spielen"),
    });
    arcadeAudio.memoryWin();
  }

  function flipCard(button) {
    if (state.phase !== "running") {
      return;
    }

    if (state.busy || button.classList.contains("is-flipped") || button.classList.contains("is-matched")) {
      return;
    }

    button.classList.add("is-flipped");
    state.flipped.push(button);
    arcadeAudio.memoryFlip();

    if (state.flipped.length < 2) {
      setMemoryStatus("memory.status.oneMore", "Noch eine Karte");
      return;
    }

    state.moves += 1;
    movesEl.textContent = String(state.moves);
    const [first, second] = state.flipped;

    if (first.dataset.symbol === second.dataset.symbol) {
      first.classList.add("is-matched");
      second.classList.add("is-matched");
      state.flipped = [];
      state.matches += 1;
      matchesEl.textContent = String(state.matches);
      arcadeAudio.memoryMatch();

      if (state.matches === symbols.length) {
        finishRun();
      } else {
        setMemoryStatus("memory.status.hit", "Treffer");
      }
      return;
    }

    state.busy = true;
    setMemoryStatus("memory.status.miss", "Kein Paar");
    arcadeAudio.memoryMiss();
    state.timeoutId = window.setTimeout(() => {
      first.classList.remove("is-flipped");
      second.classList.remove("is-flipped");
      state.flipped = [];
      state.busy = false;
      state.timeoutId = null;
      setMemoryStatus("memory.status.continue", "Weiter");
    }, 700);
  }

  resetButton.addEventListener("click", startRun);
  elements.overlayAction.addEventListener("click", startRun);
  grid.addEventListener("pointerdown", () => arcadeAudio.unlock(), { passive: true });

  registerArcadeUiRefresh(refreshMemoryLanguage);
  openIntroScreen();
}

initSnakePage();
initPongPage();
initMemoryPage();

