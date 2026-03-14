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
  breakoutScore: "retroArcade.breakout.highScore",
  memoryBestMoves: "retroArcade.memory.bestMoves",
  profileName: "retroArcade.profile.name",
  soundEnabled: "retroArcade.audio.enabled",
  adDeaths: "retroArcade.ads.deathsSinceLastAd",
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

function storeSnakeHighScore(score) {
  const safeScore = sanitizeArcadeStatNumber(score);
  if (safeScore <= getSnakeHighScore()) {
    return false;
  }
  writeStoredNumber(arcadeStorageKeys.snakeScore, safeScore);
  syncStoredRecords();
  return true;
}

function getBreakoutHighScore() {
  return readStoredNumber(arcadeStorageKeys.breakoutScore) ?? 0;
}

function storeBreakoutHighScore(score) {
  const safeScore = sanitizeArcadeStatNumber(score);
  if (safeScore <= getBreakoutHighScore()) {
    return false;
  }
  writeStoredNumber(arcadeStorageKeys.breakoutScore, safeScore);
  syncStoredRecords();
  return true;
}

function getMemoryBestMoves() {
  const storedValue = readStoredNumber(arcadeStorageKeys.memoryBestMoves);
  return storedValue !== null && storedValue > 0 ? storedValue : null;
}

