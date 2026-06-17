"use client";

import type { GameState, Move, Piece, Player, Position } from "@animal-chess/game-core";
import {
  type AiLevel,
  applyMove,
  chooseAiMove,
  createInitialState,
  legalMovesForPiece,
  pieceAt
} from "@animal-chess/game-core";
import {
  BadgeInfo,
  Crown,
  Footprints,
  Headphones,
  HelpCircle,
  Home as HomeIcon,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Swords,
  Trophy,
  Undo2,
  UserRound,
  Volume2,
  VolumeX
} from "lucide-react";
import dynamic from "next/dynamic";
import { signIn, signOut, useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { FriendListPanel } from "@/components/friend-list-panel";
import { GuestLoginPanel } from "@/components/guest-login-panel";
import { OnlinePanel } from "@/components/online-panel";
import { ProfilePanel } from "@/components/profile-panel";
import { MenuScreen } from "@/components/screens/MenuScreen";
import { RulesModal } from "@/components/screens/RulesModal";
import { WinOverlay } from "@/components/screens/WinOverlay";
import { getTerrain } from "@/components/three/coords";
import { useGameAudio } from "@/hooks/use-game-audio";
import { useOnlineGame } from "@/hooks/use-online-game";
import { usePlayerIdentity } from "@/hooks/use-player-identity";

const GameCanvas = dynamic(() => import("@/components/three/GameCanvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => <div className="board-loading">Đang dựng bàn cờ 3D…</div>
});

const PIECE_ORDER: Piece["kind"][] = ["rat", "cat", "dog", "wolf", "leopard", "tiger", "lion", "elephant"];

const PIECE_META: Record<Piece["kind"], { name: string; rank: number }> = {
  rat: { name: "Chuột", rank: 1 },
  cat: { name: "Mèo", rank: 2 },
  dog: { name: "Chó", rank: 3 },
  wolf: { name: "Sói", rank: 4 },
  leopard: { name: "Báo", rank: 5 },
  tiger: { name: "Hổ", rank: 6 },
  lion: { name: "Sư tử", rank: 7 },
  elephant: { name: "Voi", rank: 8 }
};

type TerrainKind = "grass" | "water" | "trap-red" | "trap-blue" | "den-red" | "den-blue";

const TERRAIN_META: Record<TerrainKind, { label: string; hint: string; symbol: string }> = {
  grass: { label: "Đất rừng", hint: "Ô thường, mọi quân hợp lệ đều có thể đi vào.", symbol: "" },
  water: { label: "Sông", hint: "Chỉ Chuột xuống nước; Sư tử và Hổ có thể nhảy qua nếu không bị chặn.", symbol: "~" },
  "trap-red": { label: "Bẫy đỏ", hint: "Quân xanh đứng ở đây bị hạ sức mạnh, dễ bị bắt.", symbol: "!" },
  "trap-blue": { label: "Bẫy xanh", hint: "Quân đỏ đứng ở đây bị hạ sức mạnh, dễ bị bắt.", symbol: "!" },
  "den-red": { label: "Hang đỏ", hint: "Xanh vào hang này sẽ thắng ván.", symbol: "D" },
  "den-blue": { label: "Hang xanh", hint: "Đỏ vào hang này sẽ thắng ván.", symbol: "D" }
};

type Mode = "ai" | "online";

export default function Home() {
  const { data: session } = useSession();
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [showRules, setShowRules] = useState(false);
  const [mode, setMode] = useState<Mode>("ai");
  const [aiLevel, setAiLevel] = useState<AiLevel>("medium");
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [past, setPast] = useState<GameState[]>([]);
  const [selectedPieceId, setSelectedPieceId] = useState<string>();
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [username, setUsername] = useState<string>();
  const audio = useGameAudio(audioEnabled);
  const { identity, signInGuest, signOutGuest } = usePlayerIdentity(username);
  const online = useOnlineGame(identity);
  const liveState = mode === "online" && online.snapshot ? online.snapshot.state : state;
  const legalMoves = useMemo(
    () => (selectedPieceId ? legalMovesForPiece(liveState, selectedPieceId) : []),
    [selectedPieceId, liveState]
  );
  const selectedPiece = selectedPieceId ? liveState.pieces.find((piece) => piece.id === selectedPieceId) : undefined;
  const localColor = mode === "ai" ? "red" : online.localPlayer?.color;
  const canAct = liveState.status.state === "playing" && localColor === liveState.turn;
  const turnLabel = liveState.turn === "red" ? "Đỏ" : "Xanh";
  const captureTargets = legalMoves.filter((move) => move.capturedPieceId).length;
  const recentMoves = liveState.history.slice(-5).reverse();
  const inspectedPosition = selectedPiece?.position ?? liveState.lastMove?.to ?? { row: 4, col: 3 };
  const inspectedTerrain = getTerrain(inspectedPosition);
  const inspectedPiece = pieceAt(liveState, inspectedPosition);
  const inspectedMove = legalMoves.find((move) => samePosition(move.to, inspectedPosition));
  const mapAction = inspectedMove?.capturedPieceId
    ? "Có thể ăn quân"
    : inspectedMove
      ? "Có thể di chuyển"
      : inspectedPiece
        ? `${inspectedPiece.owner === "red" ? "Đỏ" : "Xanh"} đang giữ ô`
        : "Ô trống";
  const statusText =
    liveState.status.state === "won"
      ? `${liveState.status.winner === "red" ? "Đỏ" : "Xanh"} thắng bằng ${
          liveState.status.reason === "den" ? "vào hang" : "ăn hết quân"
        }`
      : canAct
        ? "Đến lượt bạn"
        : mode === "online" && !online.localPlayer
          ? "Vào phòng để nhận màu"
          : mode === "ai" && liveState.turn === "blue"
            ? "Máy đang tính"
            : "Chờ đối thủ";
  const hintText =
    liveState.status.state === "won"
      ? "Bấm Ván mới hoặc Rematch để chơi tiếp."
      : selectedPiece
        ? `${PIECE_META[selectedPiece.kind].name} có ${legalMoves.length} nước đi${
            captureTargets ? `, ${captureTargets} nước ăn quân` : ""
          }.`
        : canAct
          ? "Chọn một quân của bạn để xem đường đi."
          : "Theo dõi bàn cờ và chuẩn bị nước tiếp theo.";

  function resetGame() {
    setState(createInitialState());
    setSelectedPieceId(undefined);
    setPast([]);
  }

  function startGame() {
    if (mode === "ai") resetGame();
    setScreen("game");
  }

  function goMenu() {
    setScreen("menu");
    setSelectedPieceId(undefined);
  }

  function undoMove() {
    if (mode !== "ai" || past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((stack) => stack.slice(0, -1));
    setState(previous);
    setSelectedPieceId(undefined);
  }

  function commitMove(move: Pick<Move, "pieceId" | "to">) {
    setPast((stack) => [...stack, state]);
    const next = applyMove(state, move);
    audio.move(next.lastMove?.capturedPieceId ? "capture" : "move");
    setState(next);
    setSelectedPieceId(undefined);
    if (next.status.state === "won") {
      audio.win();
      return;
    }

    if (mode === "ai" && next.turn === "blue") {
      window.setTimeout(() => {
        const reply = chooseAiMove(next, aiLevel, "blue");
        if (!reply) return;
        const aiState = applyMove(next, reply);
        audio.move(aiState.lastMove?.capturedPieceId ? "capture" : "move");
        setState(aiState);
        if (aiState.status.state === "won") audio.win();
      }, 380);
    }
  }

  function handleCellClick(position: Position) {
    if (liveState.status.state !== "playing") return;
    const occupant = pieceAt(liveState, position);
    if (!localColor || liveState.turn !== localColor) return;
    if (occupant?.owner === localColor) {
      selectPiece(occupant);
      return;
    }
    const move = legalMoves.find((candidate) => candidate.to.row === position.row && candidate.to.col === position.col);
    if (!move) return;
    if (mode === "online") {
      online.submitMove(move);
      return;
    }
    commitMove(move);
  }

  function selectPiece(piece: Piece) {
    if (liveState.status.state !== "playing") return;
    if (!localColor || liveState.turn !== localColor || piece.owner !== localColor) return;
    setSelectedPieceId(piece.id);
    audio.select();
  }

  const captured = {
    red: PIECE_ORDER.filter((kind) => !liveState.pieces.some((piece) => piece.owner === "blue" && piece.kind === kind)),
    blue: PIECE_ORDER.filter((kind) => !liveState.pieces.some((piece) => piece.owner === "red" && piece.kind === kind))
  };

  if (screen === "menu") {
    return (
      <>
        <MenuScreen
          mode={mode}
          aiLevel={aiLevel}
          playerName={identity?.username ?? session?.user?.name ?? undefined}
          onModeChange={setMode}
          onAiLevelChange={setAiLevel}
          onStart={startGame}
          onShowRules={() => setShowRules(true)}
        />
        {showRules ? <RulesModal onClose={() => setShowRules(false)} /> : null}
      </>
    );
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Dou Shou Qi</p>
          <h1>Animal Chess</h1>
        </div>
        <div className="topbar-actions">
          <button type="button" onClick={goMenu} title="Về menu">
            <HomeIcon />
          </button>
          <button type="button" onClick={() => setShowRules(true)} title="Luật chơi">
            <HelpCircle />
          </button>
          <button type="button" onClick={() => setAudioEnabled((value) => !value)} title="Bật tắt âm thanh">
            {audioEnabled ? <Volume2 /> : <VolumeX />}
          </button>
          {session?.user ? (
            <button type="button" onClick={() => signOut()} title="Đăng xuất">
              <LogOut />
            </button>
          ) : identity?.kind === "guest" ? (
            <button type="button" onClick={signOutGuest} title="Thoát guest">
              <LogOut />
            </button>
          ) : (
            <button type="button" onClick={() => signIn("google")} title="Đăng nhập Google">
              <LogIn />
            </button>
          )}
        </div>
      </header>

      <section className="match-summary" aria-live="polite">
        <div className={`status-pill ${liveState.turn}`}>
          {liveState.status.state === "won" ? <Trophy /> : <Sparkles />}
          <span>{statusText}</span>
        </div>
        <div>
          <strong>{hintText}</strong>
          <span>
            {mode === "ai"
              ? `Đấu máy mức ${aiLevel === "easy" ? "dễ" : aiLevel === "medium" ? "vừa" : "khó"}`
              : online.snapshot?.id
                ? `Phòng ${online.snapshot.id}`
                : "Online chưa vào phòng"}
          </span>
        </div>
      </section>

      <section className="arena">
        <aside className="side-panel">
          <div className="player-card red">
            <UserRound />
            <div>
              <strong>{identity?.username ?? session?.user?.name ?? "Bạn"}</strong>
              <span>Quân đỏ</span>
            </div>
          </div>
          <CapturedRail owner="red" captured={captured.red as Piece["kind"][]} />
          <PieceRoster
            owner="red"
            state={liveState}
            selectedPieceId={selectedPieceId}
            localColor={localColor}
            onSelect={selectPiece}
          />
          <div className="control-stack">
            <div className="mode-tabs" role="tablist" aria-label="Chế độ chơi">
              <button
                className={mode === "ai" ? "active" : ""}
                onClick={() => setMode("ai")}
                role="tab"
                aria-selected={mode === "ai"}
              >
                <Swords />
                Máy
              </button>
              <button
                className={mode === "online" ? "active" : ""}
                onClick={() => setMode("online")}
                role="tab"
                aria-selected={mode === "online"}
              >
                <MapPin />
                Online
              </button>
            </div>
            <label>
              Độ khó
              <select value={aiLevel} onChange={(event) => setAiLevel(event.target.value as AiLevel)}>
                <option value="easy">Dễ</option>
                <option value="medium">Vừa</option>
                <option value="hard">Khó</option>
              </select>
            </label>
            {mode === "ai" ? (
              <button onClick={undoMove} disabled={past.length === 0}>
                <Undo2 />
                Đi lại
              </button>
            ) : null}
            <button onClick={resetGame}>
              <RefreshCw />
              Ván mới
            </button>
          </div>
        </aside>

        <section className="board-stage">
          <div className="board-topline">
            <div>
              <span>Lượt hiện tại</span>
              <strong>{turnLabel}</strong>
            </div>
            <div>
              <span>Nước đã đi</span>
              <strong>{liveState.history.length}</strong>
            </div>
            <div>
              <span>Quân chọn</span>
              <strong>{selectedPiece ? PIECE_META[selectedPiece.kind].name : "Chưa chọn"}</strong>
            </div>
          </div>
          <div className="map-inspector">
            <div>
              <span>Đang xem</span>
              <strong>
                {inspectedPosition.row + 1}-{inspectedPosition.col + 1}
              </strong>
            </div>
            <div>
              <span>Địa hình</span>
              <strong>{TERRAIN_META[inspectedTerrain].label}</strong>
            </div>
            <div>
              <span>Trạng thái</span>
              <strong>{mapAction}</strong>
            </div>
            <p>{TERRAIN_META[inspectedTerrain].hint}</p>
          </div>
          <div className="board-3d">
            <GameCanvas
              state={liveState}
              selectedPieceId={selectedPieceId}
              legalMoves={legalMoves}
              interactive={canAct}
              viewColor={localColor}
              onCellClick={handleCellClick}
              onSelectPiece={(piece) => handleCellClick(piece.position)}
            />
          </div>
          <div className="turn-banner">
            {liveState.status.state === "won" ? (
              <>
                <Crown />
                {liveState.status.winner === "red" ? "Đỏ" : "Xanh"} thắng
              </>
            ) : (
              <>
                <Footprints />
                Lượt {liveState.turn === "red" ? "đỏ" : "xanh"}
              </>
            )}
          </div>
          <div className="move-tray">
            <div className="panel-title">
              <ShieldAlert />
              Diễn biến
            </div>
            {recentMoves.length ? (
              <ol>
                {recentMoves.map((move, index) => {
                  const piece = liveState.pieces.find((item) => item.id === move.pieceId);
                  const kind = (piece?.kind ?? move.pieceId.split("-")[1]) as Piece["kind"];
                  return (
                    <li key={`${move.pieceId}-${move.to.row}-${move.to.col}-${index}`}>
                      <span>{PIECE_META[kind]?.name ?? move.pieceId}</span>
                      <strong>
                        {move.from.row + 1}-{move.from.col + 1} tới {move.to.row + 1}-{move.to.col + 1}
                      </strong>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p>Chưa có nước đi.</p>
            )}
          </div>
        </section>

        <aside className="side-panel">
          <div className="player-card blue">
            <Headphones />
            <div>
              <strong>{mode === "ai" ? "Máy" : "Đối thủ"}</strong>
              <span>Quân xanh</span>
            </div>
          </div>
          <CapturedRail owner="blue" captured={captured.blue as Piece["kind"][]} />
          <PieceRoster
            owner="blue"
            state={liveState}
            selectedPieceId={selectedPieceId}
            localColor={localColor}
            onSelect={selectPiece}
          />
          <OnlinePanel
            active={mode === "online"}
            onActivate={() => setMode("online")}
            roomId={online.snapshot?.id}
            status={online.status}
            winner={online.snapshot?.state.status.state === "won" ? online.snapshot.state.status.winner : undefined}
            onCreateRoom={online.createRoom}
            onJoinRoom={online.joinRoom}
            onQuickMatch={online.quickMatch}
            onRematch={online.rematch}
          />
          {identity ? (
            <ChatPanel messages={online.snapshot?.chat ?? []} disabled={!online.snapshot} onSend={online.sendChat} />
          ) : null}
          <ProfilePanel onUsernameChange={setUsername} />
          {!session?.user && !identity ? <GuestLoginPanel onSubmit={signInGuest} /> : null}
          <FriendListPanel
            identity={identity}
            presence={online.presence}
            requests={online.friendRequests}
            acceptedFriends={online.acceptedFriends}
            invites={online.invites}
            roomId={online.snapshot?.id}
            onRequest={online.sendFriendRequest}
            onAcceptRequest={online.acceptFriendRequest}
            onInvite={online.inviteToRoom}
            onAcceptInvite={online.acceptInvite}
            onDismissInvite={online.dismissInvite}
          />
        </aside>
      </section>

      {liveState.status.state === "won" ? (
        <WinOverlay
          winner={liveState.status.winner}
          reason={liveState.status.reason}
          mode={mode}
          onNewGame={resetGame}
          onRematch={online.rematch}
          onMenu={goMenu}
        />
      ) : null}
      {showRules ? <RulesModal onClose={() => setShowRules(false)} /> : null}
    </main>
  );
}

function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function CapturedRail({ owner, captured }: { owner: Player; captured: Piece["kind"][] }) {
  return (
    <div className={`captured-rail ${owner}`}>
      <div className="rail-title">Đã ăn quân {owner === "red" ? "xanh" : "đỏ"}</div>
      {captured.length ? (
        captured.map((kind) => (
          <span key={kind} title={PIECE_META[kind].name}>
            <strong>{PIECE_META[kind].rank}</strong>
            {PIECE_META[kind].name}
          </span>
        ))
      ) : (
        <p>Chưa ăn quân.</p>
      )}
    </div>
  );
}

function PieceRoster({
  owner,
  state,
  selectedPieceId,
  localColor,
  onSelect
}: {
  owner: Player;
  state: GameState;
  selectedPieceId?: string;
  localColor?: Player;
  onSelect: (piece: Piece) => void;
}) {
  const canSelect = state.status.state === "playing" && state.turn === owner && localColor === owner;

  return (
    <div className={`piece-roster ${owner}`}>
      <div className="panel-title">
        <BadgeInfo />
        Đội hình
      </div>
      <div className="piece-grid">
        {PIECE_ORDER.map((kind) => {
          const piece = state.pieces.find((item) => item.owner === owner && item.kind === kind);
          const moves = piece ? legalMovesForPiece(state, piece.id) : [];
          return (
            <button
              type="button"
              key={kind}
              className={`${piece ? "" : "defeated"}${piece?.id === selectedPieceId ? " selected" : ""}`}
              onClick={() => piece && onSelect(piece)}
              disabled={!piece || !canSelect}
              title={
                piece ? `${PIECE_META[kind].name} - hạng ${PIECE_META[kind].rank}` : `${PIECE_META[kind].name} đã bị ăn`
              }
            >
              <strong>{PIECE_META[kind].rank}</strong>
              <span>{PIECE_META[kind].name}</span>
              {piece && canSelect ? <em>{moves.length}</em> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
