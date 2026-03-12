(function () {
  const STORAGE_KEY = 'retroArcade.language';
  const SUPPORTED_LANGUAGES = ['de', 'en', 'fr'];
  const refreshListeners = new Set();

  const languageMeta = {
    de: {
      switcher: 'Sprache waehlen',
      names: { de: 'Deutsch', en: 'Englisch', fr: 'Franzoesisch' },
    },
    en: {
      switcher: 'Choose language',
      names: { de: 'German', en: 'English', fr: 'French' },
    },
    fr: {
      switcher: 'Choisir la langue',
      names: { de: 'Allemand', en: 'Anglais', fr: 'Francais' },
    },
  };

  const messages = {
    en: {
      'common.guest': 'Guest',
      'common.navigationAria': 'Games navigation',
      'common.skipToContent': 'Skip to content',
      'common.backToMenu': 'Back to main menu',
      'common.soundButton.on': 'Sound: ON',
      'common.soundButton.off': 'Sound: OFF',
      'common.soundLabel.on': 'ON',
      'common.soundLabel.off': 'OFF',
      'snake.best.open': 'Best: open',
      'snake.best.value': 'Best: {value}',
      'snake.status.ready': 'Ready',
      'snake.status.running': 'Running',
      'snake.status.point': '+10',
      'snake.status.highscore': 'New High Score',
      'snake.status.highscoreBang': 'New High Score!',
      'snake.status.gameOver': 'Game Over',
      'snake.overlay.title': 'Ready to launch',
      'snake.overlay.text': 'Start a run and chase the longest neon-green streak you can.',
      'snake.overlay.start': 'Start game',
      'snake.overlay.replay': 'Play again',
      'snake.finish.highscore': 'Strong run. You reached {score} points.',
      'snake.finish.normal': 'Your run ends at {score} points. Jump right back in.',
      'snake.canvas.hint': 'Space or Restart',
      'memory.best.unknown': 'Best: --',
      'memory.best.value': 'Best: {value} moves',
      'memory.status.ready': 'Ready',
      'memory.status.running': 'Running',
      'memory.status.newBest': 'New Best',
      'memory.status.done': 'Cleared',
      'memory.status.oneMore': 'One more card',
      'memory.status.hit': 'Match',
      'memory.status.miss': 'No pair',
      'memory.status.continue': 'Keep going',
      'memory.overlay.title': 'Ready for the run',
      'memory.overlay.text': 'Start a round and find all eight pairs in as few moves as possible.',
      'memory.overlay.start': 'Start round',
      'memory.overlay.replay': 'Play again',
      'memory.finish.newBest': 'Strong run. You solved all pairs in {moves} moves.',
      'memory.finish.normal': 'Round complete. You needed {moves} moves.',
      'memory.card.hidden': 'Hidden card',
      'pong.side.left': 'Left',
      'pong.side.right': 'Right',
      'pong.side.waiting': 'Waiting',
      'pong.connection.disconnected': 'Disconnected',
      'pong.connection.connected': 'Connected',
      'pong.connection.connecting': 'Connecting...',
      'pong.connection.error': 'Error',
      'pong.phase.offline': 'Offline',
      'pong.phase.lobby': 'Lobby',
      'pong.phase.waiting': 'Waiting',
      'pong.phase.live': 'Live',
      'pong.phase.matchEnd': 'Match End',
      'pong.phase.ready': 'Ready',
      'pong.help.offline': 'Start the server and then connect.',
      'pong.help.invite': 'Invite for room {roomCode} detected. Preparing the connection.',
      'pong.help.lobby': 'Set a name, then create a room or join one.',
      'pong.help.waiting': 'Room {roomCode} is waiting for player 2. Share the code or the invite link.',
      'pong.help.rematch': 'Match finished. You can launch a rematch in the same room.',
      'pong.help.ready': 'The arena is ready.',
      'pong.help.running': 'W or Arrow Up moves up, S or Arrow Down moves down. Mouse control inside the arena also works.',
      'pong.you.readyRoom': 'Ready for a room',
      'pong.you.notConnected': 'Not connected yet',
      'pong.you.serverConnected': 'Connected to the server',
      'pong.you.holdLeft': 'You are holding the left side.',
      'pong.you.holdRight': 'You are holding the right side.',
      'pong.you.won': 'You won the match.',
      'pong.you.finished': 'The match is over.',
      'pong.you.playLeft': 'You are playing on the left side.',
      'pong.you.playRight': 'You are playing on the right side.',
      'pong.opponent.starts': 'As soon as someone joins, the match starts.',
      'pong.opponent.filling': 'The player slots are filling up.',
      'pong.opponent.none': 'No one is in the room yet.',
      'pong.opponent.wait': 'Waiting for the second player.',
      'pong.opponent.won': 'The opponent won this match.',
      'pong.opponent.rematch': 'Ready for the rematch.',
      'pong.opponent.active': 'The opponent is active in the match.',
      'pong.opponent.ready': 'Opponent connected and ready.',
      'pong.share.room': 'Share room {roomCode} as a code or invite link.',
      'pong.share.default': 'Invite links insert the room code directly into the page.',
      'pong.rematch.noRoom': 'After a match, you can start a rematch in the same room without re-entering the room code or reconnecting.',
      'pong.rematch.waiting': 'As soon as two players are in the room, the connection stays alive for later rematches.',
      'pong.rematch.ready': 'Both players are still connected. One click starts the rematch in the same room.',
      'pong.rematch.active': 'The room stays active. For a rematch, you do not need to re-enter the code or reconnect.',
      'pong.button.newRound': 'New Round',
      'pong.button.rematch': 'Start Rematch',
      'pong.overlay.winTitle': 'You won',
      'pong.overlay.winText': 'Strong round. The room stays open so you can launch the rematch right away.',
      'pong.overlay.loseTitle': '{winnerName} wins this match',
      'pong.overlay.loseText': '{winnerName} took this round. If both players stay connected, the rematch starts instantly in the same room.',
      'pong.canvas.offlineTitle': 'Offline',
      'pong.canvas.offlineText': 'Start the server and then connect',
      'pong.canvas.lobbyTitle': 'Lobby',
      'pong.canvas.lobbyInvite': 'Invite {roomCode} is being prepared',
      'pong.canvas.lobbyText': 'Create a room or enter a code',
      'pong.canvas.waitingTitle': 'Waiting Area',
      'pong.canvas.waitingText': 'Room {roomCode} is waiting for player 2',
      'pong.canvas.victory': 'Victory',
      'pong.canvas.gameOver': 'Game Over',
      'pong.canvas.readyTitle': 'Ready',
      'pong.canvas.readyText': 'Waiting for the round',
      'pong.local.connectFirst': 'Connect first',
      'pong.local.validRoomCode': 'Please enter a valid room code',
      'pong.local.joinInvite': 'Invite detected. Joining room {roomCode}.',
      'pong.local.joiningRoom': 'Joining room {roomCode}',
      'pong.local.badResponse': 'Could not read the server response',
      'pong.local.connectedStatus': 'Connected. Create or join a room.',
      'pong.local.serverError': 'Server error',
      'pong.local.socketInvalid': 'The WebSocket URL is invalid',
      'pong.local.connectionStarting': 'Opening connection',
      'pong.local.connectionClosed': 'Connection closed',
      'pong.local.serverUnavailable': 'Server unavailable',
      'pong.local.roomLeft': 'Left room',
      'pong.local.roomCreating': 'Creating room',
      'pong.local.copyFailed': 'Copy is not available',
      'pong.local.roomCodeCopied': 'Room code {roomCode} copied',
      'pong.local.inviteCopied': 'Invite link for {roomCode} copied',
      'pong.local.enterName': 'Please enter a name',
      'pong.local.nameSaved': 'Name saved: {name}',
      'pong.local.rematchRequested': 'Rematch requested',
      'pong.local.resetRequested': 'New round requested',
      'pong.local.inviteDetected': 'Invite link for room {roomCode} detected',
      'pong.server.connectedPrompt': 'Connected. Create a room or join one.',
      'pong.server.waitingPlayer': 'Waiting for player 2',
      'pong.server.roomCodeMissing': 'Please enter a room code.',
      'pong.server.roomFull': 'Room not found or already full.',
      'pong.server.roomLeft': 'Left room.',
      'pong.server.needTwoPlayers': 'A new round requires two players in the room.',
      'pong.server.matchRunning': 'Match running',
      'pong.server.roomCreated': 'Room {roomCode} created. Share the code with another player.',
      'pong.server.joinedRoom': 'You joined room {roomCode}.',
      'pong.server.nameUpdated': 'Your name is now {name}.',
      'pong.server.playerWins': '{name} wins',
    },
    fr: {
      'common.guest': 'Invite',
      'common.navigationAria': 'Navigation des jeux',
      'common.skipToContent': 'Aller au contenu',
      'common.backToMenu': 'Retour au menu principal',
      'common.soundButton.on': 'Son : ON',
      'common.soundButton.off': 'Son : OFF',
      'common.soundLabel.on': 'ON',
      'common.soundLabel.off': 'OFF',
      'snake.best.open': 'Best : libre',
      'snake.best.value': 'Best : {value}',
      'snake.status.ready': 'Pret',
      'snake.status.running': 'En cours',
      'snake.status.point': '+10',
      'snake.status.highscore': 'Nouveau record',
      'snake.status.highscoreBang': 'Nouveau record !',
      'snake.status.gameOver': 'Game Over',
      'snake.overlay.title': 'Pret au depart',
      'snake.overlay.text': 'Lance une partie et vise la plus longue serie neon possible.',
      'snake.overlay.start': 'Lancer',
      'snake.overlay.replay': 'Rejouer',
      'snake.finish.highscore': 'Belle partie. Tu as atteint {score} points.',
      'snake.finish.normal': 'Ta partie se termine a {score} points. Repars tout de suite.',
      'snake.canvas.hint': 'Espace ou Redemarrer',
      'memory.best.unknown': 'Best : --',
      'memory.best.value': 'Best : {value} coups',
      'memory.status.ready': 'Pret',
      'memory.status.running': 'En cours',
      'memory.status.newBest': 'Nouveau record',
      'memory.status.done': 'Termine',
      'memory.status.oneMore': 'Encore une carte',
      'memory.status.hit': 'Paire',
      'memory.status.miss': 'Pas de paire',
      'memory.status.continue': 'Continue',
      'memory.overlay.title': 'Pret pour la manche',
      'memory.overlay.text': 'Lance une manche et trouve les huit paires avec le moins de coups possible.',
      'memory.overlay.start': 'Lancer la manche',
      'memory.overlay.replay': 'Rejouer',
      'memory.finish.newBest': 'Belle manche. Tu as resolu toutes les paires en {moves} coups.',
      'memory.finish.normal': 'Manche terminee. Il t a fallu {moves} coups.',
      'memory.card.hidden': 'Carte cachee',
      'pong.side.left': 'Gauche',
      'pong.side.right': 'Droite',
      'pong.side.waiting': 'En attente',
      'pong.connection.disconnected': 'Deconnecte',
      'pong.connection.connected': 'Connecte',
      'pong.connection.connecting': 'Connexion...',
      'pong.connection.error': 'Erreur',
      'pong.phase.offline': 'Hors ligne',
      'pong.phase.lobby': 'Lobby',
      'pong.phase.waiting': 'Attente',
      'pong.phase.live': 'Live',
      'pong.phase.matchEnd': 'Fin du match',
      'pong.phase.ready': 'Pret',
      'pong.help.offline': 'Lance le serveur puis connecte-toi.',
      'pong.help.invite': 'Invitation detectee pour la salle {roomCode}. Preparation de la connexion.',
      'pong.help.lobby': 'Choisis un nom, puis cree une salle ou rejoins-en une.',
      'pong.help.waiting': 'La salle {roomCode} attend le joueur 2. Partage le code ou le lien d invitation.',
      'pong.help.rematch': 'Match termine. Vous pouvez lancer une revanche dans la meme salle.',
      'pong.help.ready': 'L arene est prete.',
      'pong.help.running': 'W ou Fleche Haut monte, S ou Fleche Bas descend. Le controle souris dans l arene fonctionne aussi.',
      'pong.you.readyRoom': 'Pret pour une salle',
      'pong.you.notConnected': 'Pas encore connecte',
      'pong.you.serverConnected': 'Connecte au serveur',
      'pong.you.holdLeft': 'Tu tiens le cote gauche.',
      'pong.you.holdRight': 'Tu tiens le cote droit.',
      'pong.you.won': 'Tu as gagne le match.',
      'pong.you.finished': 'Le match est termine.',
      'pong.you.playLeft': 'Tu joues a gauche.',
      'pong.you.playRight': 'Tu joues a droite.',
      'pong.opponent.starts': 'Des qu une personne rejoint, le match commence.',
      'pong.opponent.filling': 'Les places de joueurs se remplissent.',
      'pong.opponent.none': 'Personne n est encore dans la salle.',
      'pong.opponent.wait': 'En attente du deuxieme joueur.',
      'pong.opponent.won': 'L adversaire a gagne ce match.',
      'pong.opponent.rematch': 'Pret pour la revanche.',
      'pong.opponent.active': 'L adversaire est actif dans le match.',
      'pong.opponent.ready': 'Adversaire connecte et pret.',
      'pong.share.room': 'Partage la salle {roomCode} par code ou lien d invitation.',
      'pong.share.default': 'Les liens d invitation inserent directement le code de salle dans la page.',
      'pong.rematch.noRoom': 'Apres un match, vous pouvez lancer une revanche dans la meme salle sans ressaisir le code ni reconnecter.',
      'pong.rematch.waiting': 'Des que deux joueurs sont dans la salle, la connexion reste active pour les revanches suivantes.',
      'pong.rematch.ready': 'Les deux joueurs sont encore connectes. Un clic lance aussitot la revanche dans la meme salle.',
      'pong.rematch.active': 'La salle reste active. Pour une revanche, vous n avez ni a ressaisir le code ni a reconnecter.',
      'pong.button.newRound': 'Nouvelle manche',
      'pong.button.rematch': 'Lancer la revanche',
      'pong.overlay.winTitle': 'Tu as gagne',
      'pong.overlay.winText': 'Belle manche. La salle reste ouverte pour lancer la revanche tout de suite.',
      'pong.overlay.loseTitle': '{winnerName} gagne ce match',
      'pong.overlay.loseText': '{winnerName} a pris cette manche. Si les deux joueurs restent connectes, la revanche demarre aussitot dans la meme salle.',
      'pong.canvas.offlineTitle': 'Hors ligne',
      'pong.canvas.offlineText': 'Lance le serveur puis connecte-toi',
      'pong.canvas.lobbyTitle': 'Lobby',
      'pong.canvas.lobbyInvite': 'Invitation {roomCode} en preparation',
      'pong.canvas.lobbyText': 'Cree une salle ou entre un code',
      'pong.canvas.waitingTitle': 'Zone d attente',
      'pong.canvas.waitingText': 'La salle {roomCode} attend le joueur 2',
      'pong.canvas.victory': 'Victoire',
      'pong.canvas.gameOver': 'Game Over',
      'pong.canvas.readyTitle': 'Pret',
      'pong.canvas.readyText': 'En attente de la manche',
      'pong.local.connectFirst': 'Connecte-toi d abord',
      'pong.local.validRoomCode': 'Entre un code de salle valide',
      'pong.local.joinInvite': 'Invitation detectee. Connexion a la salle {roomCode}.',
      'pong.local.joiningRoom': 'Connexion a la salle {roomCode}',
      'pong.local.badResponse': 'Impossible de lire la reponse du serveur',
      'pong.local.connectedStatus': 'Connecte. Cree une salle ou rejoins-en une.',
      'pong.local.serverError': 'Erreur serveur',
      'pong.local.socketInvalid': 'L URL WebSocket est invalide',
      'pong.local.connectionStarting': 'Ouverture de la connexion',
      'pong.local.connectionClosed': 'Connexion fermee',
      'pong.local.serverUnavailable': 'Serveur indisponible',
      'pong.local.roomLeft': 'Salle quittee',
      'pong.local.roomCreating': 'Creation de la salle',
      'pong.local.copyFailed': 'Copie impossible',
      'pong.local.roomCodeCopied': 'Code de salle {roomCode} copie',
      'pong.local.inviteCopied': 'Lien d invitation pour {roomCode} copie',
      'pong.local.enterName': 'Entre un nom',
      'pong.local.nameSaved': 'Nom enregistre : {name}',
      'pong.local.rematchRequested': 'Revanche demandee',
      'pong.local.resetRequested': 'Nouvelle manche demandee',
      'pong.local.inviteDetected': 'Lien d invitation pour la salle {roomCode} detecte',
      'pong.server.connectedPrompt': 'Connecte. Cree une salle ou rejoins-en une.',
      'pong.server.waitingPlayer': 'En attente du joueur 2',
      'pong.server.roomCodeMissing': 'Entre un code de salle.',
      'pong.server.roomFull': 'Salle introuvable ou deja pleine.',
      'pong.server.roomLeft': 'Salle quittee.',
      'pong.server.needTwoPlayers': 'Une nouvelle manche exige deux joueurs dans la salle.',
      'pong.server.matchRunning': 'Match en cours',
      'pong.server.roomCreated': 'Salle {roomCode} creee. Partage le code avec une autre personne.',
      'pong.server.joinedRoom': 'Tu as rejoint la salle {roomCode}.',
      'pong.server.nameUpdated': 'Ton nom est maintenant {name}.',
      'pong.server.playerWins': '{name} gagne',
    },
  };

  function sanitizeLanguage(value) {
    const normalized = String(value || '').trim().toLowerCase();
    return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : null;
  }

  function detectBrowserLanguage() {
    const candidates = [];
    if (Array.isArray(window.navigator.languages)) {
      candidates.push.apply(candidates, window.navigator.languages);
    }
    candidates.push(window.navigator.language || '');
    for (let index = 0; index < candidates.length; index += 1) {
      const shortCode = String(candidates[index] || '').toLowerCase().slice(0, 2);
      if (SUPPORTED_LANGUAGES.includes(shortCode)) {
        return shortCode;
      }
    }
    return 'de';
  }

  function readStoredLanguage() {
    try {
      return sanitizeLanguage(window.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return null;
    }
  }

  function writeStoredLanguage(language) {
    try {
      window.localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      // Ignore storage failures.
    }
  }

  let currentLanguage = readStoredLanguage() || detectBrowserLanguage() || 'de';

  function interpolate(template, variables) {
    return String(template || '').replace(/\{(\w+)\}/g, function (_, key) {
      if (!variables || !(key in variables)) {
        return '';
      }
      return String(variables[key]);
    });
  }

  function t(key, variables, fallback) {
    if (currentLanguage === 'de') {
      return interpolate(fallback || key, variables);
    }
    const template = messages[currentLanguage] && messages[currentLanguage][key];
    return interpolate(template || fallback || key, variables);
  }

  function rememberOriginal(node, type, attr) {
    if (!node || !node.dataset) {
      return;
    }
    if (type === 'text' && node.dataset.i18nTextOriginal === undefined) {
      node.dataset.i18nTextOriginal = node.textContent;
    }
    if (type === 'html' && node.dataset.i18nHtmlOriginal === undefined) {
      node.dataset.i18nHtmlOriginal = node.innerHTML;
    }
    if (type === 'attr') {
      const key = 'i18nAttr' + attr.charAt(0).toUpperCase() + attr.slice(1).replace(/[^a-z0-9]/gi, '');
      if (node.dataset[key] === undefined) {
        node.dataset[key] = node.getAttribute(attr) || '';
      }
    }
  }

  function applyText(selector, values) {
    const node = document.querySelector(selector);
    if (!node) {
      return;
    }
    rememberOriginal(node, 'text');
    node.textContent = currentLanguage === 'de' ? node.dataset.i18nTextOriginal : values[currentLanguage] || node.dataset.i18nTextOriginal;
  }

  function applyHtml(selector, values) {
    const node = document.querySelector(selector);
    if (!node) {
      return;
    }
    rememberOriginal(node, 'html');
    node.innerHTML = currentLanguage === 'de' ? node.dataset.i18nHtmlOriginal : values[currentLanguage] || node.dataset.i18nHtmlOriginal;
  }
  function applyAttr(selector, attr, values) {
    const node = document.querySelector(selector);
    if (!node) {
      return;
    }
    rememberOriginal(node, 'attr', attr);
    const key = 'i18nAttr' + attr.charAt(0).toUpperCase() + attr.slice(1).replace(/[^a-z0-9]/gi, '');
    node.setAttribute(attr, currentLanguage === 'de' ? node.dataset[key] : values[currentLanguage] || node.dataset[key]);
  }

  function applyLeadingText(childSelector, values) {
    const child = document.querySelector(childSelector);
    if (!child || !child.parentNode) {
      return;
    }
    const parent = child.parentNode;
    if (parent.dataset.i18nLeadingOriginal === undefined) {
      const originalNode = Array.from(parent.childNodes).find(function (node) {
        return node.nodeType === Node.TEXT_NODE;
      });
      parent.dataset.i18nLeadingOriginal = originalNode ? originalNode.textContent : '';
    }
    let textNode = Array.from(parent.childNodes).find(function (node) {
      return node.nodeType === Node.TEXT_NODE;
    });
    if (!textNode) {
      textNode = document.createTextNode('');
      parent.insertBefore(textNode, child);
    }
    textNode.textContent = currentLanguage === 'de' ? parent.dataset.i18nLeadingOriginal : (values[currentLanguage] || parent.dataset.i18nLeadingOriginal);
  }

  function applyTitleAndDescription(titleValues, descriptionValues) {
    if (!document.documentElement.dataset.i18nLangOriginal) {
      document.documentElement.dataset.i18nLangOriginal = document.documentElement.getAttribute('lang') || 'de';
    }
    document.documentElement.lang = currentLanguage;
    if (!document.documentElement.dataset.i18nTitleOriginal) {
      document.documentElement.dataset.i18nTitleOriginal = document.title;
    }
    document.title = currentLanguage === 'de' ? document.documentElement.dataset.i18nTitleOriginal : titleValues[currentLanguage] || document.documentElement.dataset.i18nTitleOriginal;
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      if (!description.dataset.i18nDescriptionOriginal) {
        description.dataset.i18nDescriptionOriginal = description.getAttribute('content') || '';
      }
      description.setAttribute('content', currentLanguage === 'de' ? description.dataset.i18nDescriptionOriginal : descriptionValues[currentLanguage] || description.dataset.i18nDescriptionOriginal);
    }
  }

  function determinePageKey() {
    const pathName = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (!pathName || pathName === 'index.html') {
      return 'index';
    }
    return pathName.replace('.html', '');
  }

  function applyIndexTranslations() {
    applyTitleAndDescription(
      { en: 'Retro Arcade | Main Menu', fr: 'Retro Arcade | Menu principal' },
      { en: 'Retro Arcade as a neon game hall with Snake, Pong, and Memory on dedicated pages.', fr: 'Retro Arcade comme salle neon avec Snake, Pong et Memory sur des pages dediees.' }
    );
    applyText('.skip-link', { en: 'Skip to content', fr: 'Aller au contenu' });
    applyAttr('.nav-links', 'aria-label', { en: 'Games navigation', fr: 'Navigation des jeux' });
    applyText('.nav-links a[href="#player-deck"]', { en: 'Player Deck', fr: 'Deck joueur' });
    applyText('.nav-links a[href="#game-floor"]', { en: 'Cabinets', fr: 'Bornes' });
    applyText('.arcade-marquee h1', { en: 'Choose your cabinet', fr: 'Choisis ta borne' });
    applyText('.arcade-marquee .lead', { en: 'The main menu is now the control center of the arcade: launch a game, update your local profile, track your progress, and jump straight back here afterward.', fr: 'Le menu principal devient le centre de l arcade : lance un jeu, gere ton profil local, suis ta progression et reviens ici en un instant.' });
    applyText('.hero-actions .button-primary', { en: 'Open Player Deck', fr: 'Ouvrir le deck joueur' });
    applyText('.hero-actions .button-secondary', { en: 'Jump into Pong Online', fr: 'Aller a Pong Online' });
    applyText('.arcade-status-grid .lobby-monitor:first-child .eyebrow', { en: 'Hall Status', fr: 'Hall Status' });
    applyText('.arcade-status-grid .lobby-monitor:last-child .eyebrow', { en: 'Insert Coin', fr: 'Insert Coin' });
    applyText('#player-deck .section-heading h2', { en: 'Your meta system is live.', fr: 'Ton meta-systeme est actif.' });
    applyText('#player-deck .section-heading .lead', { en: 'A shared player name, persistent arcade starts, wins, and game stats turn the three games into one connected retro arcade.', fr: 'Un nom partage, des lancements persistants, des victoires et des stats communes transforment les trois jeux en une seule arcade retro coherente.' });
    applyText('#player-deck .meta-card[data-arcade-profile-scope] .eyebrow', { en: 'Arcade Profile', fr: 'Profil Arcade' });
    applyText('label[for="arcade-profile-name"] span', { en: 'Player name', fr: 'Nom du joueur' });
    applyAttr('#arcade-profile-name', 'placeholder', { en: 'For example Alex', fr: 'Par exemple Alex' });
    applyText('[data-arcade-profile-save]', { en: 'Save profile', fr: 'Enregistrer le profil' });
    applyText('#player-deck .meta-card[data-arcade-profile-scope] .form-row .button-secondary', { en: 'Go to cabinets', fr: 'Voir les bornes' });
    applyText('#player-deck .meta-card:nth-of-type(2) .eyebrow', { en: 'Progress', fr: 'Progression' });
    applyText('#player-deck .meta-card:nth-of-type(2) .meta-hint', { en: 'Everything stays in your browser. No account, no external server, no reset from the website.', fr: 'Tout reste dans ton navigateur. Aucun compte, aucun serveur externe, aucun reset par le site.' });
    applyText('#game-floor .section-heading h2', { en: 'Three cabinets are ready.', fr: 'Trois bornes sont pretes.' });
    applyText('#game-floor .section-heading .lead', { en: 'A consistent neon grid, a clear profile system, and visible records for a fast jump into the next round.', fr: 'Une grille neon coherente, un profil clair et des records visibles pour repartir vite dans une nouvelle manche.' });
    applyText('.snake-machine .machine-copy', { en: 'Eat orbs, keep growing, and keep your run alive as long as possible.', fr: 'Mange des orbes, continue de grandir et garde ta partie en vie le plus longtemps possible.' });
    applyText('.snake-machine .machine-cta', { en: 'Start game', fr: 'Lancer' });
    applyText('.pong-machine .machine-mode', { en: 'Online Versus', fr: 'Duel en ligne' });
    applyText('.pong-machine .machine-copy', { en: 'Create a room, invite someone, and keep playing rematches in the same match room.', fr: 'Cree une salle, invite quelqu un et continue avec des revanches dans la meme salle.' });
    applyText('.pong-machine .machine-cta', { en: 'Enter arena', fr: 'Entrer dans l arene' });
    applyText('.memory-machine .machine-copy', { en: 'Find every pair in as few moves as possible and beat your local record.', fr: 'Trouve toutes les paires avec le moins de coups possible et bats ton record local.' });
    applyText('.memory-machine .machine-cta', { en: 'Start game', fr: 'Lancer' });
    applyText('.site-footer .footer-inner p:first-child', { en: 'Retro Arcade main menu with neon cabinets, profile, and local meta stats.', fr: 'Menu principal Retro Arcade avec bornes neon, profil et statistiques locales.' });
  }

  function applySnakeTranslations() {
    applyTitleAndDescription(
      { en: 'Snake.exe | Retro Arcade', fr: 'Snake.exe | Retro Arcade' },
      { en: 'Snake on its own browser game page with a large playfield.', fr: 'Snake sur sa propre page web avec une grande zone de jeu.' }
    );
    applyText('.skip-link', { en: 'Skip to content', fr: 'Aller au contenu' });
    applyAttr('.nav-links', 'aria-label', { en: 'Games navigation', fr: 'Navigation des jeux' });
    applyText('.nav-links a[href="index.html"]', { en: 'Main Menu', fr: 'Menu principal' });
    applyText('.page-intro .lead', { en: 'A large solo view for the classic. Collect orbs, keep growing, and avoid walls and self-collisions.', fr: 'Une grande vue solo pour le classique. Recupere les orbes, grandis encore et evite les murs comme les collisions avec toi-meme.' });
    applyText('.menu-return', { en: 'Back to main menu', fr: 'Retour au menu principal' });
    applyLeadingText('#snake-score', { en: 'Score ', fr: 'Score ' });
    applyLeadingText('.stage-toolbar .hud span:nth-child(2) strong', { en: 'Best ', fr: 'Best ' });
    applyLeadingText('#snake-status', { en: 'Status ', fr: 'Statut ' });
    applyText('#snake-reset', { en: 'Restart', fr: 'Redemarrer' });
    applyText('.game-note', { en: 'Controls: arrow keys or WASD. Press space to restart instantly after game over.', fr: 'Commandes : fleches ou WASD. Espace relance instantanement apres le game over.' });
    applyText('.meta-side-card .eyebrow', { en: 'Arcade Deck', fr: 'Deck Arcade' });
    applyHtml('.meta-side-card p:last-child', { en: 'Total Snake score: <strong data-arcade-stat="snake-total-score">0</strong>. You can update your profile from the main menu.', fr: 'Score total sur Snake : <strong data-arcade-stat="snake-total-score">0</strong>. Tu peux modifier ton profil depuis le menu principal.' });
    applyText('.info-stack .info-card:nth-of-type(2) .eyebrow', { en: 'Controls', fr: 'Commandes' });
    applyText('.info-stack .info-card:nth-of-type(3) .eyebrow', { en: 'High Score', fr: 'High Score' });
    applyHtml('.info-stack .info-card:nth-of-type(3) p', { en: 'Your best run is stored locally in the browser. Current record: <strong class="record-value" data-arcade-record="snake-score">0</strong>', fr: 'Ta meilleure partie est stockee localement dans le navigateur. Record actuel : <strong class="record-value" data-arcade-record="snake-score">0</strong>' });
    applyText('.info-stack .info-card:nth-of-type(4) .eyebrow', { en: 'Goal', fr: 'Objectif' });
    applyText('.info-stack .info-card:nth-of-type(4) p', { en: 'Eat the neon-green orbs, raise your score, and keep the snake alive as long as possible.', fr: 'Mange les orbes neon, augmente ton score et garde le serpent en vie le plus longtemps possible.' });
    applyText('.site-footer .footer-inner p:first-child', { en: 'Snake on its own game page with profile and meta display.', fr: 'Snake sur sa propre page avec profil et meta-affichage.' });
  }
  function applyMemoryTranslations() {
    applyTitleAndDescription(
      { en: 'Memory Match | Retro Arcade', fr: 'Memory Match | Retro Arcade' },
      { en: 'Memory on its own browser game page with a large card grid.', fr: 'Memory sur sa propre page web avec une grande grille de cartes.' }
    );
    applyText('.skip-link', { en: 'Skip to content', fr: 'Aller au contenu' });
    applyAttr('.nav-links', 'aria-label', { en: 'Games navigation', fr: 'Navigation des jeux' });
    applyText('.nav-links a[href="index.html"]', { en: 'Main Menu', fr: 'Menu principal' });
    applyText('.page-intro .lead', { en: 'Memory now has its own large page with more room for cards, status, and faster rounds.', fr: 'Memory a maintenant sa propre grande page avec plus d espace pour les cartes, le statut et des manches plus rapides.' });
    applyText('.menu-return', { en: 'Back to main menu', fr: 'Retour au menu principal' });
    applyLeadingText('#memory-moves', { en: 'Moves ', fr: 'Coups ' });
    applyLeadingText('#memory-matches', { en: 'Matches ', fr: 'Paires ' });
    applyLeadingText('.stage-toolbar .hud span:nth-child(3) strong', { en: 'Best ', fr: 'Best ' });
    applyLeadingText('#memory-status', { en: 'Status ', fr: 'Statut ' });
    applyText('#memory-reset', { en: 'Shuffle again', fr: 'Remelanger' });
    applyText('.game-note', { en: 'Find all eight pairs in as few moves as possible.', fr: 'Trouve les huit paires avec le moins de coups possible.' });
    applyText('.meta-side-card .eyebrow', { en: 'Arcade Deck', fr: 'Deck Arcade' });
    applyHtml('.meta-side-card p:last-child', { en: 'Completed Memory rounds: <strong data-arcade-stat="memory-wins">0</strong>. Your full progress waits on the main menu.', fr: 'Manches Memory terminees : <strong data-arcade-stat="memory-wins">0</strong>. Toute ta progression t attend dans le menu principal.' });
    applyText('.info-stack .info-card:nth-of-type(2) .eyebrow', { en: 'Controls', fr: 'Commandes' });
    applyText('.info-stack .info-card:nth-of-type(3) .eyebrow', { en: 'Best Run', fr: 'Meilleure performance' });
    applyHtml('.info-stack .info-card:nth-of-type(3) p', { en: 'Your best run is stored locally as the lowest move count. Current record: <strong class="record-value" data-arcade-record="memory-best-moves">--</strong>', fr: 'Ta meilleure manche est stockee localement comme plus petit nombre de coups. Actuel : <strong class="record-value" data-arcade-record="memory-best-moves">--</strong>' });
    applyText('.info-stack .info-card:nth-of-type(4) .eyebrow', { en: 'Goal', fr: 'Objectif' });
    applyText('.info-stack .info-card:nth-of-type(4) p', { en: 'Remember the positions, chain quick matches, and push the move count as low as possible.', fr: 'Retiens les positions, enchaine les paires rapides et fais descendre le nombre de coups au plus bas.' });
    applyText('.site-footer .footer-inner p:first-child', { en: 'Memory on its own game page with profile and meta display.', fr: 'Memory sur sa propre page avec profil et meta-affichage.' });
  }

  function applyPongTranslations() {
    applyTitleAndDescription(
      { en: 'Pong Online | Retro Arcade', fr: 'Pong Online | Retro Arcade' },
      { en: 'Real 1v1 online Pong with room code, invite link, and a large arena.', fr: 'Vrai Pong en ligne 1v1 avec code de salle, lien d invitation et grande arene.' }
    );
    applyText('.skip-link', { en: 'Skip to content', fr: 'Aller au contenu' });
    applyAttr('.nav-links', 'aria-label', { en: 'Games navigation', fr: 'Navigation des jeux' });
    applyText('.nav-links a[href="index.html"]', { en: 'Main Menu', fr: 'Menu principal' });
    applyText('.page-intro .lead', { en: 'Real 1v1 instead of CPU. Connect to the server, set your name, and share the room code or invite link right away.', fr: 'Un vrai 1v1 au lieu d un CPU. Connecte-toi au serveur, definis ton nom et partage tout de suite le code ou le lien d invitation.' });
    applyText('.menu-return', { en: 'Back to main menu', fr: 'Retour au menu principal' });
    applyLeadingText('#pong-role', { en: 'Role ', fr: 'Role ' });
    applyLeadingText('#pong-status', { en: 'Status ', fr: 'Statut ' });
    applyText('.meta-side-card .eyebrow', { en: 'Arcade Deck', fr: 'Deck Arcade' });
    applyHtml('.meta-side-card p:last-child', { en: 'Pong record: <strong data-arcade-stat="pong-record">0 - 0</strong>. Your name is stored globally for the whole arcade.', fr: 'Bilan Pong : <strong data-arcade-stat="pong-record">0 - 0</strong>. Ton nom est stocke globalement pour toute l arcade.' });
    applyText('.server-panel .eyebrow', { en: 'Connection', fr: 'Connexion' });
    applyText('label[for="pong-player-name"] span', { en: 'Your name', fr: 'Ton nom' });
    applyAttr('#pong-player-name', 'placeholder', { en: 'For example Alex', fr: 'Par exemple Alex' });
    applyText('#pong-save-name', { en: 'Save name', fr: 'Enregistrer le nom' });
    applyText('#pong-copy-link', { en: 'Invite link', fr: 'Lien d invitation' });
    applyText('label[for="pong-server-url"] span', { en: 'Server URL', fr: 'URL du serveur' });
    applyText('#pong-connect', { en: 'Connect', fr: 'Connecter' });
    applyText('#pong-disconnect', { en: 'Disconnect', fr: 'Deconnecter' });
    applyText('#pong-create-room', { en: 'Create room', fr: 'Creer une salle' });
    applyText('#pong-leave-room', { en: 'Leave room', fr: 'Quitter la salle' });
    applyText('label[for="pong-room-input"] span', { en: 'Room code', fr: 'Code de salle' });
    applyText('#pong-join-room', { en: 'Join', fr: 'Rejoindre' });
    applyText('#pong-copy-code', { en: 'Copy code', fr: 'Copier le code' });
    applyText('.presence-panel .eyebrow', { en: 'Lobby Status', fr: 'Statut du lobby' });
    applyText('.info-stack .info-card:nth-of-type(4) .eyebrow', { en: 'Controls', fr: 'Commandes' });
    applyText('.info-stack .info-card:nth-of-type(5) .eyebrow', { en: 'Server Start', fr: 'Demarrage serveur' });
    applyHtml('.info-stack .info-card:nth-of-type(5) p', { en: 'For online Pong, start the local server first with <code class="inline-code">powershell -ExecutionPolicy Bypass -File server.ps1</code> and then open the page via <code class="inline-code">http://localhost:8080/pong.html</code>.', fr: 'Pour Pong en ligne, lance d abord le serveur local avec <code class="inline-code">powershell -ExecutionPolicy Bypass -File server.ps1</code> puis ouvre la page via <code class="inline-code">http://localhost:8080/pong.html</code>.' });
    applyText('.site-footer .footer-inner p:first-child', { en: 'Pong as online 1v1 with room code, names, profile, and instant rematch.', fr: 'Pong en ligne 1v1 avec code de salle, noms, profil et revanche immediate.' });
  }

  function ensureLanguageControls() {
    document.querySelectorAll('.topbar-controls').forEach(function (controls) {
      let switcher = controls.querySelector('[data-language-switcher]');
      if (!switcher) {
        switcher = document.createElement('div');
        switcher.className = 'language-switcher';
        switcher.setAttribute('data-language-switcher', 'true');
        ['de', 'en', 'fr'].forEach(function (language) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'lang-chip';
          button.setAttribute('data-language-option', language);
          button.textContent = language.toUpperCase();
          button.addEventListener('click', function () {
            setLanguage(language);
          });
          switcher.appendChild(button);
        });
        controls.insertBefore(switcher, controls.firstChild || null);
      }
      switcher.setAttribute('aria-label', languageMeta[currentLanguage].switcher);
    });
  }

  function syncLanguageControls() {
    document.querySelectorAll('[data-language-option]').forEach(function (button) {
      const language = button.getAttribute('data-language-option');
      const active = language === currentLanguage;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      button.setAttribute('title', languageMeta[currentLanguage].names[language]);
    });
  }

  function applyStaticTranslations() {
    const pageKey = determinePageKey();
    if (pageKey === 'index') {
      applyIndexTranslations();
    }
    if (pageKey === 'snake') {
      applySnakeTranslations();
    }
    if (pageKey === 'memory') {
      applyMemoryTranslations();
    }
    if (pageKey === 'pong') {
      applyPongTranslations();
    }
  }

  function refreshAll() {
    ensureLanguageControls();
    applyStaticTranslations();
    syncLanguageControls();
    refreshListeners.forEach(function (listener) {
      try {
        listener(currentLanguage);
      } catch (error) {
        // Keep other listeners alive.
      }
    });
  }

  function setLanguage(language) {
    const nextLanguage = sanitizeLanguage(language);
    if (!nextLanguage) {
      return currentLanguage;
    }
    currentLanguage = nextLanguage;
    writeStoredLanguage(currentLanguage);
    refreshAll();
    return currentLanguage;
  }

  function registerRefresh(listener) {
    if (typeof listener === 'function') {
      refreshListeners.add(listener);
    }
    return function () {
      refreshListeners.delete(listener);
    };
  }

  function mapServerMessage(message) {
    if (!message || currentLanguage === 'de') {
      return message || '';
    }
    const text = String(message);
    const roomCreated = text.match(/^Raum ([A-Z0-9]+) erstellt\. Teile den Code mit einer anderen Person\.$/);
    if (roomCreated) {
      return t('pong.server.roomCreated', { roomCode: roomCreated[1] }, text);
    }
    const joinedRoom = text.match(/^Du bist Raum ([A-Z0-9]+) beigetreten\.$/);
    if (joinedRoom) {
      return t('pong.server.joinedRoom', { roomCode: joinedRoom[1] }, text);
    }
    const nameUpdated = text.match(/^Dein Name ist jetzt (.+)\.$/);
    if (nameUpdated) {
      return t('pong.server.nameUpdated', { name: nameUpdated[1] }, text);
    }
    const winner = text.match(/^(.+) gewinnt$/);
    if (winner) {
      return t('pong.server.playerWins', { name: winner[1] }, text);
    }
    const directMap = {
      'Verbunden. Erstelle einen Raum oder tritt einem bei.': 'pong.server.connectedPrompt',
      'Warte auf Spieler 2': 'pong.server.waitingPlayer',
      'Bitte einen Raumcode eingeben.': 'pong.server.roomCodeMissing',
      'Raum nicht gefunden oder bereits voll.': 'pong.server.roomFull',
      'Raum verlassen.': 'pong.server.roomLeft',
      'Fuer eine neue Runde muessen zwei Spieler im Raum sein.': 'pong.server.needTwoPlayers',
      'Match laeuft': 'pong.server.matchRunning',
    };
    return directMap[text] ? t(directMap[text], {}, text) : text;
  }

  window.addEventListener('storage', function (event) {
    if (event.key === STORAGE_KEY) {
      currentLanguage = sanitizeLanguage(event.newValue) || detectBrowserLanguage() || 'de';
      refreshAll();
    }
  });

  window.arcadeI18n = {
    t: t,
    getLanguage: function () { return currentLanguage; },
    setLanguage: setLanguage,
    registerRefresh: registerRefresh,
    refreshAll: refreshAll,
    mapServerMessage: mapServerMessage,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshAll, { once: true });
  } else {
    refreshAll();
  }
}());