function storeMemoryBestMoves(moves) {
  const safeMoves = sanitizeArcadeBestMoves(moves);
  if (safeMoves === null) {
    return false;
  }
  const currentBestMoves = getMemoryBestMoves();
  if (currentBestMoves !== null && safeMoves >= currentBestMoves) {
    return false;
  }
  writeStoredNumber(arcadeStorageKeys.memoryBestMoves, safeMoves);
  syncStoredRecords();
  return true;
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
    neonMatch: {
      plays: 0,
      wins: 0,
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
  const rawNeonMatch = rawStats.neonMatch && typeof rawStats.neonMatch === "object" ? rawStats.neonMatch : {};
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
    neonMatch: {
      plays: sanitizeArcadeStatNumber(rawNeonMatch.plays),
      wins: sanitizeArcadeStatNumber(rawNeonMatch.wins),
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
  if (typeof arcadeAudio !== "undefined" && arcadeAudio && typeof arcadeAudio.syncMasterGain === "function") {
    arcadeAudio.syncMasterGain();
  }
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
    if (game === "neon-match") {
      stats.neonMatch.plays += 1;
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

function recordNeonMatchResult(didWin) {
  updateArcadeStats((stats) => {
    if (didWin) {
      stats.neonMatch.wins += 1;
      stats.totalWins += 1;
    }
    return stats;
  });
}

function formatArcadeNumber(value) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue)) {
    return "0";
  }
  try {
    return new Intl.NumberFormat(document.documentElement.lang || undefined).format(parsedValue);
  } catch (error) {
    return String(Math.round(parsedValue));
  }
}

function getArcadeDateLabel(daysAgo) {
  const safeDays = clamp(Number(daysAgo) || 0, 0, 365);
  const date = new Date();
  date.setDate(date.getDate() - safeDays);
  try {
    return new Intl.DateTimeFormat(document.documentElement.lang || undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch (error) {
    return `${date.getDate()}.${date.getMonth() + 1}.`;
  }
}

function getArcadeAvatarInitials(name) {
  const normalizedName = normalizeArcadeProfileName(name) || t("common.guest", {}, "Gast");
  const fragments = normalizedName.split(" ").filter(Boolean);
  if (fragments.length === 0) {
    return "GA";
  }
  if (fragments.length === 1) {
    return fragments[0].slice(0, 2).toUpperCase();
  }
  return `${fragments[0][0] || ""}${fragments[1][0] || ""}`.toUpperCase();
}

function getArcadeLevelData(stats, memoryBestMoves) {
  const memoryEfficiency = memoryBestMoves === null ? 0 : Math.max(0, 26 - memoryBestMoves) * 35;
  const xp = Math.round(
    stats.totalStarts * 35
    + stats.totalWins * 120
    + stats.snake.totalScore * 2.6
    + stats.snake.highScore * 12
    + stats.memory.plays * 24
    + stats.memory.wins * 110
    + stats.pong.matches * 35
    + stats.pong.wins * 180
    + stats.neonMatch.plays * 32
    + stats.neonMatch.wins * 160
    + memoryEfficiency
  );
  const levelSize = 450;
  const level = Math.floor(xp / levelSize) + 1;
  const levelFloor = (level - 1) * levelSize;
  const levelCeiling = level * levelSize;
  const progressPercent = clamp(((xp - levelFloor) / levelSize) * 100, 0, 100);

  let titleKey = "index.profile.level.rookie";
  if (level >= 9) {
    titleKey = "index.profile.level.legend";
  } else if (level >= 7) {
    titleKey = "index.profile.level.elite";
  } else if (level >= 5) {
    titleKey = "index.profile.level.pro";
  } else if (level >= 3) {
    titleKey = "index.profile.level.rising";
  }

  return {
    xp,
    level,
    levelFloor,
    levelCeiling,
    progressPercent,
    titleKey,
  };
}

function getArcadeSignatureFocusKey(stats, memoryBestMoves) {
  const snakeValue = stats.snake.highScore * 30 + stats.snake.plays * 12;
  const memoryValue = stats.memory.wins * 170 + (memoryBestMoves === null ? 0 : Math.max(0, 28 - memoryBestMoves) * 32);
  const pongValue = stats.pong.wins * 200 + stats.pong.matches * 26;
  const neonMatchValue = stats.neonMatch.wins * 210 + stats.neonMatch.plays * 28;

  if (neonMatchValue >= pongValue && neonMatchValue >= snakeValue && neonMatchValue >= memoryValue && neonMatchValue > 0) {
    return "neon-match";
  }
  if (pongValue >= snakeValue && pongValue >= memoryValue && pongValue > 0) {
    return "pong";
  }
  if (memoryValue >= snakeValue && memoryValue > 0) {
    return "memory";
  }
  if (snakeValue > 0) {
    return "snake";
  }
  return "arcade";
}

function getArcadeFocusLabel(focusKey) {
  switch (focusKey) {
    case "snake":
      return t("index.leaderboard.focus.snake", {}, "Snake");
    case "memory":
      return t("index.leaderboard.focus.memory", {}, "Memory");
    case "pong":
      return t("index.leaderboard.focus.pong", {}, "Pong");
    case "neon-match":
      return t("index.leaderboard.focus.neonMatch", {}, "Neon Match");
    default:
      return t("index.leaderboard.focus.arcade", {}, "Arcade");
  }
}

function buildArcadeLeaderboardEntries(stats, profileName, memoryBestMoves) {
  const levelData = getArcadeLevelData(stats, memoryBestMoves);
  const legends = [
    { name: "Nova Hex", focusKey: "snake", score: 4820, dateOffset: 0 },
    { name: "Mina Volt", focusKey: "pong", score: 4380, dateOffset: 1 },
    { name: "Echo Lynx", focusKey: "memory", score: 3940, dateOffset: 2 },
    { name: "Kiro Dash", focusKey: "snake", score: 3660, dateOffset: 4 },
    { name: "Sol Byte", focusKey: "pong", score: 3320, dateOffset: 7 },
  ];

  const entries = legends.map((legend) => ({
    name: legend.name,
    focusKey: legend.focusKey,
    focusLabel: getArcadeFocusLabel(legend.focusKey),
    score: legend.score,
    updatedLabel: getArcadeDateLabel(legend.dateOffset),
    subtitle: t("index.leaderboard.legendLabel", {}, "Arcade legend"),
    isCurrent: false,
  }));

  entries.push({
    name: profileName,
    focusKey: getArcadeSignatureFocusKey(stats, memoryBestMoves),
    focusLabel: getArcadeFocusLabel(getArcadeSignatureFocusKey(stats, memoryBestMoves)),
    score: levelData.xp,
    updatedLabel: getArcadeDateLabel(0),
    subtitle: t("index.leaderboard.currentLabel", {}, "Current pilot"),
    isCurrent: true,
  });

  return entries
    .sort((leftEntry, rightEntry) => {
      if (rightEntry.score !== leftEntry.score) {
        return rightEntry.score - leftEntry.score;
      }
      if (leftEntry.isCurrent !== rightEntry.isCurrent) {
        return leftEntry.isCurrent ? -1 : 1;
      }
      return leftEntry.name.localeCompare(rightEntry.name);
    })
    .map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));
}

function getArcadeAchievements(stats, snakeHighScore, memoryBestMoves) {
  const starterValue = stats.totalStarts;
  const snakeValue = snakeHighScore;
  const pongValue = stats.pong.wins;
  const memoryUnlocked = memoryBestMoves !== null && memoryBestMoves <= 18;
  const memoryRatio = memoryBestMoves === null ? 0 : clamp((30 - memoryBestMoves) / 12, 0, 1);

  return [
    {
      id: "starter",
      unlocked: starterValue >= 5,
      ratio: clamp(starterValue / 5, 0, 1),
      progressText: t(
        "index.achievement.starter.progress",
        { value: formatArcadeNumber(Math.min(starterValue, 5)), target: formatArcadeNumber(5) },
        `${formatArcadeNumber(Math.min(starterValue, 5))} / ${formatArcadeNumber(5)} starts`
      ),
    },
    {
      id: "snake",
      unlocked: snakeValue >= 20,
      ratio: clamp(snakeValue / 20, 0, 1),
      progressText: t(
        "index.achievement.snake.progress",
        { value: formatArcadeNumber(Math.min(snakeValue, 20)), target: formatArcadeNumber(20) },
        `${formatArcadeNumber(Math.min(snakeValue, 20))} / ${formatArcadeNumber(20)} score`
      ),
    },
    {
      id: "memory",
      unlocked: memoryUnlocked,
      ratio: memoryRatio,
      progressText: memoryBestMoves === null
        ? t("index.achievement.memory.none", {}, "No clear yet")
        : t(
          "index.achievement.memory.progress",
          { value: formatArcadeNumber(memoryBestMoves), target: formatArcadeNumber(18) },
          `Best ${formatArcadeNumber(memoryBestMoves)} / ${formatArcadeNumber(18)} moves`
        ),
    },
    {
      id: "pong",
      unlocked: pongValue >= 3,
      ratio: clamp(pongValue / 3, 0, 1),
      progressText: t(
        "index.achievement.pong.progress",
        { value: formatArcadeNumber(Math.min(pongValue, 3)), target: formatArcadeNumber(3) },
        `${formatArcadeNumber(Math.min(pongValue, 3))} / ${formatArcadeNumber(3)} wins`
      ),
    },
  ];
}

function renderArcadeLeaderboard(entries) {
  const labels = {
    rank: t("index.leaderboard.rank", {}, "Rank"),
    player: t("index.leaderboard.player", {}, "Player"),
    focus: t("index.leaderboard.focus", {}, "Focus"),
    score: t("index.leaderboard.score", {}, "Score"),
    updated: t("index.leaderboard.updated", {}, "Updated"),
  };

  document.querySelectorAll("[data-arcade-leaderboard-body]").forEach((tbody) => {
    tbody.textContent = "";

    entries.forEach((entry) => {
      const row = document.createElement("tr");
      row.className = "highscore-row";
      if (entry.isCurrent) {
        row.classList.add("is-current-player");
      }
      if (entry.rank === 1) {
        row.classList.add("is-top-rank");
      }

      const rankCell = document.createElement("td");
      rankCell.setAttribute("data-label", labels.rank);
      const rankBadge = document.createElement("span");
      rankBadge.className = "rank-badge";
      if (entry.rank === 1) {
        rankBadge.classList.add("gold");
      } else if (entry.rank === 2) {
        rankBadge.classList.add("silver");
      } else if (entry.rank === 3) {
        rankBadge.classList.add("bronze");
      }
      rankBadge.textContent = String(entry.rank);
      rankCell.appendChild(rankBadge);

      const playerCell = document.createElement("td");
      playerCell.setAttribute("data-label", labels.player);
      const userCell = document.createElement("div");
      userCell.className = "user-cell";
      const avatar = document.createElement("span");
      avatar.className = "user-avatar";
      avatar.textContent = getArcadeAvatarInitials(entry.name);
      const nameStack = document.createElement("div");
      const playerName = document.createElement("strong");
      playerName.textContent = entry.name;
      const subtitle = document.createElement("span");
      subtitle.className = "row-subtle";
      subtitle.textContent = entry.subtitle;
      nameStack.appendChild(playerName);
      nameStack.appendChild(subtitle);
      userCell.appendChild(avatar);
      userCell.appendChild(nameStack);
      playerCell.appendChild(userCell);

      const focusCell = document.createElement("td");
      focusCell.setAttribute("data-label", labels.focus);
      const focusChip = document.createElement("span");
      focusChip.className = "game-chip";
      focusChip.textContent = entry.focusLabel;
      focusCell.appendChild(focusChip);

      const scoreCell = document.createElement("td");
      scoreCell.className = "score-cell";
      scoreCell.setAttribute("data-label", labels.score);
      scoreCell.textContent = formatArcadeNumber(entry.score);

      const dateCell = document.createElement("td");
      dateCell.setAttribute("data-label", labels.updated);
      dateCell.textContent = entry.updatedLabel;

      row.appendChild(rankCell);
      row.appendChild(playerCell);
      row.appendChild(focusCell);
      row.appendChild(scoreCell);
      row.appendChild(dateCell);
      tbody.appendChild(row);
    });
  });
}

function syncArcadeDashboard(stats, profileName, snakeHighScore, memoryBestMoves) {
  const levelData = getArcadeLevelData(stats, memoryBestMoves);
  const levelTitle = t(levelData.titleKey, {}, "Rookie Pilot");
  const currentLevelXp = Math.max(levelData.xp - levelData.levelFloor, 0);
  const remainingXp = Math.max(levelData.levelCeiling - levelData.xp, 0);
  const achievements = getArcadeAchievements(stats, snakeHighScore, memoryBestMoves);
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  document.querySelectorAll("[data-arcade-avatar-initials]").forEach((node) => {
    node.textContent = getArcadeAvatarInitials(profileName);
  });
  document.querySelectorAll("[data-arcade-level-number]").forEach((node) => {
    node.textContent = String(levelData.level);
  });
  document.querySelectorAll("[data-arcade-level-title]").forEach((node) => {
    node.textContent = levelTitle;
  });
  document.querySelectorAll("[data-arcade-profile-status]").forEach((node) => {
    node.textContent = t("index.profile.status.local", {}, "Local pilot");
  });
  document.querySelectorAll("[data-arcade-xp-total]").forEach((node) => {
    node.textContent = `${formatArcadeNumber(levelData.xp)} XP`;
  });
  document.querySelectorAll("[data-arcade-xp-fill]").forEach((node) => {
    node.style.width = `${levelData.progressPercent.toFixed(1)}%`;
  });
  document.querySelectorAll("[data-arcade-xp-current]").forEach((node) => {
    node.textContent = t(
      "index.profile.xp.current",
      { value: formatArcadeNumber(currentLevelXp), level: formatArcadeNumber(levelData.level) },
      `${formatArcadeNumber(currentLevelXp)} XP in Level ${formatArcadeNumber(levelData.level)}`
    );
  });
  document.querySelectorAll("[data-arcade-xp-next]").forEach((node) => {
    node.textContent = t(
      "index.profile.xp.next",
      { value: formatArcadeNumber(remainingXp), level: formatArcadeNumber(levelData.level + 1) },
      `${formatArcadeNumber(remainingXp)} XP to Level ${formatArcadeNumber(levelData.level + 1)}`
    );
  });
  document.querySelectorAll("[data-arcade-badge-summary]").forEach((node) => {
    node.textContent = t(
      "index.achievement.summary",
      { unlocked: formatArcadeNumber(unlockedCount), total: formatArcadeNumber(achievements.length) },
      `${formatArcadeNumber(unlockedCount)} / ${formatArcadeNumber(achievements.length)} unlocked`
    );
  });

  achievements.forEach((achievement) => {
    document.querySelectorAll(`[data-achievement-card="${achievement.id}"]`).forEach((card) => {
      card.classList.toggle("is-unlocked", achievement.unlocked);
    });
    document.querySelectorAll(`[data-achievement-fill="${achievement.id}"]`).forEach((node) => {
      node.style.width = `${(achievement.ratio * 100).toFixed(1)}%`;
    });
    document.querySelectorAll(`[data-achievement-progress="${achievement.id}"]`).forEach((node) => {
      node.textContent = achievement.progressText;
    });
  });

  renderArcadeLeaderboard(buildArcadeLeaderboardEntries(stats, profileName, memoryBestMoves));
}

function getArcadeStatDisplayValue(statKey, stats) {
  switch (statKey) {
    case "total-starts":
      return formatArcadeNumber(stats.totalStarts);
    case "total-wins":
      return formatArcadeNumber(stats.totalWins);
    case "snake-plays":
      return formatArcadeNumber(stats.snake.plays);
    case "snake-total-score":
      return formatArcadeNumber(stats.snake.totalScore);
    case "memory-plays":
      return formatArcadeNumber(stats.memory.plays);
    case "memory-wins":
      return formatArcadeNumber(stats.memory.wins);
    case "pong-matches":
      return formatArcadeNumber(stats.pong.matches);
    case "pong-wins":
      return formatArcadeNumber(stats.pong.wins);
    case "pong-losses":
      return formatArcadeNumber(stats.pong.losses);
    case "pong-record":
      return `${formatArcadeNumber(stats.pong.wins)} - ${formatArcadeNumber(stats.pong.losses)}`;
    case "neon-match-plays":
      return formatArcadeNumber(stats.neonMatch.plays);
    case "neon-match-wins":
      return formatArcadeNumber(stats.neonMatch.wins);
    default:
      return "0";
  }
}

const arcadeInteractiveAudioSelector = [
  ".button",
  ".nav-links a",
  ".pill",
  ".lang-chip",
  ".btn-text",
  ".neon-match-card",
  ".neon-match-draw-pile",
  "[data-nav-toggle]",
].join(", ");

function getArcadeSoundButtonIconMarkup(enabled) {
  return enabled
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6.8 8.5H3.5v7h3.3L11 19z"></path><path d="M15 9.2a4.5 4.5 0 0 1 0 5.6"></path><path d="M17.9 6.8a8.1 8.1 0 0 1 0 10.4"></path></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6.8 8.5H3.5v7h3.3L11 19z"></path><path d="m16 8 4 8"></path><path d="m20 8-4 8"></path></svg>';
}

function getArcadeSoundButtonMarkup(enabled, label) {
  return `<span class="sound-toggle-icon" aria-hidden="true">${getArcadeSoundButtonIconMarkup(enabled)}</span><span class="sound-toggle-label">${label}</span>`;
}

function isArcadeAudioTargetDisabled(element) {
  return ("disabled" in element && Boolean(element.disabled)) || element.getAttribute("aria-disabled") === "true";
}

function bindArcadeInteractiveAudio(root = document) {
  root.querySelectorAll(arcadeInteractiveAudioSelector).forEach((element) => {
    if (element.dataset.arcadeAudioBound === "true") {
      return;
    }
    element.dataset.arcadeAudioBound = "true";
    element.addEventListener("pointerenter", () => {
      if (!isArcadeAudioTargetDisabled(element)) {
        arcadeAudio.uiHover();
      }
    });
    element.addEventListener("click", () => {
      if (!isArcadeAudioTargetDisabled(element)) {
        arcadeAudio.uiConfirm();
      }
    });
  });
}

function syncStoredRecords() {
  const snakeHighScore = getSnakeHighScore();
  document.querySelectorAll('[data-arcade-record="snake-score"]').forEach((node) => {
    node.textContent = formatArcadeNumber(snakeHighScore);
  });

  const breakoutHighScore = getBreakoutHighScore();
  document.querySelectorAll('[data-arcade-record="breakout-score"]').forEach((node) => {
    node.textContent = formatArcadeNumber(breakoutHighScore);
  });

  const memoryBestMoves = getMemoryBestMoves();
  document.querySelectorAll('[data-arcade-record="memory-best-moves"]').forEach((node) => {
    node.textContent = memoryBestMoves === null ? "--" : formatArcadeNumber(memoryBestMoves);
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
    button.innerHTML = getArcadeSoundButtonMarkup(soundEnabled, soundButtonText);
    button.setAttribute("aria-pressed", soundEnabled ? "true" : "false");
    button.setAttribute("aria-label", soundButtonText);
    button.setAttribute("data-sound-state", soundEnabled ? "on" : "off");
  });
  document.querySelectorAll('[data-arcade-sound-label]').forEach((node) => {
    node.textContent = soundLabelText;
  });

  const stats = getArcadeStats();
  document.querySelectorAll('[data-arcade-stat]').forEach((node) => {
    node.textContent = getArcadeStatDisplayValue(node.getAttribute('data-arcade-stat'), stats);
  });

  bindArcadeInteractiveAudio();
  syncArcadeDashboard(stats, profileName, snakeHighScore, memoryBestMoves);
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

  document.querySelectorAll('[data-nav-toggle]').forEach((button) => {
    if (button.dataset.arcadeBound === 'true') {
      return;
    }
    button.dataset.arcadeBound = 'true';

    const header = button.closest('.main-header');
    const controlledId = button.getAttribute('aria-controls');
    const nav = controlledId ? document.getElementById(controlledId) : (header ? header.querySelector('.main-nav') : null);
    if (!header) {
      return;
    }

    const syncNavState = () => {
      const expanded = header.classList.contains('is-nav-open');
      button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      button.setAttribute('aria-label', expanded ? t('common.navClose', {}, 'Menue schliessen') : t('common.navOpen', {}, 'Menue oeffnen'));
    };

    button.addEventListener('click', () => {
      header.classList.toggle('is-nav-open');
      syncNavState();
    });

    if (nav) {
      nav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          if (!window.matchMedia('(max-width: 860px)').matches) {
            return;
          }
          header.classList.remove('is-nav-open');
          syncNavState();
        });
      });
    }

    window.addEventListener('resize', () => {
      if (window.innerWidth > 860 && header.classList.contains('is-nav-open')) {
        header.classList.remove('is-nav-open');
      }
      syncNavState();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && header.classList.contains('is-nav-open')) {
        header.classList.remove('is-nav-open');
        syncNavState();
      }
    });

    registerArcadeUiRefresh(syncNavState);
    syncNavState();
  });

  const arcadeLobby = document.querySelector('.arcade-lobby');
  const revealCards = arcadeLobby ? Array.from(arcadeLobby.querySelectorAll('[data-reveal-card]')) : [];
  if (arcadeLobby && revealCards.length > 0) {
    arcadeLobby.classList.add('is-reveal-ready');
    revealCards.forEach((card, index) => {
      card.style.setProperty('--reveal-delay', `${Math.min(index * 80, 240)}ms`);
    });

    if ('IntersectionObserver' in window) {
      const observer = new window.IntersectionObserver((entries, activeObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add('is-visible');
          activeObserver.unobserve(entry.target);
        });
      }, {
        threshold: 0.18,
        rootMargin: '0px 0px -10% 0px',
      });

      revealCards.forEach((card) => {
        observer.observe(card);
      });
    } else {
      revealCards.forEach((card) => {
        card.classList.add('is-visible');
      });
    }
  }

  const gameGrid = document.querySelector('[data-game-grid]');
  const gameSearch = document.querySelector('[data-game-search]');
  const emptyState = document.querySelector('[data-game-grid-empty]');
  const filterButtons = Array.from(document.querySelectorAll('[data-filter-button]'));
  const gameCards = gameGrid ? Array.from(gameGrid.querySelectorAll('[data-game-card]')) : [];
  if (gameGrid && gameSearch && emptyState && filterButtons.length > 0 && gameCards.length > 0) {
    let activeFilter = 'all';
    let searchDebounceId = 0;
    let filterFeedbackId = 0;

    const updateActiveFilterButton = () => {
      filterButtons.forEach((button) => {
        const isActive = button.dataset.filter === activeFilter;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    };

    const triggerFilterFeedback = () => {
      gameGrid.classList.remove('is-filtering');
      void gameGrid.offsetWidth;
      gameGrid.classList.add('is-filtering');
      window.clearTimeout(filterFeedbackId);
      filterFeedbackId = window.setTimeout(() => {
        gameGrid.classList.remove('is-filtering');
      }, 220);
    };

    const applyGameFilters = (options) => {
      const shouldAnimate = !(options && options.animate === false);
      const query = String(gameSearch.value || '').trim().toLowerCase();
      let visibleCount = 0;

      gameCards.forEach((card) => {
        const categories = String(card.dataset.gameCategory || '').toLowerCase().split(/\s+/).filter(Boolean);
        const searchIndex = String(card.dataset.searchIndex || card.textContent || '').toLowerCase();
        const matchesFilter = activeFilter === 'all' || categories.includes(activeFilter);
        const matchesSearch = query === '' || searchIndex.includes(query);
        const isVisible = matchesFilter && matchesSearch;

        card.hidden = !isVisible;
        card.classList.toggle('is-filtered-out', !isVisible);
        card.setAttribute('aria-hidden', isVisible ? 'false' : 'true');

        if (isVisible) {
          visibleCount += 1;
        }
      });

      emptyState.hidden = visibleCount > 0;

      if (shouldAnimate) {
        triggerFilterFeedback();
      }
    };

    filterButtons.forEach((button) => {
      if (button.dataset.arcadeBound === 'true') {
        return;
      }
      button.dataset.arcadeBound = 'true';
      button.addEventListener('click', () => {
        activeFilter = button.dataset.filter || 'all';
        updateActiveFilterButton();
        applyGameFilters({ animate: true });
      });
    });

    if (gameSearch.dataset.arcadeBound !== 'true') {
      gameSearch.dataset.arcadeBound = 'true';
      gameSearch.addEventListener('input', () => {
        window.clearTimeout(searchDebounceId);
        searchDebounceId = window.setTimeout(() => {
          applyGameFilters({ animate: true });
        }, 200);
      });
    }

    registerArcadeUiRefresh(() => {
      updateActiveFilterButton();
    });

    updateActiveFilterButton();
    applyGameFilters({ animate: false });
  }

  syncStoredRecords();
}

syncStoredRecords();
registerArcadeUiRefresh(syncStoredRecords);
class SoundManager {
  constructor() {
    if (SoundManager.instance) {
      return SoundManager.instance;
    }

    this.AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.context = null;
    this.masterGain = null;
    this.baseMasterGainValue = 0.05;
    this.temporaryMuteDepth = 0;
    this.lastHoverAt = 0;
    this.hoverCooldownMs = 50;
    this.gameProfiles = {
      snake: {
        start: [
          { frequency: 460, duration: 0.05, gain: 0.24, type: "square", filterType: "lowpass", filterFrequency: 1400, release: 0.03 },
          { frequency: 620, duration: 0.07, gain: 0.2, time: 0.05, type: "square", filterType: "lowpass", filterFrequency: 1500, release: 0.04 },
        ],
        eat: [
          { frequency: 420, endFrequency: 820, duration: 0.11, gain: 0.3, type: "square", filterType: "lowpass", filterFrequency: 1250, endFilterFrequency: 2400, attack: 0.005, release: 0.05 },
          { frequency: 560, endFrequency: 980, duration: 0.08, gain: 0.16, time: 0.03, type: "sawtooth", filterType: "lowpass", filterFrequency: 980, endFilterFrequency: 1800, attack: 0.004, release: 0.04 },
        ],
        lose: [
          { frequency: 320, endFrequency: 150, duration: 0.26, gain: 0.32, type: "sawtooth", filterType: "lowpass", filterFrequency: 900, endFilterFrequency: 260, attack: 0.008, release: 0.14, detune: 6 },
          { frequency: 270, endFrequency: 120, duration: 0.3, gain: 0.2, time: 0.04, type: "square", filterType: "lowpass", filterFrequency: 720, endFilterFrequency: 200, attack: 0.01, release: 0.16, detune: -6 },
        ],
        highScore: [
          { frequency: 523.25, duration: 0.07, gain: 0.24, type: "square", filterType: "lowpass", filterFrequency: 1800, release: 0.04 },
          { frequency: 659.25, duration: 0.08, gain: 0.22, time: 0.07, type: "square", filterType: "lowpass", filterFrequency: 1900, release: 0.04 },
          { frequency: 783.99, duration: 0.12, gain: 0.26, time: 0.15, type: "square", filterType: "lowpass", filterFrequency: 2100, release: 0.06 },
        ],
      },
      pong: {
        start: [
          { frequency: 330, duration: 0.05, gain: 0.18, type: "triangle", filterType: "lowpass", filterFrequency: 1600, release: 0.03 },
          { frequency: 420, duration: 0.05, gain: 0.16, time: 0.05, type: "sine", filterType: "lowpass", filterFrequency: 1450, release: 0.03 },
        ],
        paddle: [
          { frequency: 440, duration: 0.08, gain: 0.24, type: "triangle", filterType: "lowpass", filterFrequency: 1800, release: 0.04 },
        ],
        wall: [
          { frequency: 220, duration: 0.07, gain: 0.18, type: "sine", filterType: "lowpass", filterFrequency: 920, release: 0.035 },
        ],
        score: [
          { frequency: 300, duration: 0.07, gain: 0.2, type: "triangle", filterType: "lowpass", filterFrequency: 1100, release: 0.04 },
          { frequency: 210, duration: 0.08, gain: 0.12, time: 0.06, type: "sine", filterType: "lowpass", filterFrequency: 820, release: 0.05 },
        ],
        win: [
          { frequency: 392, duration: 0.08, gain: 0.26, type: "triangle", filterType: "lowpass", filterFrequency: 1700, release: 0.04 },
          { frequency: 493.88, duration: 0.08, gain: 0.24, time: 0.08, type: "triangle", filterType: "lowpass", filterFrequency: 1700, release: 0.04 },
          { frequency: 587.33, duration: 0.12, gain: 0.28, time: 0.16, type: "sine", filterType: "lowpass", filterFrequency: 1600, release: 0.06 },
        ],
        lose: [
          { frequency: 280, endFrequency: 210, duration: 0.14, gain: 0.22, type: "triangle", filterType: "lowpass", filterFrequency: 760, endFilterFrequency: 260, attack: 0.01, release: 0.07 },
          { frequency: 190, endFrequency: 140, duration: 0.18, gain: 0.16, time: 0.08, type: "sine", filterType: "lowpass", filterFrequency: 480, endFilterFrequency: 190, attack: 0.01, release: 0.09 },
        ],
      },
      breakout: {
        start: [
          { frequency: 360, duration: 0.06, gain: 0.22, type: "square", filterType: "lowpass", filterFrequency: 1500, release: 0.03 },
          { frequency: 520, duration: 0.08, gain: 0.18, time: 0.05, type: "square", filterType: "lowpass", filterFrequency: 1800, release: 0.04 },
        ],
        paddle: [
          { frequency: 280, duration: 0.05, gain: 0.18, type: "triangle", filterType: "lowpass", filterFrequency: 1200, release: 0.03 },
        ],
        wall: [
          { frequency: 220, duration: 0.045, gain: 0.14, type: "sine", filterType: "lowpass", filterFrequency: 900, release: 0.025 },
        ],
        block: [
          { frequency: 520, endFrequency: 760, duration: 0.07, gain: 0.22, type: "square", filterType: "lowpass", filterFrequency: 1900, endFilterFrequency: 2400, release: 0.03 },
          { frequency: 780, duration: 0.05, gain: 0.1, time: 0.02, type: "square", filterType: "lowpass", filterFrequency: 2200, release: 0.025 },
        ],
        lose: [
          { frequency: 240, endFrequency: 120, duration: 0.24, gain: 0.24, type: "sawtooth", filterType: "lowpass", filterFrequency: 740, endFilterFrequency: 240, attack: 0.01, release: 0.12 },
          { frequency: 180, endFrequency: 90, duration: 0.3, gain: 0.14, time: 0.04, type: "square", filterType: "lowpass", filterFrequency: 520, endFilterFrequency: 180, attack: 0.01, release: 0.14 },
        ],
        highScore: [
          { frequency: 392, duration: 0.07, gain: 0.22, type: "square", filterType: "lowpass", filterFrequency: 1800, release: 0.03 },
          { frequency: 523.25, duration: 0.08, gain: 0.2, time: 0.06, type: "square", filterType: "lowpass", filterFrequency: 1900, release: 0.04 },
          { frequency: 659.25, duration: 0.11, gain: 0.22, time: 0.14, type: "triangle", filterType: "lowpass", filterFrequency: 1800, release: 0.05 },
        ],
      },
      neonMatch: {
        start: [
          { frequency: 320, duration: 0.06, gain: 0.18, type: "triangle", filterType: "lowpass", filterFrequency: 1400, release: 0.03 },
          { frequency: 420, duration: 0.08, gain: 0.12, time: 0.05, type: "sine", filterType: "lowpass", filterFrequency: 1600, release: 0.05 },
        ],
        deal: [
          { frequency: 540, endFrequency: 420, duration: 0.08, gain: 0.16, type: "triangle", filterType: "lowpass", filterFrequency: 1800, endFilterFrequency: 1100, release: 0.04 },
        ],
        play: [
          { frequency: 460, endFrequency: 620, duration: 0.09, gain: 0.18, type: "triangle", filterType: "lowpass", filterFrequency: 1600, endFilterFrequency: 2100, release: 0.04 },
          { frequency: 780, duration: 0.05, gain: 0.08, time: 0.02, type: "sine", release: 0.03 },
        ],
        draw: [
          { frequency: 260, endFrequency: 180, duration: 0.1, gain: 0.15, type: "sine", filterType: "lowpass", filterFrequency: 780, endFilterFrequency: 420, release: 0.05 },
        ],
        win: [
          { frequency: 392, duration: 0.09, gain: 0.22, type: "triangle", filterType: "lowpass", filterFrequency: 1700, release: 0.05 },
          { frequency: 523.25, duration: 0.11, gain: 0.18, time: 0.07, type: "triangle", filterType: "lowpass", filterFrequency: 1800, release: 0.06 },
          { frequency: 659.25, duration: 0.14, gain: 0.2, time: 0.15, type: "sine", filterType: "lowpass", filterFrequency: 1900, release: 0.08 },
        ],
        lose: [
          { frequency: 250, endFrequency: 140, duration: 0.2, gain: 0.18, type: "sawtooth", filterType: "lowpass", filterFrequency: 680, endFilterFrequency: 220, release: 0.1 },
          { frequency: 180, endFrequency: 110, duration: 0.24, gain: 0.12, time: 0.04, type: "square", filterType: "lowpass", filterFrequency: 520, endFilterFrequency: 180, release: 0.12 },
        ],
      },
      memory: {
        start: [
          { frequency: 280, endFrequency: 340, duration: 0.16, gain: 0.12, type: "sine", filterType: "lowpass", filterFrequency: 1400, release: 0.08, attack: 0.02 },
          { frequency: 420, duration: 0.12, gain: 0.08, time: 0.02, type: "sine", filterType: "lowpass", filterFrequency: 1600, release: 0.07, attack: 0.02 },
        ],
        flip: [
          { frequency: 300, endFrequency: 360, duration: 0.16, gain: 0.1, type: "sine", filterType: "lowpass", filterFrequency: 1200, release: 0.08, attack: 0.018 },
          { frequency: 480, duration: 0.11, gain: 0.06, time: 0.02, type: "sine", filterType: "lowpass", filterFrequency: 1600, release: 0.06, attack: 0.018 },
        ],
        match: [
          { frequency: 261.63, duration: 0.1, gain: 0.14, type: "sine", filterType: "lowpass", filterFrequency: 1700, release: 0.06, attack: 0.02 },
          { frequency: 329.63, duration: 0.1, gain: 0.13, time: 0.06, type: "sine", filterType: "lowpass", filterFrequency: 1700, release: 0.06, attack: 0.02 },
          { frequency: 392, duration: 0.12, gain: 0.14, time: 0.12, type: "sine", filterType: "lowpass", filterFrequency: 1800, release: 0.08, attack: 0.02 },
        ],
        miss: [
          { frequency: 170, endFrequency: 140, duration: 0.18, gain: 0.16, type: "sine", filterType: "lowpass", filterFrequency: 260, endFilterFrequency: 140, release: 0.1, attack: 0.02 },
        ],
        win: [
          { frequency: 392, duration: 0.12, gain: 0.16, type: "sine", filterType: "lowpass", filterFrequency: 1700, release: 0.08, attack: 0.02 },
          { frequency: 493.88, duration: 0.12, gain: 0.14, time: 0.08, type: "sine", filterType: "lowpass", filterFrequency: 1700, release: 0.08, attack: 0.02 },
          { frequency: 587.33, duration: 0.16, gain: 0.16, time: 0.16, type: "sine", filterType: "lowpass", filterFrequency: 1800, release: 0.1, attack: 0.025 },
        ],
        highScore: [
          { frequency: 329.63, duration: 0.11, gain: 0.14, type: "sine", filterType: "lowpass", filterFrequency: 1800, release: 0.08, attack: 0.02 },
          { frequency: 440, duration: 0.11, gain: 0.13, time: 0.08, type: "sine", filterType: "lowpass", filterFrequency: 1800, release: 0.08, attack: 0.02 },
          { frequency: 659.25, duration: 0.16, gain: 0.14, time: 0.16, type: "sine", filterType: "lowpass", filterFrequency: 1900, release: 0.1, attack: 0.025 },
        ],
      },
    };
    SoundManager.instance = this;
  }

  ensureContext() {
    if (!this.AudioContextClass) {
      return null;
    }

    if (!this.context) {
      this.context = new this.AudioContextClass();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.baseMasterGainValue;
      this.masterGain.connect(this.context.destination);
      this.syncMasterGain();
    }

    return this.context;
  }

  unlock() {
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {
        // Ignored: browsers may defer audio until the next gesture.
      });
    }

    this.syncMasterGain();
  }

  syncMasterGain() {
    if (!this.masterGain) {
      return;
    }

    const now = this.context ? this.context.currentTime : 0;
    const targetGain = !isArcadeSoundEnabled() || this.temporaryMuteDepth > 0 ? 0 : this.baseMasterGainValue;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(targetGain, now);
  }

  setTemporaryMuted(isMuted) {
    this.ensureContext();
    this.temporaryMuteDepth = isMuted
      ? this.temporaryMuteDepth + 1
      : Math.max(0, this.temporaryMuteDepth - 1);
    this.syncMasterGain();
  }

  isTemporarilyMuted() {
    return this.temporaryMuteDepth > 0;
  }

  canPlay() {
    const ctx = this.ensureContext();
    return Boolean(ctx && ctx.state !== "suspended" && this.masterGain && isArcadeSoundEnabled() && !this.isTemporarilyMuted());
  }

  playSynth(options, baseTime = null) {
    const ctx = this.ensureContext();
    if (!ctx || ctx.state === "suspended" || !this.masterGain || !isArcadeSoundEnabled() || this.isTemporarilyMuted()) {
      return;
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filterNode = options.filterType ? ctx.createBiquadFilter() : null;
    const startTime = (baseTime ?? ctx.currentTime) + (options.time || 0);
    const duration = options.duration || 0.08;
    const attack = Math.max(0.004, Math.min(duration * 0.4, options.attack || 0.01));
    const release = Math.max(0.02, Math.min(duration * 0.85, options.release || 0.06));
    const peakGain = Math.max(0.0001, (options.gain || 1) * this.masterGain.gain.value);
    const sustainGain = Math.max(peakGain * (options.sustain ?? 0.55), 0.0002);
    const releaseStart = Math.max(startTime + attack + 0.01, startTime + duration - release);

    oscillator.type = options.type || "square";
    oscillator.frequency.setValueAtTime(Math.max(1, options.frequency || 440), startTime);
    if (typeof options.endFrequency === "number") {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), startTime + duration);
    }
    if (typeof options.detune === "number") {
      oscillator.detune.setValueAtTime(options.detune, startTime);
    }

    if (filterNode) {
      filterNode.type = options.filterType;
      filterNode.frequency.setValueAtTime(options.filterFrequency || 1400, startTime);
      if (typeof options.endFilterFrequency === "number") {
        filterNode.frequency.exponentialRampToValueAtTime(Math.max(40, options.endFilterFrequency), startTime + duration);
      }
      if (typeof options.filterQ === "number") {
        filterNode.Q.setValueAtTime(options.filterQ, startTime);
      }
    }

    gainNode.gain.setValueAtTime(0.0001, startTime);
    gainNode.gain.linearRampToValueAtTime(peakGain, startTime + attack);
    gainNode.gain.exponentialRampToValueAtTime(sustainGain, releaseStart);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    oscillator.connect(filterNode || gainNode);
    if (filterNode) {
      filterNode.connect(gainNode);
    }
    gainNode.connect(this.masterGain);

    oscillator.onended = () => {
      oscillator.disconnect();
      if (filterNode) {
        filterNode.disconnect();
      }
      gainNode.disconnect();
    };

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.04);
  }

  playPattern(pattern) {
    if (!this.canPlay()) {
      return;
    }

    const baseTime = this.context.currentTime;
    pattern.forEach((step) => {
      this.playSynth(step, baseTime);
    });
  }

  getGamePattern(game, cue) {
    const profile = this.gameProfiles[game];
    if (!profile) {
      return null;
    }
    const pattern = profile[cue];
    if (!pattern) {
      return null;
    }
    return typeof pattern === "function" ? pattern() : pattern;
  }

  playGameSound(game, cue) {
    const pattern = this.getGamePattern(game, cue);
    if (pattern) {
      this.playPattern(pattern);
    }
  }

  uiHover() {
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - this.lastHoverAt < this.hoverCooldownMs) {
      return;
    }
    this.lastHoverAt = now;
    this.playPattern([
      { frequency: 1260, endFrequency: 1380, duration: 0.035, gain: 0.16, type: "sine", attack: 0.004, release: 0.02 },
    ]);
  }

  uiConfirm() {
    this.playPattern([
      { frequency: 180, duration: 0.09, gain: 0.48, type: "triangle", filterType: "lowpass", filterFrequency: 850, endFilterFrequency: 520, release: 0.05 },
      { frequency: 96, duration: 0.12, gain: 0.2, time: 0.012, type: "sine", release: 0.07 },
    ]);
  }

  modalReveal(state) {
    this.playPattern(state === "win"
      ? [
        { frequency: 240, endFrequency: 420, duration: 0.18, gain: 0.28, type: "sine", filterType: "lowpass", filterFrequency: 1200, endFilterFrequency: 880, attack: 0.02, release: 0.08 },
        { frequency: 620, endFrequency: 760, duration: 0.1, gain: 0.12, time: 0.06, type: "triangle", attack: 0.01, release: 0.05 },
      ]
      : [
        { frequency: 210, endFrequency: 300, duration: 0.16, gain: 0.2, type: "sine", filterType: "lowpass", filterFrequency: 780, endFilterFrequency: 520, attack: 0.02, release: 0.08 },
      ]);
  }

  highScore(game) {
    if (game) {
      this.playGameSound(game, "highScore");
      return;
    }
    this.playPattern([
      { frequency: 392, duration: 0.09, gain: 0.52, type: "triangle", filterType: "lowpass", filterFrequency: 1800, release: 0.05 },
      { frequency: 494, duration: 0.09, gain: 0.48, time: 0.08, type: "triangle", filterType: "lowpass", filterFrequency: 1800, release: 0.05 },
      { frequency: 588, duration: 0.12, gain: 0.52, time: 0.16, type: "triangle", filterType: "lowpass", filterFrequency: 1800, release: 0.07 },
    ]);
  }

  startRound(game) {
    if (game) {
      this.playGameSound(game, "start");
      return;
    }
    this.playPattern([
      { frequency: 340, duration: 0.06, gain: 0.4, type: "triangle", filterType: "lowpass", filterFrequency: 980, release: 0.04 },
      { frequency: 500, duration: 0.08, gain: 0.36, time: 0.06, type: "sine", attack: 0.01, release: 0.05 },
    ]);
  }

  snakeEat() {
    this.playGameSound("snake", "eat");
  }

  snakeCrash() {
    this.playGameSound("snake", "lose");
  }

  memoryFlip() {
    this.playGameSound("memory", "flip");
  }

  memoryMatch() {
    this.playGameSound("memory", "match");
  }

  memoryMiss() {
    this.playGameSound("memory", "miss");
  }

  memoryWin() {
    this.playGameSound("memory", "win");
  }

  pongPaddle() {
    this.playGameSound("pong", "paddle");
  }

  pongWall() {
    this.playGameSound("pong", "wall");
  }

  pongScore() {
    this.playGameSound("pong", "score");
  }

  pongWin(isWinner) {
    this.playGameSound("pong", isWinner ? "win" : "lose");
  }

  breakoutPaddle() {
    this.playGameSound("breakout", "paddle");
  }

  breakoutWall() {
    this.playGameSound("breakout", "wall");
  }

  breakoutBlock() {
    this.playGameSound("breakout", "block");
  }

  breakoutLose() {
    this.playGameSound("breakout", "lose");
  }

  neonMatchDeal() {
    this.playGameSound("neonMatch", "deal");
  }

  neonMatchPlay() {
    this.playGameSound("neonMatch", "play");
  }

  neonMatchDraw() {
    this.playGameSound("neonMatch", "draw");
  }

  neonMatchWin(didWin) {
    this.playGameSound("neonMatch", didWin ? "win" : "lose");
  }
}

