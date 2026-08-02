const vi = {
  common: {
    close: "Đóng",
    save: "Lưu",
    understood: "Đã hiểu",
    join: "Vào",
    skip: "Bỏ qua",
    you: "Bạn"
  },
  language: {
    label: "Ngôn ngữ",
    vi: "Tiếng Việt",
    en: "English"
  },
  menu: {
    eyebrow: "Dou Shou Qi · Cờ Thú",
    title: "Animal Chess",
    subtitle: "Bàn cờ 3D — chỉ huy bầy thú, lùa đối thủ vào hang.",
    modeAi: "Đấu máy",
    modeAiHint: "Chơi đơn với AI",
    modeOnline: "Online",
    modeOnlineHint: "Đấu người chơi khác",
    difficulty: "Độ khó",
    onlineNote: "Sau khi bắt đầu, tạo phòng hoặc tìm trận nhanh ở bảng Online.",
    startAi: "Bắt đầu",
    startOnline: "Vào sảnh online",
    rules: "Luật chơi",
    greeting: "Xin chào, {{name}}"
  },
  difficulty: {
    easy: "Dễ",
    medium: "Vừa",
    hard: "Khó"
  },
  game: {
    eyebrow: "Dou Shou Qi",
    title: "Animal Chess",
    backToMenu: "Về menu",
    faceoff: "Đối đầu",
    rules: "Luật chơi",
    toggleSound: "Bật tắt âm thanh",
    toggleHaptics: "Bật tắt rung",
    signOut: "Đăng xuất",
    exitGuest: "Thoát guest",
    signInGoogle: "Đăng nhập Google",
    redPieces: "Quân đỏ",
    bluePieces: "Quân xanh",
    opponent: "Đối thủ",
    machine: "Máy",
    modeTabs: "Chế độ chơi",
    tabMachine: "Máy",
    tabOnline: "Online",
    undo: "Đi lại",
    newGame: "Ván mới",
    currentTurn: "Lượt hiện tại",
    movesPlayed: "Nước đã đi",
    selectedPiece: "Quân chọn",
    noneSelected: "Chưa chọn",
    inspecting: "Đang xem",
    terrain: "Địa hình",
    cellState: "Trạng thái",
    winnerBanner: "{{color}} thắng",
    turnBanner: "Lượt {{color}}",
    history: "Diễn biến",
    noMoves: "Chưa có nước đi.",
    moveEntry: "{{from}} tới {{to}}",
    boardLoading: "Đang dựng bàn cờ 3D…",
    roomLabel: "Phòng {{id}}",
    onlineNoRoom: "Online chưa vào phòng",
    aiLevel: "Đấu máy mức {{level}}",
    moveClock: "Giới hạn mỗi nước",
    movePad: "Bàn điều khiển",
    moveUp: "Đi lên",
    moveDown: "Đi xuống",
    moveLeft: "Sang trái",
    moveRight: "Sang phải",
    panelsTitle: "Bảng điều khiển",
    quickActions: "Tiện ích",
    selectKeyHint: "{{name}} · phím {{hotkey}}"
  },
  colors: {
    red: "Đỏ",
    blue: "Xanh",
    redLower: "đỏ",
    blueLower: "xanh"
  },
  status: {
    redWins: "Đỏ thắng bằng {{reason}}",
    blueWins: "Xanh thắng bằng {{reason}}",
    yourTurn: "Đến lượt bạn",
    joinForColor: "Vào phòng để nhận màu",
    machineThinking: "Máy đang tính",
    waitingOpponent: "Chờ đối thủ"
  },
  winReason: {
    den: "vào hang",
    elimination: "ăn hết quân"
  },
  cellAction: {
    canCapture: "Có thể ăn quân",
    canMove: "Có thể di chuyển",
    redHolds: "Đỏ đang giữ ô",
    blueHolds: "Xanh đang giữ ô",
    empty: "Ô trống"
  },
  hint: {
    won: "Bấm Ván mới hoặc Rematch để chơi tiếp.",
    selected: "{{name}} có {{moves}} nước đi.",
    selectedWithCaptures: "{{name}} có {{moves}} nước đi, {{captures}} nước ăn quân.",
    yourTurn: "Chọn một quân của bạn để xem đường đi.",
    waiting: "Theo dõi bàn cờ và chuẩn bị nước tiếp theo."
  },
  roster: {
    title: "Đội hình",
    pieceTooltip: "{{name}} - hạng {{rank}}",
    defeatedTooltip: "{{name}} đã bị ăn"
  },
  captured: {
    title: "Đã ăn quân {{color}}",
    empty: "Chưa ăn quân."
  },
  online: {
    title: "Online",
    roomCode: "Mã phòng: {{id}}",
    createRoom: "Tạo phòng",
    quickMatch: "Ghép nhanh",
    cancelMatch: "Hủy tìm trận",
    roomCodePlaceholder: "Nhập mã phòng",
    rematch: "Rematch",
    shareLink: "Chia sẻ",
    copied: "Đã chép!"
  },
  room: {
    title: "Phòng chờ",
    you: "Bạn",
    host: "Chủ phòng",
    ready: "Sẵn sàng",
    cancelReady: "Hủy sẵn sàng",
    readyTag: "Đã sẵn sàng",
    notReadyTag: "Chưa sẵn sàng",
    start: "Bắt đầu",
    startHint: "Chờ đối thủ vào phòng và bấm sẵn sàng.",
    waitingOpponent: "Đang chờ đối thủ…",
    waitingHostStart: "Đang chờ chủ phòng bắt đầu…",
    leave: "Rời phòng",
    disconnected: "Mất kết nối"
  },
  onlineStatus: {
    disconnected: "Chưa kết nối",
    connected: "Đã kết nối",
    waiting: "Đang chờ đối thủ",
    waitingPlayer: "Đang chờ người chơi",
    inMatch: "Đang trong trận",
    roomError: "Không thể vào phòng",
    moveRejected: "Nước đi bị từ chối"
  },
  chat: {
    title: "Chat",
    empty: "Chưa có tin nhắn",
    placeholder: "Nhắn trong phòng",
    quickLabel: "Nhắn nhanh",
    quick: {
      gg: "Hay lắm!",
      nice: "Nước hay!",
      oops: "Ối!",
      hurry: "Nhanh lên nào!",
      close: "Sát nút!",
      gl: "Chúc may mắn!"
    }
  },
  profile: {
    title: "Hồ sơ",
    saved: "Đã lưu",
    save: "Lưu tên"
  },
  guest: {
    title: "Chơi với tư cách khách",
    namePlaceholder: "Tên khách",
    play: "Vào chơi"
  },
  login: {
    title: "Chào mừng bạn",
    subtitle: "Đăng nhập để chơi online, hoặc vào nhanh với tư cách khách.",
    google: "Đăng nhập với Google",
    or: "hoặc",
    guestPlaceholder: "Tên hiển thị",
    guestCta: "Vào với tư cách khách",
    loading: "Đang tải…"
  },
  friends: {
    title: "Bạn bè",
    invitePlaceholder: "Gửi lời mời",
    searchPlaceholder: "Tìm người chơi theo tên",
    add: "Kết bạn {{name}}",
    noResults: "Không tìm thấy người chơi nào",
    requestSent: "Đã gửi lời mời",
    accept: "Chấp nhận {{name}}",
    decline: "Từ chối {{name}}",
    empty: "Chưa có bạn bè",
    invite: "Mời {{name}}",
    remove: "Xóa {{name}}",
    chat: "Nhắn tin với {{name}}",
    invitedToRoom: "mời vào phòng {{id}}",
    signInRequired: "Đăng nhập Google để dùng danh sách bạn bè."
  },
  dm: {
    title: "Nhắn riêng",
    placeholder: "Nhắn cho {{name}}",
    empty: "Chưa có tin nhắn nào. Chào {{name}} một câu nhé!",
    send: "Gửi",
    close: "Đóng hộp thoại"
  },
  lobby: {
    title: "Sảnh chờ",
    heading: "Sảnh chờ online",
    back: "Quay lại",
    refresh: "Làm mới",
    empty: "Chưa có phòng nào đang mở."
  },
  rank: {
    tier: "Bậc",
    ladderTitle: "Thang hạng",
    ladderOpen: "Xem thang hạng",
    ladderHint: "Phần thưởng nhận một lần khi lần đầu đạt hạng (tính theo ELO đỉnh).",
    floor: "Từ {{elo}} ELO",
    startTier: "Hạng khởi đầu",
    reached: "Đã đạt",
    current: "Hạng hiện tại"
  },
  tier: {
    bronze: "Đồng",
    silver: "Bạc",
    gold: "Vàng",
    platinum: "Bạch kim",
    diamond: "Kim cương",
    master: "Cao thủ",
    grandmaster: "Đại cao thủ"
  },
  gamification: {
    title: "Phần thưởng",
    coins: "Xu",
    level: "Cấp",
    levelShort: "Cấp {{level}}",
    claimDaily: "Nhận thưởng ngày",
    claimed: "Đã nhận hôm nay",
    streakDays: "Chuỗi {{count}} ngày"
  },
  toast: {
    win: "Thắng trận",
    loss: "Thưởng an ủi",
    draw: "Hòa trận",
    tierUp: "Thăng hạng {{tier}}!",
    achievement: "Mở khóa thành tựu",
    levelUp: "Lên cấp!",
    quest: "Hoàn thành nhiệm vụ",
    dismiss: "Ẩn thông báo"
  },
  quests: {
    empty: "Chưa có nhiệm vụ.",
    claim: "Nhận",
    claimed: "Đã nhận",
    WIN_1: "Thắng 1 ván",
    WIN_3: "Thắng 3 ván",
    PLAY_3: "Chơi 3 ván",
    PLAY_5: "Chơi 5 ván",
    STREAK_2: "Thắng 2 ván liên tiếp",
    CAPTURE_ELEPHANT: "Ăn 1 con Voi",
    CAPTURE_ANY_3: "Ăn 3 quân địch",
    LOGIN_1: "Đăng nhập hôm nay"
  },
  rules: {
    ariaLabel: "Luật chơi",
    title: "Luật chơi Cờ Thú",
    rankTitle: "Thứ bậc quân (mạnh → yếu)",
    rankNote:
      "Quân hạng cao ăn được quân hạng bằng hoặc thấp hơn. Ngoại lệ: Chuột (1) ăn được Voi (8), nhưng Voi không ăn được Chuột.",
    terrainTitle: "Địa hình & nước đi",
    waterLabel: "Sông:",
    waterText:
      "chỉ Chuột được xuống nước. Sư tử & Hổ nhảy qua sông theo hàng/cột nếu không bị Chuột chặn trên đường nước.",
    trapLabel: "Bẫy:",
    trapText: "quân địch đứng trên bẫy nhà bạn bị mất sức — quân nào của bạn cũng ăn được nó.",
    denLabel: "Hang:",
    denText: "không quân nào vào hang nhà mình. Đưa một quân vào hang đối thủ là thắng ngay.",
    moveNote: "Mỗi quân đi 1 ô theo chiều ngang hoặc dọc. Ăn quân khi đi vào ô có quân địch hợp lệ.",
    winTitle: "Thắng ván",
    winDen: "Vào được hang đối thủ, hoặc",
    winElimination: "Ăn hết toàn bộ quân đối thủ."
  },
  win: {
    ariaLabel: "Kết quả ván đấu",
    eyebrow: "Kết thúc ván",
    title: "{{color}} chiến thắng",
    reason: "Thắng bằng cách {{reason}}.",
    rematch: "Tái đấu",
    newGame: "Ván mới",
    menu: "Về menu"
  },
  winReasonLong: {
    den: "tiến vào hang đối thủ",
    elimination: "ăn hết quân địch"
  },
  shop: {
    open: "Cửa hàng",
    title: "Cửa hàng trang phục",
    choosePiece: "Chọn quân",
    equip: "Mặc",
    equipped: "Đang mặc",
    buy: "Mua · {{price}}",
    owned: "Đã sở hữu",
    free: "Miễn phí",
    notEnough: "Không đủ xu",
    signInRequired: "Đăng nhập Google để mua trang phục.",
    costumes: {
      none: "Không",
      strawHat: "Nón rơm",
      goldCrown: "Vương miện vàng",
      cape: "Áo choàng"
    }
  },
  pieces: {
    rat: "Chuột",
    cat: "Mèo",
    dog: "Chó",
    wolf: "Sói",
    leopard: "Báo",
    tiger: "Hổ",
    lion: "Sư tử",
    elephant: "Voi"
  },
  terrain: {
    grass: { label: "Đất rừng", hint: "Ô thường, mọi quân hợp lệ đều có thể đi vào." },
    water: { label: "Sông", hint: "Chỉ Chuột xuống nước; Sư tử và Hổ có thể nhảy qua nếu không bị chặn." },
    trapRed: { label: "Bẫy đỏ", hint: "Quân xanh đứng ở đây bị hạ sức mạnh, dễ bị bắt." },
    trapBlue: { label: "Bẫy xanh", hint: "Quân đỏ đứng ở đây bị hạ sức mạnh, dễ bị bắt." },
    denRed: { label: "Hang đỏ", hint: "Xanh vào hang này sẽ thắng ván." },
    denBlue: { label: "Hang xanh", hint: "Đỏ vào hang này sẽ thắng ván." }
  }
} as const;

export default vi;
