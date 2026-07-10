const en = {
  common: {
    close: "Close",
    save: "Save",
    understood: "Got it",
    join: "Join",
    skip: "Skip",
    you: "You"
  },
  language: {
    label: "Language",
    vi: "Tiếng Việt",
    en: "English"
  },
  menu: {
    eyebrow: "Dou Shou Qi · Animal Chess",
    title: "Animal Chess",
    subtitle: "A 3D board — command your beasts and drive the rival into the den.",
    modeAi: "Vs AI",
    modeAiHint: "Play solo against the AI",
    modeOnline: "Online",
    modeOnlineHint: "Play against other people",
    difficulty: "Difficulty",
    onlineNote: "After starting, create a room or find a quick match in the Online panel.",
    startAi: "Start",
    startOnline: "Enter online lobby",
    rules: "Rules",
    greeting: "Hello, {{name}}"
  },
  difficulty: {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard"
  },
  game: {
    eyebrow: "Dou Shou Qi",
    title: "Animal Chess",
    backToMenu: "Back to menu",
    faceoff: "Faceoff",
    rules: "Rules",
    toggleSound: "Toggle sound",
    toggleHaptics: "Toggle vibration",
    signOut: "Sign out",
    exitGuest: "Exit guest",
    signInGoogle: "Sign in with Google",
    redPieces: "Red side",
    bluePieces: "Blue side",
    opponent: "Opponent",
    machine: "AI",
    modeTabs: "Game mode",
    tabMachine: "AI",
    tabOnline: "Online",
    undo: "Undo",
    newGame: "New game",
    currentTurn: "Current turn",
    movesPlayed: "Moves played",
    selectedPiece: "Selected piece",
    noneSelected: "None",
    inspecting: "Inspecting",
    terrain: "Terrain",
    cellState: "State",
    winnerBanner: "{{color}} wins",
    turnBanner: "{{color}}'s turn",
    history: "Move log",
    noMoves: "No moves yet.",
    moveEntry: "{{from}} to {{to}}",
    boardLoading: "Building the 3D board…",
    roomLabel: "Room {{id}}",
    onlineNoRoom: "Online — not in a room",
    aiLevel: "Vs AI · {{level}}",
    moveClock: "Per-move limit",
    movePad: "Move pad",
    moveUp: "Move up",
    moveDown: "Move down",
    moveLeft: "Move left",
    moveRight: "Move right",
    panelsTitle: "Panels"
  },
  colors: {
    red: "Red",
    blue: "Blue",
    redLower: "red",
    blueLower: "blue"
  },
  status: {
    redWins: "Red wins by {{reason}}",
    blueWins: "Blue wins by {{reason}}",
    yourTurn: "Your turn",
    joinForColor: "Join a room to get a color",
    machineThinking: "AI is thinking",
    waitingOpponent: "Waiting for opponent"
  },
  winReason: {
    den: "reaching the den",
    elimination: "capturing all pieces"
  },
  cellAction: {
    canCapture: "Can capture",
    canMove: "Can move",
    redHolds: "Red holds this cell",
    blueHolds: "Blue holds this cell",
    empty: "Empty cell"
  },
  hint: {
    won: "Press New game or Rematch to play again.",
    selected: "{{name}} has {{moves}} moves.",
    selectedWithCaptures: "{{name}} has {{moves}} moves, {{captures}} captures.",
    yourTurn: "Pick one of your pieces to see its moves.",
    waiting: "Watch the board and plan your next move."
  },
  roster: {
    title: "Lineup",
    pieceTooltip: "{{name}} - rank {{rank}}",
    defeatedTooltip: "{{name}} was captured"
  },
  captured: {
    title: "Captured {{color}}",
    empty: "No captures yet."
  },
  online: {
    title: "Online",
    roomCode: "Room code: {{id}}",
    createRoom: "Create room",
    quickMatch: "Quick match",
    cancelMatch: "Cancel search",
    roomCodePlaceholder: "Enter room code",
    rematch: "Rematch",
    shareLink: "Share",
    copied: "Copied!"
  },
  room: {
    title: "Waiting room",
    you: "You",
    host: "Host",
    ready: "Ready",
    cancelReady: "Cancel ready",
    readyTag: "Ready",
    notReadyTag: "Not ready",
    start: "Start game",
    startHint: "Waiting for your opponent to join and ready up.",
    waitingOpponent: "Waiting for an opponent…",
    waitingHostStart: "Waiting for the host to start…",
    leave: "Leave room",
    disconnected: "Disconnected"
  },
  onlineStatus: {
    disconnected: "Not connected",
    connected: "Connected",
    waiting: "Waiting for opponent",
    waitingPlayer: "Waiting for a player",
    inMatch: "In a match",
    roomError: "Could not join the room",
    moveRejected: "Move rejected"
  },
  chat: {
    title: "Chat",
    empty: "No messages yet",
    placeholder: "Message the room",
    quickLabel: "Quick chat",
    quick: {
      gg: "Good game!",
      nice: "Nice move!",
      oops: "Oops!",
      hurry: "Hurry up!",
      close: "So close!",
      gl: "Good luck!"
    }
  },
  profile: {
    title: "Profile",
    saved: "Saved",
    save: "Save name"
  },
  guest: {
    title: "Play as a guest",
    namePlaceholder: "Guest name",
    play: "Play"
  },
  login: {
    title: "Welcome",
    subtitle: "Sign in to play online, or jump in quickly as a guest.",
    google: "Sign in with Google",
    or: "or",
    guestPlaceholder: "Display name",
    guestCta: "Continue as guest",
    loading: "Loading…"
  },
  friends: {
    title: "Friends",
    invitePlaceholder: "Send a request",
    searchPlaceholder: "Search players by name",
    add: "Add {{name}}",
    noResults: "No players found",
    requestSent: "Request sent",
    accept: "Accept {{name}}",
    decline: "Decline {{name}}",
    empty: "No friends yet",
    invite: "Invite {{name}}",
    remove: "Remove {{name}}",
    chat: "Message {{name}}",
    invitedToRoom: "invited you to room {{id}}",
    signInRequired: "Sign in with Google to use your friends list."
  },
  dm: {
    title: "Private chat",
    placeholder: "Message {{name}}",
    empty: "No messages yet. Say hi to {{name}}!",
    send: "Send",
    close: "Close chat"
  },
  lobby: {
    title: "Lobby",
    heading: "Online lobby",
    back: "Back",
    refresh: "Refresh",
    empty: "No open rooms right now."
  },
  rank: {
    tier: "Tier",
    ladderTitle: "Rank ladder",
    ladderOpen: "View rank ladder",
    ladderHint: "One-time reward the first time you reach a tier (based on peak ELO).",
    floor: "From {{elo}} ELO",
    startTier: "Starting tier",
    reached: "Reached",
    current: "Current tier"
  },
  tier: {
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    platinum: "Platinum",
    diamond: "Diamond",
    master: "Master",
    grandmaster: "Grandmaster"
  },
  gamification: {
    title: "Rewards",
    coins: "Coins",
    level: "Level",
    levelShort: "Lvl {{level}}",
    claimDaily: "Claim daily",
    claimed: "Claimed today",
    streakDays: "{{count}}-day streak"
  },
  toast: {
    win: "Match won",
    loss: "Consolation",
    draw: "Draw",
    tierUp: "Promoted to {{tier}}!",
    achievement: "Achievement unlocked",
    levelUp: "Level up!",
    quest: "Quest complete",
    dismiss: "Dismiss"
  },
  quests: {
    empty: "No quests yet.",
    claim: "Claim",
    claimed: "Claimed",
    WIN_1: "Win 1 game",
    WIN_3: "Win 3 games",
    PLAY_3: "Play 3 games",
    PLAY_5: "Play 5 games",
    STREAK_2: "Win 2 in a row",
    CAPTURE_ELEPHANT: "Capture an elephant",
    CAPTURE_ANY_3: "Capture 3 pieces",
    LOGIN_1: "Log in today"
  },
  rules: {
    ariaLabel: "Rules",
    title: "Animal Chess rules",
    rankTitle: "Piece hierarchy (strong → weak)",
    rankNote:
      "A higher-rank piece captures equal or lower ranks. Exception: the Rat (1) captures the Elephant (8), but the Elephant cannot capture the Rat.",
    terrainTitle: "Terrain & moves",
    waterLabel: "River:",
    waterText:
      "only the Rat can enter the water. The Lion & Tiger leap across the river along a row/column unless a Rat blocks the lane.",
    trapLabel: "Trap:",
    trapText: "an enemy standing on your trap loses its strength — any of your pieces can capture it.",
    denLabel: "Den:",
    denText: "no piece may enter its own den. Moving a piece into the enemy den wins instantly.",
    moveNote: "Each piece moves 1 cell horizontally or vertically. Capture by moving onto a valid enemy cell.",
    winTitle: "Winning",
    winDen: "Reach the enemy den, or",
    winElimination: "Capture all of the enemy pieces."
  },
  win: {
    ariaLabel: "Match result",
    eyebrow: "Match over",
    title: "{{color}} wins",
    reason: "Won by {{reason}}.",
    rematch: "Rematch",
    newGame: "New game",
    menu: "Back to menu"
  },
  winReasonLong: {
    den: "reaching the enemy den",
    elimination: "capturing all enemy pieces"
  },
  shop: {
    open: "Shop",
    title: "Costume shop",
    choosePiece: "Choose a piece",
    equip: "Equip",
    equipped: "Equipped",
    buy: "Buy · {{price}}",
    owned: "Owned",
    free: "Free",
    notEnough: "Not enough coins",
    signInRequired: "Sign in with Google to buy costumes.",
    costumes: {
      none: "None",
      strawHat: "Straw hat",
      goldCrown: "Gold crown",
      cape: "Cape"
    }
  },
  pieces: {
    rat: "Rat",
    cat: "Cat",
    dog: "Dog",
    wolf: "Wolf",
    leopard: "Leopard",
    tiger: "Tiger",
    lion: "Lion",
    elephant: "Elephant"
  },
  terrain: {
    grass: { label: "Forest floor", hint: "A normal cell — any valid piece can move onto it." },
    water: { label: "River", hint: "Only the Rat enters the water; the Lion and Tiger may leap across if unblocked." },
    trapRed: { label: "Red trap", hint: "A blue piece here is weakened and easy to capture." },
    trapBlue: { label: "Blue trap", hint: "A red piece here is weakened and easy to capture." },
    denRed: { label: "Red den", hint: "Blue entering this den wins the game." },
    denBlue: { label: "Blue den", hint: "Red entering this den wins the game." }
  }
} as const;

export default en;