const arcadeAudio = new SoundManager();
document.addEventListener("pointerdown", () => arcadeAudio.unlock(), { passive: true });
document.addEventListener("keydown", () => arcadeAudio.unlock());
window.addEventListener("storage", () => syncStoredRecords());
initGlobalArcadeUi();

const arcadeVisuals = (() => {
  const cabinetRuntime = new WeakMap();

  function now() {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  function readCssVar(element, name, fallback) {
    if (!element || typeof window.getComputedStyle !== "function") {
      return fallback;
    }

    const value = window.getComputedStyle(element).getPropertyValue(name).trim();
    return value || fallback;
  }

  function resolveCabinet(target) {
    if (!target || typeof target.closest !== "function") {
      return null;
    }

    return target.closest(".arcade-cabinet") || target.closest(".stage-viewport");
  }

  function getCabinetState(cabinet) {
    let state = cabinetRuntime.get(cabinet);
    if (!state) {
      state = {
        shakeFrameId: 0,
        shakeTimeoutId: 0,
      };
      cabinetRuntime.set(cabinet, state);
    }
    return state;
  }

  function triggerShake(target, durationMs = 360) {
    const cabinet = resolveCabinet(target);
    if (!cabinet) {
      return;
    }

    const state = getCabinetState(cabinet);
    if (state.shakeFrameId) {
      window.cancelAnimationFrame(state.shakeFrameId);
      state.shakeFrameId = 0;
    }
    if (state.shakeTimeoutId) {
      window.clearTimeout(state.shakeTimeoutId);
      state.shakeTimeoutId = 0;
    }

    cabinet.classList.remove("is-shaking");
    state.shakeFrameId = window.requestAnimationFrame(() => {
      cabinet.classList.add("is-shaking");
      state.shakeFrameId = 0;
      state.shakeTimeoutId = window.setTimeout(() => {
        cabinet.classList.remove("is-shaking");
        state.shakeTimeoutId = 0;
      }, durationMs);
    });
  }

  function setWinState(target, isActive) {
    const cabinet = resolveCabinet(target);
    if (!cabinet) {
      return;
    }

    cabinet.classList.toggle("cabinet-state-win", Boolean(isActive));
  }

  function createParticleSystem() {
    const activeParticles = [];

    return {
      activeParticles,
      emitBurst(options) {
        const count = Math.max(1, Math.floor(options.count || 10));
        const color = options.color || "#22c55e";
        const minSpeed = options.minSpeed ?? 48;
        const maxSpeed = options.maxSpeed ?? 124;
        const minSize = options.minSize ?? 3;
        const maxSize = options.maxSize ?? 7;
        const lifeMs = options.lifeMs ?? 420;
        const lift = options.lift ?? 28;
        const speedRange = Math.max(0, maxSpeed - minSpeed);
        const sizeRange = Math.max(0, maxSize - minSize);

        for (let index = 0; index < count; index += 1) {
          const angle = Math.random() * Math.PI * 2;
          const speed = minSpeed + Math.random() * speedRange;
          activeParticles.push({
            x: options.x,
            y: options.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - lift,
            size: minSize + Math.random() * sizeRange,
            ageMs: 0,
            lifeMs,
            color,
          });
        }
      },
      update(deltaMs) {
        if (!deltaMs || !activeParticles.length) {
          return;
        }

        const deltaSeconds = deltaMs / 1000;
        for (let index = activeParticles.length - 1; index >= 0; index -= 1) {
          const particle = activeParticles[index];
          particle.ageMs += deltaMs;
          if (particle.ageMs >= particle.lifeMs) {
            activeParticles.splice(index, 1);
            continue;
          }

          particle.x += particle.vx * deltaSeconds;
          particle.y += particle.vy * deltaSeconds;
          particle.vx *= 0.985;
          particle.vy = particle.vy * 0.985 + 22 * deltaSeconds;
        }
      },
      draw(context) {
        if (!activeParticles.length) {
          return;
        }

        context.save();
        activeParticles.forEach((particle) => {
          const lifeProgress = particle.ageMs / particle.lifeMs;
          const intensity = 1 - lifeProgress;
          const size = particle.size * (0.72 + intensity * 0.48);
          context.globalAlpha = intensity;
          context.fillStyle = particle.color;
          context.shadowColor = particle.color;
          context.shadowBlur = 16 * intensity;
          context.fillRect(
            particle.x - size / 2,
            particle.y - size / 2,
            size,
            size,
          );
        });
        context.restore();
      },
      clear() {
        activeParticles.length = 0;
      },
    };
  }

  function createImpactFlashes(keys, decayMs = 140) {
    const values = Object.create(null);
    keys.forEach((key) => {
      values[key] = 0;
    });

    return {
      trigger(key, strength = 1) {
        if (!(key in values)) {
          return;
        }

        values[key] = Math.max(values[key], strength);
      },
      update(deltaMs) {
        if (!deltaMs) {
          return;
        }

        const step = deltaMs / Math.max(decayMs, 1);
        keys.forEach((key) => {
          values[key] = Math.max(0, values[key] - step);
        });
      },
      read(key) {
        return clamp(values[key] || 0, 0, 1);
      },
      clear() {
        keys.forEach((key) => {
          values[key] = 0;
        });
      },
    };
  }

  function spawnParticles(system, options) {
    if (!system || typeof system.emitBurst !== "function") {
      return;
    }

    system.emitBurst(options);
  }

  return {
    now,
    readCssVar,
    resolveCabinet,
    triggerShake,
    triggerScreenShake: triggerShake,
    setWinState,
    spawnParticles,
    createParticleSystem,
    createImpactFlashes,
  };
})();

function getArcadeXpGain(previousStats, previousBestMoves, nextStats, nextBestMoves) {
  const previousXp = getArcadeLevelData(previousStats, previousBestMoves).xp;
  const nextXp = getArcadeLevelData(nextStats, nextBestMoves).xp;
  return Math.max(0, nextXp - previousXp);
}

function formatArcadeXpValue(xpValue) {
  return `+ ${formatArcadeNumber(Math.max(0, sanitizeArcadeStatNumber(xpValue)))} XP`;
}

class AdsManager {
  constructor() {
    if (AdsManager.instance) {
      return AdsManager.instance;
    }

    this.adInterval = 3;
    this.placeholderDurationMs = 5000;
    this.storageKey = arcadeStorageKeys.adDeaths;
    this.overlay = null;
    this.countdownValue = null;
    this.countdownLabel = null;
    this.hideTimeoutId = 0;
    this.countdownIntervalId = 0;
    this.placeholderTimeoutId = 0;
    this.activePromise = null;
    this.ensureOverlay();
    this.bindInteractionBlockers();
    AdsManager.instance = this;
  }

  getDeathCount() {
    return Math.max(0, sanitizeArcadeStatNumber(readStoredNumber(this.storageKey) ?? 0));
  }

  setDeathCount(value) {
    writeStoredNumber(this.storageKey, Math.max(0, sanitizeArcadeStatNumber(value)));
  }

  incrementDeathCount() {
    const nextValue = this.getDeathCount() + 1;
    this.setDeathCount(nextValue);
    return nextValue;
  }

  resetDeathCount() {
    this.setDeathCount(0);
  }

  ensureOverlay() {
    if (this.overlay) {
      return this.overlay;
    }

    const overlay = document.createElement("div");
    overlay.className = "ad-overlay";
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", t("ads.overlay.title", {}, "Kurze Werbepause"));
    overlay.tabIndex = -1;
    overlay.innerHTML = `
      <div class="ad-card">
        <p class="ad-kicker">Monetization Gateway</p>
        <h2 class="ad-title">${t("ads.overlay.title", {}, "Kurze Werbepause...")}</h2>
        <div class="ad-countdown" aria-live="assertive">
          <span class="ad-countdown-value">5</span>
          <span class="ad-countdown-label">${t("ads.overlay.seconds", {}, "Sekunden")}</span>
        </div>
        <p class="ad-note">${t("ads.overlay.note", {}, "Bitte einen Moment warten. Danach geht es sofort weiter.")}</p>
      </div>
    `;
    document.body.appendChild(overlay);

    this.overlay = overlay;
    this.countdownValue = overlay.querySelector(".ad-countdown-value");
    this.countdownLabel = overlay.querySelector(".ad-countdown-label");
    return overlay;
  }

  bindInteractionBlockers() {
    const blockWhenActive = (event) => {
      if (!this.isShowing()) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
    };

    ["click", "pointerdown", "pointerup", "keydown", "keyup", "submit"].forEach((eventName) => {
      document.addEventListener(eventName, blockWhenActive, true);
    });
  }

  isShowing() {
    return Boolean(this.overlay && this.overlay.classList.contains("is-visible"));
  }

  updateCountdown(secondsLeft) {
    if (this.countdownValue) {
      this.countdownValue.textContent = String(secondsLeft);
    }
    if (this.countdownLabel) {
      this.countdownLabel.textContent = secondsLeft === 1
        ? t("ads.overlay.second", {}, "Sekunde")
        : t("ads.overlay.seconds", {}, "Sekunden");
    }
  }

  showPlaceholderAd() {
    const overlay = this.ensureOverlay();
    window.clearTimeout(this.hideTimeoutId);
    window.clearTimeout(this.placeholderTimeoutId);
    window.clearInterval(this.countdownIntervalId);

    let secondsLeft = Math.max(1, Math.floor(this.placeholderDurationMs / 1000));
    this.updateCountdown(secondsLeft);
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    arcadeAudio.setTemporaryMuted(true);
    window.requestAnimationFrame(() => {
      overlay.classList.add("is-visible");
      overlay.focus();
    });

    return new Promise((resolve) => {
      const finishPlaceholder = () => {
        window.clearTimeout(this.placeholderTimeoutId);
        this.placeholderTimeoutId = 0;
        window.clearInterval(this.countdownIntervalId);
        this.countdownIntervalId = 0;
        overlay.classList.remove("is-visible");
        overlay.setAttribute("aria-hidden", "true");
        this.hideTimeoutId = window.setTimeout(() => {
          overlay.hidden = true;
          if (!document.querySelector(".modal-overlay.is-visible")) {
            document.body.classList.remove("modal-open");
          }
          arcadeAudio.setTemporaryMuted(false);
          this.hideTimeoutId = 0;
          resolve(true);
        }, 220);
      };

      this.countdownIntervalId = window.setInterval(() => {
        secondsLeft = Math.max(1, secondsLeft - 1);
        this.updateCountdown(secondsLeft);
      }, 1000);

      // SDK hook: replace this placeholder timeout with `requestAd().then(finishPlaceholder)`
      // once a real ad network callback is available.
      this.placeholderTimeoutId = window.setTimeout(() => {
        finishPlaceholder();
      }, this.placeholderDurationMs);
    });
  }

  checkAndShowAd() {
    if (this.activePromise) {
      return this.activePromise;
    }

    const nextDeathCount = this.incrementDeathCount();
    if (nextDeathCount < this.adInterval) {
      return Promise.resolve(false);
    }

    this.resetDeathCount();
    this.activePromise = this.showPlaceholderAd()
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        this.activePromise = null;
      });
    return this.activePromise;
  }
}

const adsManager = new AdsManager();

function createArcadeResultModal(modalId) {
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = modalId;
  overlay.hidden = true;
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <div class="result-card state-lose">
      <div class="result-header">
        <span class="result-icon" aria-hidden="true">TRY</span>
        <h2 class="result-title">Game Over</h2>
      </div>
      <p class="result-copy">Jump right back in and push your next run even higher.</p>
      <div class="result-body">
        <div class="score-display">
          <span class="label">Final Score</span>
          <span class="value">0</span>
        </div>
        <div class="xp-display">
          <span class="label">Arcade XP</span>
          <span class="value xp-text">+ 0 XP</span>
        </div>
      </div>
      <div class="result-actions">
        <button class="button button-secondary btn-outline btn-menu" type="button">${t("common.backToMenu", {}, "Back to main menu")}</button>
        <button class="button button-primary btn-play-again" type="button">${t("common.playAgain", {}, "Play again")}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const elements = {
    overlay,
    card: overlay.querySelector(".result-card"),
    icon: overlay.querySelector(".result-icon"),
    title: overlay.querySelector(".result-title"),
    copy: overlay.querySelector(".result-copy"),
    scoreLabel: overlay.querySelector(".score-display .label"),
    scoreValue: overlay.querySelector(".score-display .value"),
    xpLabel: overlay.querySelector(".xp-display .label"),
    xpValue: overlay.querySelector(".xp-display .value"),
    primary: overlay.querySelector(".btn-play-again"),
    secondary: overlay.querySelector(".btn-menu"),
  };

  [elements.primary, elements.secondary].forEach((button) => {
    button.dataset.arcadeAudioBound = "true";
    button.addEventListener("pointerenter", () => arcadeAudio.uiHover());
  });

  let hideTimeoutId = 0;
  let activeConfig = null;
  let activeSignature = "";
  let pendingSignature = "";

  function buildResultSignature(config) {
    if (config && config.resultKey) {
      return String(config.resultKey);
    }

    return JSON.stringify([
      modalId,
      config && config.state,
      config && config.title,
      config && config.scoreValue,
      config && config.xpValue,
      config && config.icon,
      config && config.message,
    ]);
  }

  function applyConfig(config) {
    activeConfig = config;
    elements.card.classList.remove("state-win", "state-lose");
    elements.card.classList.add(config.state === "win" ? "state-win" : "state-lose");
    elements.icon.textContent = config.icon || (config.state === "win" ? "WIN" : "TRY");
    elements.title.textContent = config.title || t("snake.status.gameOver", {}, "Game Over");
    elements.copy.textContent = config.message || "";
    elements.scoreLabel.textContent = config.scoreLabel || t("common.result.finalScore", {}, "Final Score");
    elements.scoreValue.textContent = config.scoreValue || "0";
    elements.xpLabel.textContent = config.xpLabel || t("common.result.arcadeXp", {}, "Arcade XP");
    elements.xpValue.textContent = config.xpValue || formatArcadeXpValue(0);
    elements.primary.textContent = config.primaryLabel || t("common.playAgain", {}, "Play again");
    elements.secondary.textContent = config.secondaryLabel || t("common.backToMenu", {}, "Back to main menu");
    elements.primary.disabled = Boolean(config.primaryDisabled);
  }

  function reveal(config, wasVisibleOverride = null) {
    const wasVisible = wasVisibleOverride === null ? overlay.classList.contains("is-visible") : wasVisibleOverride;
    applyConfig(config || {});
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    window.requestAnimationFrame(() => {
      overlay.classList.add("is-visible");
      if (!wasVisible) {
        arcadeAudio.modalReveal((config && config.state) === "win" ? "win" : "lose");
        elements.primary.focus();
      }
    });
  }

  function show(config) {
    window.clearTimeout(hideTimeoutId);
    const nextConfig = config || {};
    const nextSignature = buildResultSignature(nextConfig);
    const shouldGateWithAd = Boolean(nextConfig.countsAsDeath);

    if (pendingSignature && pendingSignature === nextSignature) {
      applyConfig(nextConfig);
      return;
    }

    if (shouldGateWithAd && activeSignature !== nextSignature) {
      pendingSignature = nextSignature;
      applyConfig(nextConfig);
      overlay.classList.remove("is-visible");
      overlay.hidden = true;
      overlay.setAttribute("aria-hidden", "true");

      adsManager.checkAndShowAd().then(() => {
        const canShowAfterAd = !nextConfig.canShowAfterAd || nextConfig.canShowAfterAd();
        pendingSignature = "";
        if (!canShowAfterAd) {
          activeSignature = "";
          return;
        }
        activeSignature = nextSignature;
        reveal(nextConfig, false);
      }).catch(() => {
        pendingSignature = "";
        activeSignature = nextSignature;
        reveal(nextConfig, false);
      });
      return;
    }

    activeSignature = nextSignature;
    reveal(nextConfig);
  }

  function hide() {
    window.clearTimeout(hideTimeoutId);
    activeSignature = "";
    pendingSignature = "";
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    hideTimeoutId = window.setTimeout(() => {
      overlay.hidden = true;
    }, 220);
  }

  elements.primary.addEventListener("click", () => {
    if (elements.primary.disabled) {
      return;
    }
    arcadeAudio.uiConfirm();
    if (activeConfig && typeof activeConfig.onPrimary === "function") {
      activeConfig.onPrimary();
    }
  });

  elements.secondary.addEventListener("click", () => {
    arcadeAudio.uiConfirm();
    if (activeConfig && typeof activeConfig.onSecondary === "function") {
      activeConfig.onSecondary();
      return;
    }
    window.location.href = "index.html";
  });

  return {
    show,
    hide,
    isVisible() {
      return overlay.classList.contains("is-visible");
    },
  };
}
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
  const resultModal = createArcadeResultModal("snake-result-modal");
  const cabinet = arcadeVisuals.resolveCabinet(canvas);
  const snakeParticles = arcadeVisuals.createParticleSystem();
  const snakeParticleColor = arcadeVisuals.readCssVar(canvas, "--primary", "#22c55e");
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
    lastResultXp: 0,
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

  function showSnakeResultModal() {
    const resultKey = `snake:${state.score}:${state.lastResultXp}:${state.lastRunWasHighScore ? 1 : 0}`;
    resultModal.show({
      state: state.lastRunWasHighScore ? "win" : "lose",
      icon: state.lastRunWasHighScore ? "ACE" : "TRY",
      title: state.lastRunWasHighScore ? t("snake.status.highscore", {}, "Neuer Highscore") : t("snake.status.gameOver", {}, "Game Over"),
      message: state.lastRunWasHighScore
        ? t("snake.finish.highscore", { score: state.score }, `Starker Lauf. Du hast ${state.score} Punkte erreicht.`)
        : t("snake.finish.normal", { score: state.score }, `Dein Lauf endet bei ${state.score} Punkten. Versuch es direkt noch einmal.`),
      scoreLabel: t("common.result.finalScore", {}, "Final Score"),
      scoreValue: formatArcadeNumber(state.score),
      xpLabel: t("common.result.arcadeXp", {}, "Arcade XP"),
      xpValue: formatArcadeXpValue(state.lastResultXp),
      primaryLabel: t("common.playAgain", {}, "Play again"),
      secondaryLabel: t("common.backToMenu", {}, "Back to main menu"),
      countsAsDeath: true,
      resultKey,
      canShowAfterAd: () => state.phase === "gameover" && resultKey === `snake:${state.score}:${state.lastResultXp}:${state.lastRunWasHighScore ? 1 : 0}`,
      onPrimary: () => startRun(),
    });
  }

  function draw(gameOver, deltaMs = 0) {
    snakeParticles.update(deltaMs);
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
    snakeParticles.draw(context);

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
      resultModal.hide();
      renderOverlay({
        visible: true,
        title: t("snake.overlay.title", {}, "Bereit fuer den Start"),
        text: t("snake.overlay.text", {}, "Starte eine Runde und jage einen moeglichst langen neon-gruenen Lauf."),
        meta: getOverlayRecordText(),
        actionLabel: t("snake.overlay.start", {}, "Spiel starten"),
      });
    }
    if (state.phase === "gameover") {
      renderOverlay({ visible: false });
      showSnakeResultModal();
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
    snakeParticles.clear();
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
    resultModal.hide();
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
    arcadeAudio.startRound("snake");
  }

  function openIntroScreen() {
    prepareRound();
    resultModal.hide();
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
    const previousStats = getArcadeStats();
    const previousBestMoves = getMemoryBestMoves();
    const hasNewHighScore = storeSnakeHighScore(state.score);
    recordSnakeFinish(state.score);
    const nextStats = getArcadeStats();
    state.lastResultXp = getArcadeXpGain(previousStats, previousBestMoves, nextStats, getMemoryBestMoves());
    state.phase = "gameover";
    state.lastRunWasHighScore = hasNewHighScore;
    setSnakeStatus(hasNewHighScore ? "snake.status.highscore" : "snake.status.gameOver", hasNewHighScore ? "Neuer Highscore" : "Game Over");
    stopGame();
    arcadeVisuals.triggerShake(cabinet);
    draw(true);
    renderOverlay({ visible: false });
    showSnakeResultModal();
    if (hasNewHighScore) {
      arcadeAudio.highScore("snake");
    } else {
      arcadeAudio.snakeCrash();
    }
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
      snakeParticles.emitBurst({
        x: state.food.x * state.tileSize + state.tileSize / 2,
        y: state.food.y * state.tileSize + state.tileSize / 2,
        color: snakeParticleColor,
        count: 14,
        minSpeed: 44,
        maxSpeed: 136,
        minSize: 4,
        maxSize: 8,
        lifeMs: 380,
        lift: 36,
      });
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

  let lastRenderAt = arcadeVisuals.now();

  function renderFrame(now) {
    const deltaMs = Math.min(34, Math.max(0, now - lastRenderAt));
    lastRenderAt = now;
    draw(state.phase === "gameover", deltaMs);
    window.requestAnimationFrame(renderFrame);
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
  window.requestAnimationFrame(renderFrame);
}

function initBreakoutPage() {
  const canvas = document.querySelector("#breakout-canvas");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  const resetButton = document.querySelector("#breakout-reset");
  const scoreEl = document.querySelector("#breakout-score");
  const bricksEl = document.querySelector("#breakout-bricks");
  const statusEl = document.querySelector("#breakout-status");
  const elements = {
    overlay: document.querySelector("#breakout-overlay"),
    overlayTitle: document.querySelector("#breakout-overlay-title"),
    overlayText: document.querySelector("#breakout-overlay-text"),
    overlayMeta: document.querySelector("#breakout-overlay-meta"),
    overlayAction: document.querySelector("#breakout-overlay-action"),
  };
  const resultModal = createArcadeResultModal("breakout-result-modal");
  const cabinet = arcadeVisuals.resolveCabinet(canvas);
  const breakoutParticles = arcadeVisuals.createParticleSystem();
  const breakoutPrimary = arcadeVisuals.readCssVar(canvas, "--primary", "#fb923c");
  const brickPalette = ["#fb7185", "#f97316", "#facc15", "#4ade80", "#38bdf8", "#a855f7"];
  const state = {
    width: canvas.width,
    height: canvas.height,
    paddleWidth: 136,
    paddleHeight: 16,
    paddleX: (canvas.width - 136) / 2,
    paddleY: canvas.height - 42,
    paddleSpeed: 820,
    ballRadius: 9,
    ball: {
      x: canvas.width / 2,
      y: canvas.height - 70,
      vx: 0,
      vy: 0,
    },
    brickRows: 6,
    brickCols: 8,
    brickGap: 10,
    brickTop: 82,
    brickSidePadding: 42,
    bricks: [],
    remainingBricks: 0,
    wave: 1,
    score: 0,
    phase: "intro",
    keys: { left: false, right: false },
    pointerX: null,
    lastFrameAt: arcadeVisuals.now(),
    lastStatusKey: "breakout.status.ready",
    lastStatusFallback: "Bereit",
    lastStatusVars: {},
    lastRunWasHighScore: false,
    lastResultXp: 0,
  };

  function setBreakoutStatus(key, fallback, variables) {
    state.lastStatusKey = key;
    state.lastStatusFallback = fallback;
    state.lastStatusVars = variables || {};
    statusEl.textContent = t(key, state.lastStatusVars, fallback);
  }

  function updateHud() {
    scoreEl.textContent = String(state.score);
    bricksEl.textContent = String(state.remainingBricks);
  }

  function getOverlayRecordText() {
    const bestScore = getBreakoutHighScore();
    return bestScore > 0
      ? t("breakout.best.value", { value: bestScore }, `Bestwert: ${bestScore}`)
      : t("breakout.best.open", {}, "Bestwert: Noch offen");
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
    elements.overlayAction.textContent = options.actionLabel || t("breakout.overlay.start", {}, "Runde starten");
  }

  function showBreakoutResultModal() {
    const resultKey = `breakout:${state.score}:${state.lastRunWasHighScore ? 1 : 0}`;
    resultModal.show({
      state: state.lastRunWasHighScore ? "win" : "lose",
      icon: state.lastRunWasHighScore ? "ACE" : "DROP",
      title: state.lastRunWasHighScore ? t("breakout.status.highscore", {}, "Neuer Bestwert") : t("breakout.status.gameOver", {}, "Ball verloren"),
      message: state.lastRunWasHighScore
        ? t("breakout.finish.highscore", { score: state.score }, `Starker Run. Du hast ${state.score} Punkte ueberlebt und einen neuen Rekord gesetzt.`)
        : t("breakout.finish.normal", { score: state.score }, `Der Ball ist weg. Dein Run endet bei ${state.score} Punkten.`),
      scoreLabel: t("common.result.finalScore", {}, "Final Score"),
      scoreValue: formatArcadeNumber(state.score),
      xpLabel: t("common.result.arcadeXp", {}, "Arcade XP"),
      xpValue: formatArcadeXpValue(state.lastResultXp),
      primaryLabel: t("common.playAgain", {}, "Play again"),
      secondaryLabel: t("common.backToMenu", {}, "Back to main menu"),
      countsAsDeath: true,
      resultKey,
      canShowAfterAd: () => state.phase === "gameover" && resultKey === `breakout:${state.score}:${state.lastRunWasHighScore ? 1 : 0}`,
      onPrimary: () => startRun(),
    });
  }

  function getBrickWidth() {
    return (state.width - state.brickSidePadding * 2 - state.brickGap * (state.brickCols - 1)) / state.brickCols;
  }

  function createBrickGrid() {
    const rows = [];
    const brickWidth = getBrickWidth();

    for (let rowIndex = 0; rowIndex < state.brickRows; rowIndex += 1) {
      const row = [];
      const maxHits = rowIndex < 2 ? 2 : 1;
      const color = brickPalette[rowIndex % brickPalette.length];
      for (let columnIndex = 0; columnIndex < state.brickCols; columnIndex += 1) {
        row.push({
          x: state.brickSidePadding + columnIndex * (brickWidth + state.brickGap),
          y: state.brickTop + rowIndex * (26 + state.brickGap),
          width: brickWidth,
          height: 26,
          hits: maxHits,
          maxHits,
          color,
          alive: true,
        });
      }
      rows.push(row);
    }

    return rows;
  }

  function resetBall(speedMultiplier = 1) {
    const launchTilt = (Math.random() * 0.9 - 0.45) * Math.PI;
    const baseSpeed = 320 * speedMultiplier;
    state.ball.x = state.paddleX + state.paddleWidth / 2;
    state.ball.y = state.paddleY - 22;
    state.ball.vx = Math.sin(launchTilt) * 210;
    state.ball.vy = -baseSpeed;
  }

  function prepareRound() {
    breakoutParticles.clear();
    state.wave = 1;
    state.score = 0;
    state.lastRunWasHighScore = false;
    state.lastResultXp = 0;
    state.pointerX = null;
    state.keys.left = false;
    state.keys.right = false;
    state.paddleX = (state.width - state.paddleWidth) / 2;
    state.bricks = createBrickGrid();
    state.remainingBricks = state.brickRows * state.brickCols;
    resetBall(1);
    updateHud();
    syncStoredRecords();
  }

  function advanceWave() {
    state.wave += 1;
    state.paddleX = (state.width - state.paddleWidth) / 2;
    state.bricks = createBrickGrid();
    state.remainingBricks = state.brickRows * state.brickCols;
    resetBall(1 + (state.wave - 1) * 0.08);
    updateHud();
    setBreakoutStatus("breakout.status.wave", "Neue Welle", { value: state.wave });
    arcadeAudio.startRound("breakout");
  }

  function refreshBreakoutLanguage() {
    setBreakoutStatus(state.lastStatusKey, state.lastStatusFallback, state.lastStatusVars);
    if (state.phase === "intro") {
      resultModal.hide();
      renderOverlay({
        visible: true,
        title: t("breakout.overlay.title", {}, "Neon Breakout ist bereit"),
        text: t("breakout.overlay.text", {}, "Halte den Ball am Leben, knacke die Neon-Bloecke und ueberlebe so viele Wellen wie moeglich."),
        meta: getOverlayRecordText(),
        actionLabel: t("breakout.overlay.start", {}, "Runde starten"),
      });
    }
    if (state.phase === "gameover") {
      renderOverlay({ visible: false });
      showBreakoutResultModal();
    }
  }

  function openIntroScreen() {
    prepareRound();
    resultModal.hide();
    state.phase = "intro";
    setBreakoutStatus("breakout.status.ready", "Bereit");
    renderOverlay({
      visible: true,
      title: t("breakout.overlay.title", {}, "Neon Breakout ist bereit"),
      text: t("breakout.overlay.text", {}, "Halte den Ball am Leben, knacke die Neon-Bloecke und ueberlebe so viele Wellen wie moeglich."),
      meta: getOverlayRecordText(),
      actionLabel: t("breakout.overlay.start", {}, "Runde starten"),
    });
  }

  function startRun() {
    arcadeAudio.unlock();
    prepareRound();
    resultModal.hide();
    recordArcadeStart("breakout");
    state.phase = "running";
    setBreakoutStatus("breakout.status.running", "Laeuft");
    renderOverlay({ visible: false });
    canvas.focus();
    arcadeAudio.startRound("breakout");
  }

  function finishRun() {
    state.phase = "gameover";
    state.lastResultXp = 0;
    setBreakoutStatus(state.lastRunWasHighScore ? "breakout.status.highscore" : "breakout.status.gameOver", state.lastRunWasHighScore ? "Neuer Bestwert" : "Ball verloren");
    arcadeVisuals.triggerScreenShake(cabinet);
    renderOverlay({ visible: false });
    showBreakoutResultModal();
    if (state.lastRunWasHighScore) {
      arcadeAudio.highScore("breakout");
    } else {
      arcadeAudio.breakoutLose();
    }
  }

  function updatePointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = state.width / rect.width;
    state.pointerX = (event.clientX - rect.left) * scaleX;
    state.paddleX = clamp(state.pointerX - state.paddleWidth / 2, 0, state.width - state.paddleWidth);
  }

  function updatePaddle(deltaSeconds) {
    if (state.pointerX !== null) {
      return;
    }

    const moveDirection = (state.keys.right ? 1 : 0) - (state.keys.left ? 1 : 0);
    if (moveDirection === 0) {
      return;
    }

    state.paddleX = clamp(
      state.paddleX + moveDirection * state.paddleSpeed * deltaSeconds,
      0,
      state.width - state.paddleWidth,
    );
  }

  function damageBrick(brick) {
    brick.hits -= 1;
    if (brick.hits > 0) {
      arcadeAudio.breakoutPaddle();
      setBreakoutStatus("breakout.status.crack", "Block angeknackst");
      return;
    }

    brick.alive = false;
    state.remainingBricks -= 1;
    state.score += brick.maxHits === 2 ? 40 : 25;
    const hasNewHighScore = storeBreakoutHighScore(state.score);
    if (hasNewHighScore) {
      state.lastRunWasHighScore = true;
    }
    updateHud();
    arcadeVisuals.spawnParticles(breakoutParticles, {
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height / 2,
      color: brick.color,
      count: 18,
      minSpeed: 56,
      maxSpeed: 170,
      minSize: 3,
      maxSize: 8,
      lifeMs: 420,
      lift: 28,
    });
    arcadeAudio.breakoutBlock();
    setBreakoutStatus(
      hasNewHighScore ? "breakout.status.highscoreBang" : "breakout.status.break",
      hasNewHighScore ? "Neuer Bestwert!" : "Block zerstoert",
    );

    if (state.remainingBricks === 0) {
      advanceWave();
    }
  }

  function handleBrickCollision(previousBall) {
    for (let rowIndex = 0; rowIndex < state.bricks.length; rowIndex += 1) {
      const row = state.bricks[rowIndex];
      for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
        const brick = row[columnIndex];
        if (!brick.alive) {
          continue;
        }

        const brickRight = brick.x + brick.width;
        const brickBottom = brick.y + brick.height;
        const overlaps =
          state.ball.x + state.ballRadius >= brick.x &&
          state.ball.x - state.ballRadius <= brickRight &&
          state.ball.y + state.ballRadius >= brick.y &&
          state.ball.y - state.ballRadius <= brickBottom;

        if (!overlaps) {
          continue;
        }

        const hitFromLeft = previousBall.x + state.ballRadius <= brick.x;
        const hitFromRight = previousBall.x - state.ballRadius >= brickRight;
        const hitFromTop = previousBall.y + state.ballRadius <= brick.y;
        const hitFromBottom = previousBall.y - state.ballRadius >= brickBottom;

        if (hitFromLeft) {
          state.ball.x = brick.x - state.ballRadius;
          state.ball.vx = -Math.abs(state.ball.vx);
        } else if (hitFromRight) {
          state.ball.x = brickRight + state.ballRadius;
          state.ball.vx = Math.abs(state.ball.vx);
        } else if (hitFromTop) {
          state.ball.y = brick.y - state.ballRadius;
          state.ball.vy = -Math.abs(state.ball.vy);
        } else if (hitFromBottom) {
          state.ball.y = brickBottom + state.ballRadius;
          state.ball.vy = Math.abs(state.ball.vy);
        } else {
          state.ball.vy *= -1;
        }

        damageBrick(brick);
        return true;
      }
    }

    return false;
  }

  function updateBall(deltaSeconds) {
    const previousBall = {
      x: state.ball.x,
      y: state.ball.y,
    };

    state.ball.x += state.ball.vx * deltaSeconds;
    state.ball.y += state.ball.vy * deltaSeconds;

    if (state.ball.x - state.ballRadius <= 0) {
      state.ball.x = state.ballRadius;
      state.ball.vx = Math.abs(state.ball.vx);
      arcadeAudio.breakoutWall();
    } else if (state.ball.x + state.ballRadius >= state.width) {
      state.ball.x = state.width - state.ballRadius;
      state.ball.vx = -Math.abs(state.ball.vx);
      arcadeAudio.breakoutWall();
    }

    if (state.ball.y - state.ballRadius <= 0) {
      state.ball.y = state.ballRadius;
      state.ball.vy = Math.abs(state.ball.vy);
      arcadeAudio.breakoutWall();
    }

    const paddleHit =
      state.ball.vy > 0 &&
      state.ball.y + state.ballRadius >= state.paddleY &&
      state.ball.y - state.ballRadius <= state.paddleY + state.paddleHeight &&
      state.ball.x >= state.paddleX &&
      state.ball.x <= state.paddleX + state.paddleWidth;

    if (paddleHit) {
      const impactRatio = clamp(
        (state.ball.x - (state.paddleX + state.paddleWidth / 2)) / (state.paddleWidth / 2),
        -1,
        1,
      );
      const speed = Math.min(560, Math.hypot(state.ball.vx, state.ball.vy) + 12);
      state.ball.y = state.paddleY - state.ballRadius;
      state.ball.vx = impactRatio * 340;
      state.ball.vy = -Math.max(260, speed - Math.abs(state.ball.vx) * 0.22);
      arcadeAudio.breakoutPaddle();
      setBreakoutStatus("breakout.status.deflect", "Abgewehrt");
    }

    handleBrickCollision(previousBall);

    if (state.ball.y - state.ballRadius > state.height) {
      finishRun();
    }
  }

  function drawBricks() {
    state.bricks.forEach((row) => {
      row.forEach((brick) => {
        if (!brick.alive) {
          return;
        }

        const isDamaged = brick.maxHits === 2 && brick.hits === 1;
        context.save();
        context.globalAlpha = isDamaged ? 0.78 : 1;
        context.fillStyle = brick.color;
        context.shadowColor = brick.color;
        context.shadowBlur = isDamaged ? 10 : 16;
        context.fillRect(brick.x, brick.y, brick.width, brick.height);
        context.fillStyle = "rgba(255, 255, 255, 0.14)";
        context.fillRect(brick.x, brick.y, brick.width, 4);
        if (brick.maxHits === 2 && brick.hits === 2) {
          context.fillStyle = "rgba(15, 23, 42, 0.5)";
          context.font = '700 11px "JetBrains Mono", monospace';
          context.textAlign = "center";
          context.fillText("2", brick.x + brick.width / 2, brick.y + brick.height / 2 + 4);
        }
        context.restore();
      });
    });
  }

  function draw() {
    context.clearRect(0, 0, state.width, state.height);
    context.fillStyle = "#0b1220";
    context.fillRect(0, 0, state.width, state.height);

    context.fillStyle = "rgba(248, 250, 252, 0.06)";
    for (let offset = 0; offset < state.width; offset += 48) {
      context.fillRect(offset, 58, 2, state.height - 116);
    }

    drawBricks();
    breakoutParticles.draw(context);

    context.save();
    context.fillStyle = breakoutPrimary;
    context.shadowColor = breakoutPrimary;
    context.shadowBlur = 18;
    context.fillRect(state.paddleX, state.paddleY, state.paddleWidth, state.paddleHeight);
    context.restore();

    context.save();
    context.fillStyle = "#f8fafc";
    context.shadowColor = "rgba(248, 250, 252, 0.4)";
    context.shadowBlur = 16;
    context.beginPath();
    context.arc(state.ball.x, state.ball.y, state.ballRadius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function loop(now) {
    const deltaMs = Math.min(34, Math.max(0, now - state.lastFrameAt));
    const deltaSeconds = deltaMs / 1000;
    state.lastFrameAt = now;

    breakoutParticles.update(deltaMs);
    if (state.phase === "running") {
      updatePaddle(deltaSeconds);
      updateBall(deltaSeconds);
    }

    draw();
    window.requestAnimationFrame(loop);
  }

  function handleKeydown(event) {
    const key = event.key.toLowerCase();
    if (["arrowleft", "arrowright", "a", "d", " "].includes(key)) {
      event.preventDefault();
    }
    if (key === "arrowleft" || key === "a") {
      state.pointerX = null;
      state.keys.left = true;
    }
    if (key === "arrowright" || key === "d") {
      state.pointerX = null;
      state.keys.right = true;
    }
    if (key === " " && state.phase !== "running") {
      startRun();
    }
  }

  function handleKeyup(event) {
    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "a") {
      state.keys.left = false;
    }
    if (key === "arrowright" || key === "d") {
      state.keys.right = false;
    }
  }

  resetButton.addEventListener("click", () => startRun());
  elements.overlayAction.addEventListener("click", () => startRun());
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("keyup", handleKeyup);
  canvas.addEventListener("pointerdown", (event) => {
    canvas.focus();
    arcadeAudio.unlock();
    if (state.phase !== "running") {
      startRun();
    }
    updatePointerPosition(event);
    if (typeof canvas.setPointerCapture === "function") {
      canvas.setPointerCapture(event.pointerId);
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    updatePointerPosition(event);
  });
  canvas.addEventListener("pointerleave", () => {
    state.pointerX = null;
  });

  registerArcadeUiRefresh(refreshBreakoutLanguage);
  openIntroScreen();
  state.lastFrameAt = arcadeVisuals.now();
  window.requestAnimationFrame(loop);
}

function initPongPage() {
  const canvas = document.querySelector("#pong-canvas");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  const elements = {
    canvas,
    lobbyScreen: document.querySelector("#pong-lobby-screen"),
    lobbyActions: document.querySelector("#pong-lobby-actions"),
    lobbyCreate: document.querySelector("#pong-lobby-create"),
    lobbyRoomInput: document.querySelector("#pong-lobby-room-input"),
    lobbyJoin: document.querySelector("#pong-lobby-join"),
    lobbyWaiting: document.querySelector("#pong-lobby-waiting"),
    lobbyRoomValue: document.querySelector("#pong-lobby-room-value"),
    lobbyRoomCopy: document.querySelector("#pong-lobby-room-copy"),
    lobbyStatusText: document.querySelector("#pong-lobby-status-text"),
    lobbyWaitingText: document.querySelector("#pong-lobby-waiting-text"),
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
  const resultModal = createArcadeResultModal("pong-result-modal");
  const cabinet = arcadeVisuals.resolveCabinet(canvas);
  const impactFlashes = arcadeVisuals.createImpactFlashes(["leftPaddle", "rightPaddle", "topWall", "bottomWall"]);
  const pongFlashColor = arcadeVisuals.readCssVar(canvas, "--primary", "#38bdf8");
  const pongBallColor = arcadeVisuals.readCssVar(canvas, "--text", "#f8fafc");
  const pongBallGlowColor = arcadeVisuals.readCssVar(canvas, "--primary-glow", "rgba(56, 189, 248, 0.32)");

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
    ballRadius: 8,
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
    pendingLobbyAction: null,
    lastResultXp: 0,
    lastBallVector: { x: 0, y: 0 },
    lastImpactAt: 0,
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

  function setRoomInputValue(value, sourceElement = null) {
    const normalized = normalizeRoomCode(value);
    if (elements.roomInput && sourceElement !== elements.roomInput) {
      elements.roomInput.value = normalized;
    }
    if (elements.lobbyRoomInput && sourceElement !== elements.lobbyRoomInput) {
      elements.lobbyRoomInput.value = normalized;
    }
    if (sourceElement) {
      sourceElement.value = normalized;
    }
    return normalized;
  }

  function queueLobbyAction(action) {
    state.pendingLobbyAction = action;
  }

  function consumePendingLobbyAction() {
    if (!isConnected() || state.roomCode || !state.pendingLobbyAction) {
      return false;
    }

    const pendingAction = state.pendingLobbyAction;
    state.pendingLobbyAction = null;

    if (pendingAction.type === "create") {
      createRoom();
      return true;
    }

    if (pendingAction.type === "join" && pendingAction.roomCode) {
      joinRoomWithCode(pendingAction.roomCode, Boolean(pendingAction.fromInvite));
      return true;
    }

    return false;
  }

  function getLobbyStatusText() {
    if (state.roomCode) {
      return state.statusText || t("pong.lobby.status.roomReady", {}, "Raum aktiv");
    }
    if (state.pendingLobbyAction && state.pendingLobbyAction.type === "join" && state.pendingLobbyAction.roomCode) {
      return t("pong.lobby.status.pendingJoin", { roomCode: state.pendingLobbyAction.roomCode }, `Raum ${state.pendingLobbyAction.roomCode} wird vorbereitet`);
    }
    if (state.pendingLobbyAction && state.pendingLobbyAction.type === "create") {
      return t("pong.lobby.status.pendingCreate", {}, "Dein Raum wird vorbereitet");
    }
    if (state.connecting) {
      return t("pong.lobby.status.connecting", {}, "Verbinde die Arena");
    }
    if (!isConnected()) {
      return t("pong.lobby.status.offline", {}, "Verbinde dich und starte das Matchmaking");
    }
    return t("pong.lobby.status.ready", {}, "Waehle jetzt Raum erstellen oder Code eingeben");
  }

  function getLobbyWaitingText() {
    if (!state.roomCode) {
      return t("pong.lobby.waiting.default", {}, "Warte auf deine Auswahl, dann geht es direkt in die Arena.");
    }
    if (state.players.leftConnected && state.players.rightConnected) {
      return t("pong.lobby.waiting.ready", {}, "Beide Spieler sind verbunden. Die Arena oeffnet sich.");
    }
    return t("pong.lobby.waiting.opponent", { roomCode: state.roomCode }, `Warte auf Herausforderer... Teile ${state.roomCode} oder tippe zum Kopieren.`);
  }

  function resetRoomView() {
    resultModal.hide();
    state.lastResultXp = 0;
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
    state.lastBallVector = { x: 0, y: 0 };
    state.lastImpactAt = 0;
    impactFlashes.clear();
    setRoomInputValue(state.pendingAutoJoinRoomCode || "");
  }

  function updateMatchOverlay() {
    if (elements.matchOverlay) {
      elements.matchOverlay.classList.add("is-hidden");
    }

    const bothPlayers = state.players.leftConnected && state.players.rightConnected;
    const showOverlay = Boolean(state.roomCode && state.winner && bothPlayers);
    if (!showOverlay) {
      resultModal.hide();
      return;
    }

    const winnerName = getSideName(state.winner) || (state.winner === "left" ? t("pong.side.left", {}, "Links") : t("pong.side.right", {}, "Rechts"));
    const youWon = state.role ? state.role === state.winner : false;
    const playerScore = state.role === "right" ? state.scores.right : state.scores.left;
    const opponentScore = state.role === "right" ? state.scores.left : state.scores.right;

    const resultKey = `pong:${state.roomCode}:${state.winner || "none"}:${state.scores.left}:${state.scores.right}`;
    resultModal.show({
      state: youWon ? "win" : "lose",
      icon: youWon ? "WIN" : "DUEL",
      title: youWon ? t("pong.overlay.winTitle", {}, "Du hast gewonnen") : t("pong.overlay.loseTitle", { winnerName }, `${winnerName} gewinnt dieses Match`),
      message: youWon
        ? t("pong.overlay.winText", {}, "Starke Runde. Der Raum bleibt offen, damit du direkt in die naechste Revanche springen kannst.")
        : t("pong.overlay.loseText", { winnerName }, `${winnerName} hat diese Runde geholt. Wenn beide verbunden bleiben, startet die Revanche sofort im selben Raum.`),
      scoreLabel: t("common.result.matchScore", {}, "Match Score"),
      scoreValue: `${formatArcadeNumber(playerScore)} - ${formatArcadeNumber(opponentScore)}`,
      xpLabel: t("common.result.arcadeXp", {}, "Arcade XP"),
      xpValue: formatArcadeXpValue(state.lastResultXp),
      primaryLabel: t("pong.button.rematch", {}, "Rematch starten"),
      secondaryLabel: t("common.backToMenu", {}, "Back to main menu"),
      primaryDisabled: !isConnected() || !state.roomCode || !bothPlayers,
      countsAsDeath: Boolean(state.role && !youWon),
      resultKey,
      canShowAfterAd: () => Boolean(
        state.roomCode &&
        state.winner &&
        state.players.leftConnected &&
        state.players.rightConnected &&
        resultKey === `pong:${state.roomCode}:${state.winner || "none"}:${state.scores.left}:${state.scores.right}`
      ),
      onPrimary: () => requestRematch(),
    });
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
    const roomInput = normalizeRoomCode(elements.roomInput.value || (elements.lobbyRoomInput ? elements.lobbyRoomInput.value : ""));
    const bothPlayers = state.players.leftConnected && state.players.rightConnected;
    const hasName = normalizePlayerName(elements.playerName.value).length > 0;
    const rematchReady = Boolean(state.winner && bothPlayers);
    const showPreGameLobby = !bothPlayers;
    const showWaitingLobby = hasRoom && !bothPlayers;
    const showActionLobby = !hasRoom;

    elements.connect.disabled = connected || connecting;
    elements.disconnect.disabled = !connected && !connecting;
    elements.saveName.disabled = connecting || !hasName;
    elements.createRoom.disabled = connecting || hasRoom;
    elements.joinRoom.disabled = connecting || roomInput.length < 4 || hasRoom;
    elements.leaveRoom.disabled = !connected || connecting || !hasRoom;
    elements.copyCode.disabled = !hasRoom;
    elements.copyLink.disabled = !hasRoom;
    elements.reset.disabled = !connected || connecting || !hasRoom || !bothPlayers;
    elements.reset.textContent = rematchReady ? t("pong.button.rematch", {}, "Rematch starten") : t("pong.button.newRound", {}, "Neue Runde");

    if (elements.lobbyCreate) {
      elements.lobbyCreate.disabled = connecting || hasRoom;
    }
    if (elements.lobbyJoin) {
      elements.lobbyJoin.disabled = connecting || roomInput.length < 4 || hasRoom;
    }
    if (elements.lobbyRoomValue) {
      elements.lobbyRoomValue.textContent = state.roomCode || "----";
    }
    if (elements.lobbyRoomCopy) {
      elements.lobbyRoomCopy.disabled = !hasRoom;
      elements.lobbyRoomCopy.setAttribute("aria-label", hasRoom ? `Raumcode ${state.roomCode} kopieren` : "Kein Raumcode verfuegbar");
    }
    if (elements.lobbyStatusText) {
      elements.lobbyStatusText.textContent = getLobbyStatusText();
    }
    if (elements.lobbyWaitingText) {
      elements.lobbyWaitingText.textContent = getLobbyWaitingText();
    }
    if (elements.lobbyScreen) {
      elements.lobbyScreen.classList.toggle("is-hidden", !showPreGameLobby);
      elements.lobbyScreen.setAttribute("aria-hidden", showPreGameLobby ? "false" : "true");
    }
    if (elements.lobbyActions) {
      elements.lobbyActions.classList.toggle("is-hidden", !showActionLobby);
      elements.lobbyActions.hidden = !showActionLobby;
    }
    if (elements.lobbyWaiting) {
      elements.lobbyWaiting.classList.toggle("is-hidden", !showWaitingLobby);
      elements.lobbyWaiting.hidden = !showWaitingLobby;
    }
    canvas.classList.toggle("is-obscured", showPreGameLobby);

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
    const previousBall = { ...state.ball };
    const previousBallVector = { ...state.lastBallVector };
    const previousStats = getArcadeStats();
    const previousBestMoves = getMemoryBestMoves();

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
    const currentBallVector = {
      x: state.ball.x - previousBall.x,
      y: state.ball.y - previousBall.y,
    };
    state.lastBallVector = currentBallVector;
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
      setRoomInputValue(state.roomCode);
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
    const canTriggerImpact = previousRunning && state.running && !previousWinner && !state.winner && !scoreChanged;
    if (canTriggerImpact) {
      const now = arcadeVisuals.now();
      const horizontalBounce =
        Math.abs(previousBallVector.x) > 1 &&
        Math.abs(currentBallVector.x) > 1 &&
        Math.sign(previousBallVector.x) !== Math.sign(currentBallVector.x);
      const verticalBounce =
        Math.abs(previousBallVector.y) > 1 &&
        Math.abs(currentBallVector.y) > 1 &&
        Math.sign(previousBallVector.y) !== Math.sign(currentBallVector.y);
      const nearSide =
        previousBall.x <= 56 ||
        previousBall.x >= state.width - 56 ||
        state.ball.x <= 56 ||
        state.ball.x >= state.width - 56;
      const nearWall =
        previousBall.y <= state.ballRadius + 12 ||
        previousBall.y >= state.height - state.ballRadius - 12 ||
        state.ball.y <= state.ballRadius + 12 ||
        state.ball.y >= state.height - state.ballRadius - 12;

      if (now - state.lastImpactAt > 55) {
        if (horizontalBounce && nearSide) {
          impactFlashes.trigger(currentBallVector.x > 0 ? "leftPaddle" : "rightPaddle");
          arcadeAudio.pongPaddle();
          state.lastImpactAt = now;
        } else if (verticalBounce && nearWall) {
          impactFlashes.trigger(currentBallVector.y > 0 ? "topWall" : "bottomWall");
          arcadeAudio.pongWall();
          state.lastImpactAt = now;
        }
      }
    }

    if (!previousRunning && state.running && state.players.leftConnected && state.players.rightConnected) {
      recordPongMatchStart();
      arcadeAudio.startRound("pong");
    }
    if (scoreChanged) {
      impactFlashes.clear();
      arcadeVisuals.triggerShake(cabinet);
    }
    if (previousRunning && !previousWinner && state.winner && state.role) {
      recordPongMatchResult(state.winner === state.role);
      state.lastResultXp = getArcadeXpGain(previousStats, previousBestMoves, getArcadeStats(), getMemoryBestMoves());
    } else if (!state.winner) {
      state.lastResultXp = 0;
    }
    if (!previousWinner && state.winner) {
      arcadeAudio.pongWin(Boolean(state.role) ? state.winner === state.role : true);
    } else if (scoreChanged) {
      arcadeAudio.pongScore();
    }

    updateInterface();
  }

  function joinRoomWithCode(roomCode, fromInvite) {
    const normalizedCode = setRoomInputValue(roomCode);
    if (normalizedCode.length < 4) {
      state.statusText = t("pong.local.validRoomCode", {}, "Bitte einen gueltigen Raumcode eingeben");
      updateInterface();
      return;
    }

    if (!isConnected()) {
      queueLobbyAction({ type: "join", roomCode: normalizedCode, fromInvite: Boolean(fromInvite) });
      state.statusText = fromInvite
        ? t("pong.local.autoJoinConnect", { roomCode: normalizedCode }, `Verbinde und trete Raum ${normalizedCode} bei.`)
        : t("pong.local.joinAfterConnect", { roomCode: normalizedCode }, `Verbinde und trete Raum ${normalizedCode} bei`);
      connect();
      updateInterface();
      return;
    }

    state.pendingLobbyAction = null;
    if (!fromInvite) {
      state.pendingAutoJoinRoomCode = "";
    }

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
      if (state.pendingAutoJoinRoomCode && !state.roomCode && !state.pendingLobbyAction) {
        queueLobbyAction({ type: "join", roomCode: state.pendingAutoJoinRoomCode, fromInvite: true });
        state.pendingAutoJoinRoomCode = "";
      }
      updateInterface();
      consumePendingLobbyAction();
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
    state.pendingAutoJoinRoomCode = "";
    if (!isConnected()) {
      queueLobbyAction({ type: "create" });
      state.statusText = t("pong.local.createAfterConnect", {}, "Verbinde und erstelle deinen Raum");
      connect();
      updateInterface();
      return;
    }

    state.pendingLobbyAction = null;
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
    const activeRoomCode = document.activeElement === elements.lobbyRoomInput
      ? elements.lobbyRoomInput.value
      : elements.roomInput.value;
    joinRoomWithCode(activeRoomCode, false);
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
      resultModal.hide();
      sendMessage({ type: "reset_match" });
      state.statusText = state.winner ? t("pong.local.rematchRequested", {}, "Rematch angefragt") : t("pong.local.resetRequested", {}, "Neue Runde angefragt");
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

  function drawPaddle(x, y, baseColor, flashIntensity) {
    if (flashIntensity > 0) {
      context.save();
      context.globalAlpha = 0.18 + flashIntensity * 0.4;
      context.fillStyle = pongFlashColor;
      context.shadowColor = pongFlashColor;
      context.shadowBlur = 26 * flashIntensity;
      context.fillRect(x - 3, y - 3, state.paddleWidth + 6, state.paddleHeight + 6);
      context.restore();
    }

    context.fillStyle = baseColor;
    context.fillRect(x, y, state.paddleWidth, state.paddleHeight);
  }

  function drawWallFlash(y, height, flashIntensity) {
    if (flashIntensity <= 0) {
      return;
    }

    context.save();
    context.globalAlpha = 0.12 + flashIntensity * 0.24;
    context.fillStyle = pongFlashColor;
    context.shadowColor = pongFlashColor;
    context.shadowBlur = 24 * flashIntensity;
    context.fillRect(0, y, state.width, height);
    context.restore();
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

  function draw(deltaMs = 0) {
    impactFlashes.update(deltaMs);
    context.clearRect(0, 0, state.width, state.height);
    context.fillStyle = "#0b1220";
    context.fillRect(0, 0, state.width, state.height);

    drawWallFlash(0, 10, impactFlashes.read("topWall"));
    drawWallFlash(state.height - 10, 10, impactFlashes.read("bottomWall"));

    context.strokeStyle = "rgba(148, 163, 184, 0.16)";
    context.setLineDash([14, 12]);
    context.beginPath();
    context.moveTo(state.width / 2, 0);
    context.lineTo(state.width / 2, state.height);
    context.stroke();
    context.setLineDash([]);

    const leftY = state.role === "left" ? state.localPaddleY : state.paddles.left;
    const rightY = state.role === "right" ? state.localPaddleY : state.paddles.right;

    drawPaddle(24, leftY, "#f8fafc", impactFlashes.read("leftPaddle"));
    drawPaddle(state.width - 24 - state.paddleWidth, rightY, "#22c55e", impactFlashes.read("rightPaddle"));

    const ballX = Math.round(state.ball.x);
    const ballY = Math.round(state.ball.y);
    context.save();
    context.fillStyle = pongBallColor;
    context.shadowColor = pongBallGlowColor;
    context.shadowBlur = 12;
    context.beginPath();
    context.arc(ballX, ballY, state.ballRadius, 0, Math.PI * 2);
    context.fill();
    context.restore();

    const showPreGameLobby = !state.players.leftConnected || !state.players.rightConnected;
    if (showPreGameLobby) {
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
    const deltaMs = Math.min(50, Math.max(0, now - lastFrameTime));
    const deltaSeconds = deltaMs / 1000;
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

    draw(deltaMs);
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
  setRoomInputValue(state.pendingAutoJoinRoomCode);

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
    setRoomInputValue(elements.roomInput.value, elements.roomInput);
    updateInterface();
  });
  elements.roomInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      joinRoom();
    }
  });
  if (elements.lobbyRoomInput) {
    elements.lobbyRoomInput.addEventListener("input", () => {
      setRoomInputValue(elements.lobbyRoomInput.value, elements.lobbyRoomInput);
      updateInterface();
    });
    elements.lobbyRoomInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        joinRoom();
      }
    });
  }
  elements.connect.addEventListener("click", () => {
    arcadeAudio.unlock();
    connect();
  });
  elements.disconnect.addEventListener("click", () => closeSocket(t("pong.local.connectionClosed", {}, "Verbindung getrennt")));
  elements.saveName.addEventListener("click", () => saveName(true));
  elements.copyLink.addEventListener("click", copyShareLink);
  elements.createRoom.addEventListener("click", () => {
    arcadeAudio.unlock();
    createRoom();
  });
  elements.joinRoom.addEventListener("click", () => {
    arcadeAudio.unlock();
    joinRoom();
  });
  if (elements.lobbyCreate) {
    elements.lobbyCreate.addEventListener("click", () => {
      arcadeAudio.unlock();
      createRoom();
    });
  }
  if (elements.lobbyJoin) {
    elements.lobbyJoin.addEventListener("click", () => {
      arcadeAudio.unlock();
      joinRoom();
    });
  }
  elements.copyCode.addEventListener("click", copyRoomCode);
  if (elements.lobbyRoomCopy) {
    elements.lobbyRoomCopy.addEventListener("click", copyRoomCode);
  }
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
    draw(0);
  });

  updateInterface();
  draw(0);
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
  const resultModal = createArcadeResultModal("memory-result-modal");
  const cabinet = arcadeVisuals.resolveCabinet(grid);
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
    lastResultXp: 0,
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

  function showMemoryResultModal() {
    resultModal.show({
      state: "win",
      icon: state.lastRunWasBest ? "BEST" : "WIN",
      title: state.lastRunWasBest ? t("memory.status.newBest", {}, "Neuer Bestwert") : t("memory.status.done", {}, "Geschafft"),
      message: state.lastRunWasBest
        ? t("memory.finish.newBest", { moves: state.moves }, `Starker Run. Du hast alle Paare in ${state.moves} Zuegen geloest.`)
        : t("memory.finish.normal", { moves: state.moves }, `Runde beendet. Du hast ${state.moves} Zuege gebraucht.`),
      scoreLabel: t("common.result.finalMoves", {}, "Final Moves"),
      scoreValue: formatArcadeNumber(state.moves),
      xpLabel: t("common.result.arcadeXp", {}, "Arcade XP"),
      xpValue: formatArcadeXpValue(state.lastResultXp),
      primaryLabel: t("common.playAgain", {}, "Play again"),
      secondaryLabel: t("common.backToMenu", {}, "Back to main menu"),
      onPrimary: () => startRun(),
    });
  }

  function refreshMemoryLanguage() {
    setMemoryStatus(state.lastStatusKey, state.lastStatusFallback, state.lastStatusVars);
    grid.querySelectorAll(".memory-card").forEach((card) => {
      card.setAttribute("aria-label", t("memory.card.hidden", {}, "Verdeckte Karte"));
    });
    if (state.phase === "intro") {
      resultModal.hide();
      renderOverlay({
        visible: true,
        title: t("memory.overlay.title", {}, "Bereit fuer den Run"),
        text: t("memory.overlay.text", {}, "Starte eine Runde und finde alle acht Paare in moeglichst wenigen Zuegen."),
        meta: getOverlayRecordText(),
        actionLabel: t("memory.overlay.start", {}, "Runde starten"),
      });
    }
    if (state.phase === "won") {
      renderOverlay({ visible: false });
      showMemoryResultModal();
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

    arcadeVisuals.setWinState(cabinet, false);
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
    resultModal.hide();
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
    resultModal.hide();
    recordArcadeStart("memory");
    state.phase = "running";
    setMemoryStatus("memory.status.running", "Laeuft");
    renderOverlay({ visible: false });
    arcadeAudio.startRound("memory");
  }

  function finishRun() {
    const previousStats = getArcadeStats();
    const previousBestMoves = getMemoryBestMoves();
    const hasNewBest = storeMemoryBestMoves(state.moves);
    recordMemoryWin(state.moves);
    const nextStats = getArcadeStats();
    state.lastResultXp = getArcadeXpGain(previousStats, previousBestMoves, nextStats, getMemoryBestMoves());
    state.phase = "won";
    state.lastRunWasBest = hasNewBest;
    setMemoryStatus(hasNewBest ? "memory.status.newBest" : "memory.status.done", hasNewBest ? "Neuer Bestwert" : "Geschafft");
    arcadeVisuals.setWinState(cabinet, true);
    renderOverlay({ visible: false });
    showMemoryResultModal();
    if (hasNewBest) {
      arcadeAudio.highScore("memory");
    } else {
      arcadeAudio.memoryWin();
    }
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

function initNeonMatchPage() {
  const stage = document.querySelector("#neon-match-stage");
  if (!stage) {
    return;
  }

  const elements = {
    stage,
    particles: document.querySelector("#neon-match-particles"),
    botHand: document.querySelector("#neon-match-bot-hand"),
    opponentCopy: document.querySelector("#neon-match-opponent-copy"),
    draw: document.querySelector("#neon-match-draw"),
    drawMeta: document.querySelector("#neon-match-draw-meta"),
    discard: document.querySelector("#neon-match-discard"),
    playerHand: document.querySelector("#neon-match-player-hand"),
    turn: document.querySelector("#neon-match-turn"),
    hint: document.querySelector("#neon-match-hint"),
    deckCount: document.querySelector("#neon-match-deck-count"),
    botCount: document.querySelector("#neon-match-bot-count"),
    playerCount: document.querySelector("#neon-match-player-count"),
    status: document.querySelector("#neon-match-status"),
    reset: document.querySelector("#neon-match-reset"),
    overlay: document.querySelector("#neon-match-overlay"),
    overlayTitle: document.querySelector("#neon-match-overlay-title"),
    overlayText: document.querySelector("#neon-match-overlay-text"),
    overlayMeta: document.querySelector("#neon-match-overlay-meta"),
    overlayAction: document.querySelector("#neon-match-overlay-action"),
  };
  const resultModal = createArcadeResultModal("neon-match-result-modal");
  const cabinet = arcadeVisuals.resolveCabinet(stage);
  const particleContext = elements.particles ? elements.particles.getContext("2d") : null;
  const particleSystem = arcadeVisuals.createParticleSystem();
  const colorMap = {
    red: { label: "Rot", hex: "#ef4444" },
    blue: { label: "Blau", hex: "#3b82f6" },
    green: { label: "Gruen", hex: "#22c55e" },
    yellow: { label: "Gelb", hex: "#eab308" },
  };
  let cardIdSeed = 0;
  const state = {
    deck: [],
    discard: [],
    playerHand: [],
    botHand: [],
    phase: "intro",
    turns: 0,
    winner: "",
    lastResultXp: 0,
    botTimeoutId: 0,
    lastDiscardId: "",
    particleWidth: 0,
    particleHeight: 0,
    particleDpr: 1,
    lastParticleAt: 0,
  };

  function createCard(color, value) {
    cardIdSeed += 1;
    return {
      id: `neon-card-${cardIdSeed}`,
      color,
      value,
    };
  }

  function shuffleCards(cards) {
    const deck = cards.slice();
    for (let index = deck.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const swapValue = deck[index];
      deck[index] = deck[swapIndex];
      deck[swapIndex] = swapValue;
    }
    return deck;
  }

  function buildDeck() {
    const cards = [];
    Object.keys(colorMap).forEach((color) => {
      for (let duplicate = 0; duplicate < 2; duplicate += 1) {
        for (let value = 0; value <= 9; value += 1) {
          cards.push(createCard(color, value));
        }
      }
    });
    return shuffleCards(cards);
  }

  function getTopDiscard() {
    return state.discard[state.discard.length - 1] || null;
  }

  function describeCard(card) {
    if (!card) {
      return "Noch keine Karte";
    }
    return `${colorMap[card.color].label} ${card.value}`;
  }

  function canPlayCard(card) {
    const topCard = getTopDiscard();
    return Boolean(topCard && (card.color === topCard.color || card.value === topCard.value));
  }

  function recycleDeckIfNeeded() {
    if (state.deck.length > 0 || state.discard.length <= 1) {
      return;
    }
    const topCard = state.discard[state.discard.length - 1];
    state.deck = shuffleCards(state.discard.slice(0, -1));
    state.discard = [topCard];
  }

  function drawCard() {
    recycleDeckIfNeeded();
    return state.deck.pop() || null;
  }

  function syncParticleCanvas(force = false) {
    if (!particleContext || !elements.particles) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const nextWidth = Math.max(1, Math.round(rect.width * dpr));
    const nextHeight = Math.max(1, Math.round(rect.height * dpr));
    if (!force && elements.particles.width === nextWidth && elements.particles.height === nextHeight) {
      return;
    }

    elements.particles.width = nextWidth;
    elements.particles.height = nextHeight;
    elements.particles.style.width = `${rect.width}px`;
    elements.particles.style.height = `${rect.height}px`;
    state.particleWidth = rect.width;
    state.particleHeight = rect.height;
    state.particleDpr = dpr;
    particleContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function runParticleLoop(now) {
    if (!particleContext) {
      return;
    }

    syncParticleCanvas();
    const deltaMs = state.lastParticleAt ? Math.min(40, now - state.lastParticleAt) : 16;
    state.lastParticleAt = now;
    particleContext.setTransform(state.particleDpr, 0, 0, state.particleDpr, 0, 0);
    particleContext.clearRect(0, 0, state.particleWidth, state.particleHeight);
    particleSystem.update(deltaMs);
    particleSystem.draw(particleContext);
    window.requestAnimationFrame(runParticleLoop);
  }

  function getStagePoint(element) {
    syncParticleCanvas();
    const stageRect = stage.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left - stageRect.left + rect.width / 2,
      y: rect.top - stageRect.top + rect.height / 2,
    };
  }

  function burstAtPoint(point, color) {
    if (!point) {
      return;
    }
    arcadeVisuals.spawnParticles(particleSystem, {
      x: point.x,
      y: point.y,
      color,
      count: 14,
      minSpeed: 34,
      maxSpeed: 118,
      lifeMs: 460,
      lift: 24,
      minSize: 3,
      maxSize: 8,
    });
  }

  function burstAtElement(element, color) {
    if (!element) {
      return;
    }
    burstAtPoint(getStagePoint(element), color);
  }

  function renderOverlay(config) {
    if (!elements.overlay) {
      return;
    }
    if (!config.visible) {
      elements.overlay.classList.add("is-hidden");
      return;
    }
    elements.overlay.classList.remove("is-hidden");
    elements.overlayTitle.textContent = config.title || "Neon Match";
    elements.overlayText.textContent = config.text || "";
    elements.overlayMeta.textContent = config.meta || "";
    elements.overlayAction.textContent = config.actionLabel || t("common.playAgain", {}, "Play again");
  }

  function getFanMotion(index, total, compact = false) {
    const centerOffset = index - (total - 1) / 2;
    let step = compact ? 18 : 30;
    if (total >= 12) {
      step = compact ? 10 : 14;
    } else if (total >= 10) {
      step = compact ? 12 : 16;
    } else if (total >= 8) {
      step = compact ? 14 : 20;
    } else if (total >= 6) {
      step = compact ? 16 : 24;
    }
    const rotateStep = compact ? 3.2 : 4.2;
    return {
      x: `${centerOffset * step}px`,
      y: `${Math.abs(centerOffset) * (compact ? 2 : 3)}px`,
      rotate: `${centerOffset * rotateStep}deg`,
    };
  }

  function createCardNode(card, options = {}) {
    const node = document.createElement(options.asButton ? "button" : "div");
    if (options.asButton) {
      node.type = "button";
    }
    node.className = "neon-match-card";
    if (options.back) {
      node.classList.add("is-back");
    }
    if (options.disabled) {
      node.classList.add("is-disabled");
      if (options.asButton) {
        node.disabled = true;
      }
    }
    if (options.pile) {
      node.classList.add("is-pile-card");
    }
    node.style.setProperty("--fan-x", options.fanX || "0px");
    node.style.setProperty("--fan-y", options.fanY || "0px");
    node.style.setProperty("--fan-rotate", options.fanRotate || "0deg");
    node.style.setProperty("--card-scale", options.scale || "1");

    if (options.back) {
      node.setAttribute("aria-hidden", "true");
      node.innerHTML = '<span class="neon-match-card-back-shine"></span><span class="neon-match-card-back-mark">NM</span>';
      return node;
    }

    const label = String(card.value);
    node.dataset.color = card.color;
    node.setAttribute("aria-label", describeCard(card));
    node.innerHTML = `
      <span class="neon-match-card-corner neon-match-card-corner-top">${label}</span>
      <span class="neon-match-card-center">${label}</span>
      <span class="neon-match-card-corner neon-match-card-corner-bottom">${label}</span>
    `;
    return node;
  }

  function appendAnimatedNode(container, node, animateIn = true) {
    if (!animateIn) {
      container.appendChild(node);
      return;
    }
    node.classList.add("is-entering");
    container.appendChild(node);
    window.requestAnimationFrame(() => {
      node.classList.add("is-settled");
    });
  }

  function renderBotHand() {
    elements.botHand.textContent = "";
    state.botHand.forEach((card, index) => {
      const motion = getFanMotion(index, state.botHand.length, true);
      const node = createCardNode(card, {
        back: true,
        fanX: motion.x,
        fanY: motion.y,
        fanRotate: motion.rotate,
        scale: "0.84",
      });
      appendAnimatedNode(elements.botHand, node, false);
    });
  }

  function playPlayerCard(cardId) {
    if (state.phase !== "player-turn") {
      return;
    }
    const cardIndex = state.playerHand.findIndex((card) => card.id === cardId);
    if (cardIndex === -1 || !canPlayCard(state.playerHand[cardIndex])) {
      return;
    }
    const playedCard = state.playerHand.splice(cardIndex, 1)[0];
    state.discard.push(playedCard);
    state.turns += 1;
    arcadeAudio.neonMatchPlay();
    state.phase = state.playerHand.length === 0 ? "gameover" : "bot-turn";
    render();
    burstAtElement(elements.discard, colorMap[playedCard.color].hex);
    if (state.playerHand.length === 0) {
      finishRound(true);
      return;
    }
    queueBotTurn();
  }

  function renderPlayerHand() {
    elements.playerHand.textContent = "";
    state.playerHand.forEach((card, index) => {
      const motion = getFanMotion(index, state.playerHand.length, false);
      const isActive = state.phase === "player-turn" && canPlayCard(card);
      const node = createCardNode(card, {
        asButton: true,
        disabled: !isActive,
        fanX: motion.x,
        fanY: motion.y,
        fanRotate: motion.rotate,
      });
      node.dataset.cardId = card.id;
      if (isActive) {
        node.addEventListener("click", () => {
          arcadeAudio.unlock();
          playPlayerCard(card.id);
        });
      }
      appendAnimatedNode(elements.playerHand, node, false);
    });
  }

  function renderDiscardPile() {
    const topCard = getTopDiscard();
    elements.discard.textContent = "";
    if (!topCard) {
      state.lastDiscardId = "";
      return;
    }
    const node = createCardNode(topCard, { pile: true });
    const animateIn = state.lastDiscardId !== topCard.id;
    appendAnimatedNode(elements.discard, node, animateIn);
    state.lastDiscardId = topCard.id;
  }

  function updateInterfaceCopy() {
    const topCard = getTopDiscard();
    let statusText = "Bereit";
    let turnText = "Lege Farbe oder Zahl passend.";
    let hintText = "Nur passende Karten sind aktiv.";
    let opponentText = "Der Bot sucht nach einer passenden Karte.";
    let drawMetaText = "Ziehe eine Karte";

    if (state.phase === "player-turn") {
      statusText = "Du bist dran";
      turnText = topCard ? `Oben liegt ${describeCard(topCard)}.` : "Ziehe die erste Karte.";
      hintText = topCard ? `Erlaubt: ${colorMap[topCard.color].label} oder ${topCard.value}` : "Noch keine Ablage.";
      opponentText = `Der Bot haelt ${formatArcadeNumber(state.botHand.length)} Karten.`;
      drawMetaText = `${formatArcadeNumber(state.deck.length)} Karten im Deck`;
    } else if (state.phase === "bot-turn") {
      statusText = "Bot denkt";
      turnText = "Bitte kurz warten, der Bot antwortet.";
      hintText = topCard ? `Ablage: ${describeCard(topCard)}` : "Der Tisch wird vorbereitet.";
      opponentText = "Der Bot prueft seine Hand und reagiert in einem Moment.";
      drawMetaText = "Bot ist am Zug";
    } else if (state.phase === "gameover") {
      statusText = state.winner === "player" ? "Gewonnen" : "Verloren";
      turnText = state.winner === "player"
        ? `Du hast den Bot in ${formatArcadeNumber(state.turns)} Zuegen leer gespielt.`
        : `Der Bot war schneller und beendet die Runde nach ${formatArcadeNumber(state.turns)} Zuegen.`;
      hintText = state.winner === "player" ? "Starker Clear. Direkt noch eine Hand?" : "Neue Hand austeilen und direkt kontern.";
      opponentText = state.winner === "player" ? "Der Bot hat keine Antwort mehr." : "Der Bot hat seine letzte Karte gelegt.";
      drawMetaText = "Runde beendet";
    }

    elements.status.textContent = statusText;
    elements.turn.textContent = turnText;
    elements.hint.textContent = hintText;
    elements.opponentCopy.textContent = opponentText;
    elements.drawMeta.textContent = drawMetaText;
    elements.draw.disabled = state.phase !== "player-turn";
    elements.draw.classList.toggle("is-disabled", state.phase !== "player-turn");
  }

  function render() {
    elements.deckCount.textContent = formatArcadeNumber(state.deck.length);
    elements.botCount.textContent = formatArcadeNumber(state.botHand.length);
    elements.playerCount.textContent = formatArcadeNumber(state.playerHand.length);
    updateInterfaceCopy();
    renderBotHand();
    renderPlayerHand();
    renderDiscardPile();
  }

  function clearBotTurn() {
    if (state.botTimeoutId) {
      window.clearTimeout(state.botTimeoutId);
      state.botTimeoutId = 0;
    }
  }

  function showResultModal() {
    const playerWon = state.winner === "player";
    const resultKey = `neon-match:${state.winner}:${state.turns}:${state.playerHand.length}:${state.botHand.length}`;
    resultModal.show({
      state: playerWon ? "win" : "lose",
      icon: playerWon ? "WIN" : "BOT",
      title: playerWon ? "Du gewinnst die Runde" : "Der Bot gewinnt diese Hand",
      message: playerWon
        ? `Sauber gespielt. Du hast Neon Match in ${state.turns} Zuegen geloest.`
        : `Der Bot war schneller. Deine Hand endet nach ${state.turns} Zuegen.`,
      scoreLabel: t("common.result.finalTurns", {}, "Final Turns"),
      scoreValue: formatArcadeNumber(state.turns),
      xpLabel: t("common.result.arcadeXp", {}, "Arcade XP"),
      xpValue: formatArcadeXpValue(state.lastResultXp),
      primaryLabel: t("common.playAgain", {}, "Play again"),
      secondaryLabel: t("common.backToMenu", {}, "Back to main menu"),
      countsAsDeath: !playerWon,
      resultKey,
      canShowAfterAd: () => state.phase === "gameover" && resultKey === `neon-match:${state.winner}:${state.turns}:${state.playerHand.length}:${state.botHand.length}`,
      onPrimary: () => startRun(),
    });
  }

  function finishRound(playerWon) {
    clearBotTurn();
    state.phase = "gameover";
    state.winner = playerWon ? "player" : "bot";
    const previousStats = getArcadeStats();
    const previousBestMoves = getMemoryBestMoves();
    recordNeonMatchResult(playerWon);
    const nextStats = getArcadeStats();
    state.lastResultXp = getArcadeXpGain(previousStats, previousBestMoves, nextStats, getMemoryBestMoves());
    render();
    renderOverlay({ visible: false });

    if (playerWon) {
      arcadeVisuals.setWinState(cabinet, true);
      window.setTimeout(() => arcadeVisuals.setWinState(cabinet, false), 1800);
      arcadeAudio.neonMatchWin(true);
    } else {
      arcadeVisuals.setWinState(cabinet, false);
      arcadeVisuals.triggerScreenShake(cabinet);
      arcadeAudio.neonMatchWin(false);
    }

    showResultModal();
  }

  function botDrawCard() {
    const drawnCard = drawCard();
    state.turns += 1;
    if (drawnCard) {
      state.botHand.push(drawnCard);
    }
    arcadeAudio.neonMatchDraw();
    render();
    burstAtElement(elements.draw, drawnCard ? colorMap[drawnCard.color].hex : "#f8fafc");
    state.phase = "player-turn";
    render();
  }

  function runBotTurn() {
    if (state.phase !== "bot-turn") {
      return;
    }
    const nextCard = state.botHand.find((card) => canPlayCard(card));
    if (!nextCard) {
      botDrawCard();
      return;
    }

    const cardIndex = state.botHand.findIndex((card) => card.id === nextCard.id);
    const playedCard = state.botHand.splice(cardIndex, 1)[0];
    state.discard.push(playedCard);
    state.turns += 1;
    arcadeAudio.neonMatchPlay();
    state.phase = state.botHand.length === 0 ? "gameover" : "player-turn";
    render();
    burstAtElement(elements.discard, colorMap[playedCard.color].hex);
    if (state.botHand.length === 0) {
      finishRound(false);
    }
  }

  function queueBotTurn() {
    clearBotTurn();
    state.botTimeoutId = window.setTimeout(() => {
      state.botTimeoutId = 0;
      runBotTurn();
    }, 1500);
  }

  function drawForPlayer() {
    if (state.phase !== "player-turn") {
      return;
    }
    const drawnCard = drawCard();
    state.turns += 1;
    if (drawnCard) {
      state.playerHand.push(drawnCard);
    }
    arcadeAudio.neonMatchDraw();
    state.phase = "bot-turn";
    render();
    burstAtElement(elements.draw, drawnCard ? colorMap[drawnCard.color].hex : "#f8fafc");
    queueBotTurn();
  }

  function prepareRound() {
    clearBotTurn();
    arcadeVisuals.setWinState(cabinet, false);
    cardIdSeed = 0;
    state.deck = buildDeck();
    state.discard = [];
    state.playerHand = [];
    state.botHand = [];
    state.phase = "player-turn";
    state.turns = 0;
    state.winner = "";
    state.lastResultXp = 0;
    state.lastDiscardId = "";

    for (let index = 0; index < 7; index += 1) {
      const playerCard = drawCard();
      const botCard = drawCard();
      if (playerCard) {
        state.playerHand.push(playerCard);
      }
      if (botCard) {
        state.botHand.push(botCard);
      }
    }

    const openingCard = drawCard();
    if (openingCard) {
      state.discard.push(openingCard);
    }
  }

  function startRun() {
    arcadeAudio.unlock();
    resultModal.hide();
    prepareRound();
    recordArcadeStart("neon-match");
    renderOverlay({ visible: false });
    render();
    arcadeAudio.startRound("neonMatch");
    arcadeAudio.neonMatchDeal();
  }

  function openIntroScreen() {
    clearBotTurn();
    resultModal.hide();
    arcadeVisuals.setWinState(cabinet, false);
    state.deck = [];
    state.discard = [];
    state.playerHand = [];
    state.botHand = [];
    state.phase = "intro";
    state.turns = 0;
    state.winner = "";
    state.lastResultXp = 0;
    state.lastDiscardId = "";
    render();
    renderOverlay({
      visible: true,
      title: "Erste Hand austeilen",
      text: "Du spielst gegen einen einfachen Bot. Lege nur Karten mit gleicher Farbe oder gleicher Zahl auf den Ablagestapel.",
      meta: "7 Karten pro Hand, Zahlen 0 bis 9, keine Spezialkarten im Prototyp.",
      actionLabel: "Hand starten",
    });
  }

  elements.overlayAction.addEventListener("click", startRun);
  elements.reset.addEventListener("click", startRun);
  elements.draw.addEventListener("click", () => {
    arcadeAudio.unlock();
    drawForPlayer();
  });

  if (particleContext) {
    syncParticleCanvas(true);
    window.requestAnimationFrame(runParticleLoop);
    window.addEventListener("resize", () => syncParticleCanvas(true));
  }

  openIntroScreen();
}
initSnakePage();
initBreakoutPage();
initPongPage();
initMemoryPage();
initNeonMatchPage();
