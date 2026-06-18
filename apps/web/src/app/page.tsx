"use client";

import { PIECE_RANK, type PieceKind } from "@animal-chess/game-core";
import { useTranslation } from "@animal-chess/i18n";
import { Button, cx, IconButton, Select } from "@animal-chess/ui";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crown,
  Footprints,
  Headphones,
  HelpCircle,
  Home as HomeIcon,
  LayoutPanelLeft,
  LogIn,
  LogOut,
  MapPin,
  Move,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  Undo2,
  UserRound,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import dynamic from "next/dynamic";
import { signIn, signOut, useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { CapturedRail } from "@/components/captured-rail";
import { ChatPanel } from "@/components/chat-panel";
import { FriendListPanel } from "@/components/friend-list-panel";
import { GuestLoginPanel } from "@/components/guest-login-panel";
import { LanguageSwitcher } from "@/components/language-switcher";
import { OnlinePanel } from "@/components/online-panel";
import { PieceRoster } from "@/components/piece-roster";
import { ProfilePanel } from "@/components/profile-panel";
import { MenuScreen } from "@/components/screens/MenuScreen";
import { RulesModal } from "@/components/screens/RulesModal";
import { WinOverlay } from "@/components/screens/WinOverlay";
import type { TerrainKind } from "@/components/three/coords";
import { PIECE_ORDER, useGameController } from "@/hooks/use-game-controller";

function BoardLoading() {
  const { t } = useTranslation();
  return <div className="board-loading">{t("game.boardLoading")}</div>;
}

const GameCanvas = dynamic(() => import("@/components/three/GameCanvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => <BoardLoading />
});

const TERRAIN_KEY: Record<TerrainKind, "grass" | "water" | "trapRed" | "trapBlue" | "denRed" | "denBlue"> = {
  grass: "grass",
  water: "water",
  "trap-red": "trapRed",
  "trap-blue": "trapBlue",
  "den-red": "denRed",
  "den-blue": "denBlue"
};

export default function Home() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const game = useGameController();
  const {
    screen,
    showRules,
    setShowRules,
    mode,
    setMode,
    aiLevel,
    setAiLevel,
    audioEnabled,
    setAudioEnabled,
    past,
    selectedPieceId,
    identity,
    signInGuest,
    signOutGuest,
    online,
    setUsername,
    liveState,
    legalMoves,
    selectedPiece,
    localColor,
    canAct,
    captureTargets,
    recentMoves,
    inspectedPosition,
    inspectedTerrain,
    inspectedPiece,
    inspectedMove,
    captured,
    dpadMoves,
    moveSecondsLeft,
    moveSecondsTotal,
    resetGame,
    startGame,
    goMenu,
    undoMove,
    handleCellClick,
    selectPiece,
    moveSelectedDir
  } = game;

  // react-i18next returns a fresh `t` on language change, so this recomputes (and re-bakes badges) per language.
  const pieceLabels = useMemo(
    () => Object.fromEntries(PIECE_ORDER.map((kind) => [kind, t(`pieces.${kind}`)])) as Record<PieceKind, string>,
    [t]
  );
  const turnLabel = t(liveState.turn === "red" ? "colors.red" : "colors.blue");
  const mapAction = inspectedMove?.capturedPieceId
    ? t("cellAction.canCapture")
    : inspectedMove
      ? t("cellAction.canMove")
      : inspectedPiece
        ? t(inspectedPiece.owner === "red" ? "cellAction.redHolds" : "cellAction.blueHolds")
        : t("cellAction.empty");
  const statusText = (() => {
    if (liveState.status.state === "won") {
      const reason = t(liveState.status.reason === "den" ? "winReason.den" : "winReason.elimination");
      return t(liveState.status.winner === "red" ? "status.redWins" : "status.blueWins", { reason });
    }
    if (canAct) return t("status.yourTurn");
    if (mode === "online" && !online.localPlayer) return t("status.joinForColor");
    if (mode === "ai" && liveState.turn === "blue") return t("status.machineThinking");
    return t("status.waitingOpponent");
  })();
  const hintText = (() => {
    if (liveState.status.state === "won") return t("hint.won");
    if (selectedPiece) {
      const name: string = t(`pieces.${selectedPiece.kind}`);
      return captureTargets
        ? t("hint.selectedWithCaptures", { name, moves: String(legalMoves.length), captures: String(captureTargets) })
        : t("hint.selected", { name, moves: String(legalMoves.length) });
    }
    if (canAct) return t("hint.yourTurn");
    return t("hint.waiting");
  })();

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
          <p className="eyebrow">{t("game.eyebrow")}</p>
          <h1>{t("game.title")}</h1>
        </div>
        <div className="topbar-actions">
          <LanguageSwitcher />
          <IconButton label={t("game.backToMenu")} icon={<HomeIcon />} onClick={goMenu} />
          <IconButton label={t("game.rules")} icon={<HelpCircle />} onClick={() => setShowRules(true)} />
          <IconButton
            label={t("game.toggleSound")}
            icon={audioEnabled ? <Volume2 /> : <VolumeX />}
            onClick={() => setAudioEnabled((value) => !value)}
          />
          {session?.user ? (
            <IconButton label={t("game.signOut")} icon={<LogOut />} onClick={() => signOut()} />
          ) : identity?.kind === "guest" ? (
            <IconButton label={t("game.exitGuest")} icon={<LogOut />} onClick={signOutGuest} />
          ) : (
            <IconButton label={t("game.signInGoogle")} icon={<LogIn />} onClick={() => signIn("google")} />
          )}
        </div>
      </header>

      <section className="match-summary" aria-live="polite">
        <div className={cx("status-pill", liveState.turn)}>
          {liveState.status.state === "won" ? <Trophy /> : <Sparkles />}
          <span>{statusText}</span>
        </div>
        <div>
          <strong>{hintText}</strong>
          <span>
            {mode === "ai"
              ? t("game.aiLevel", { level: t(`difficulty.${aiLevel}`) })
              : online.snapshot?.id
                ? t("game.roomLabel", { id: online.snapshot.id })
                : t("game.onlineNoRoom")}
          </span>
        </div>
      </section>

      <section className="arena">
        <section className="board-stage">
          <div className="board-topline">
            <div>
              <span>{t("game.currentTurn")}</span>
              <strong>{turnLabel}</strong>
            </div>
            <div>
              <span>{t("game.movesPlayed")}</span>
              <strong>{liveState.history.length}</strong>
            </div>
            <div>
              <span>{t("game.selectedPiece")}</span>
              <strong>{selectedPiece ? t(`pieces.${selectedPiece.kind}`) : t("game.noneSelected")}</strong>
            </div>
          </div>
          <div className="map-inspector">
            <div>
              <span>{t("game.inspecting")}</span>
              <strong>
                {inspectedPosition.row + 1}-{inspectedPosition.col + 1}
              </strong>
            </div>
            <div>
              <span>{t("game.terrain")}</span>
              <strong>{t(`terrain.${TERRAIN_KEY[inspectedTerrain]}.label`)}</strong>
            </div>
            <div>
              <span>{t("game.cellState")}</span>
              <strong>{mapAction}</strong>
            </div>
            <p>{t(`terrain.${TERRAIN_KEY[inspectedTerrain]}.hint`)}</p>
          </div>
          {liveState.status.state === "playing" ? (
            <div className={cx("move-clock", moveSecondsLeft <= 15 && "urgent")}>
              <Timer className="clock-icon" />
              <span className="clock-time">{moveSecondsLeft}s</span>
              <div className="clock-bar">
                <div
                  className="clock-fill"
                  style={{ transform: `scaleX(${Math.max(0, moveSecondsLeft / moveSecondsTotal)})` }}
                />
              </div>
              <span>{t("game.moveClock")}</span>
            </div>
          ) : null}
          <div className="board-3d">
            <GameCanvas
              state={liveState}
              pieceLabels={pieceLabels}
              selectedPieceId={selectedPieceId}
              legalMoves={legalMoves}
              interactive={canAct}
              viewColor={localColor}
              onCellClick={handleCellClick}
            />
          </div>
          {selectedPiece && canAct ? (
            <div className="board-dpad" role="toolbar" aria-label={t("game.movePad")}>
              <button
                type="button"
                className="dpad-up"
                onClick={() => moveSelectedDir("up")}
                disabled={!dpadMoves.up}
                aria-label={t("game.moveUp")}
              >
                <ArrowUp />
              </button>
              <button
                type="button"
                className="dpad-left"
                onClick={() => moveSelectedDir("left")}
                disabled={!dpadMoves.left}
                aria-label={t("game.moveLeft")}
              >
                <ArrowLeft />
              </button>
              <div className="dpad-core" aria-hidden="true">
                <Move />
              </div>
              <button
                type="button"
                className="dpad-right"
                onClick={() => moveSelectedDir("right")}
                disabled={!dpadMoves.right}
                aria-label={t("game.moveRight")}
              >
                <ArrowRight />
              </button>
              <button
                type="button"
                className="dpad-down"
                onClick={() => moveSelectedDir("down")}
                disabled={!dpadMoves.down}
                aria-label={t("game.moveDown")}
              >
                <ArrowDown />
              </button>
            </div>
          ) : null}
          <div className="turn-banner">
            {liveState.status.state === "won" ? (
              <>
                <Crown />
                {t("game.winnerBanner", { color: t(liveState.status.winner === "red" ? "colors.red" : "colors.blue") })}
              </>
            ) : (
              <>
                <Footprints />
                {t("game.turnBanner", { color: t(liveState.turn === "red" ? "colors.redLower" : "colors.blueLower") })}
              </>
            )}
          </div>
          <div className="move-tray">
            <div className="panel-title">
              <ShieldAlert />
              {t("game.history")}
            </div>
            {recentMoves.length ? (
              <ol>
                {recentMoves.map((move, index) => {
                  const piece = liveState.pieces.find((item) => item.id === move.pieceId);
                  const kind = (piece?.kind ?? move.pieceId.split("-")[1]) as PieceKind;
                  const name = kind in PIECE_RANK ? t(`pieces.${kind}`) : move.pieceId;
                  return (
                    <li key={`${move.pieceId}-${move.to.row}-${move.to.col}-${index}`}>
                      <span>{name}</span>
                      <strong>
                        {t("game.moveEntry", {
                          from: `${move.from.row + 1}-${move.from.col + 1}`,
                          to: `${move.to.row + 1}-${move.to.col + 1}`
                        })}
                      </strong>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p>{t("game.noMoves")}</p>
            )}
          </div>
        </section>

        <div className={cx("rails", drawerOpen && "open")}>
          <div className="rails-head">
            <span className="panel-title">
              <LayoutPanelLeft />
              {t("game.panelsTitle")}
            </span>
            <IconButton label={t("common.close")} icon={<X />} onClick={() => setDrawerOpen(false)} />
          </div>
          <aside className="side-panel">
            <div className="player-card red">
              <UserRound />
              <div>
                <strong>{identity?.username ?? session?.user?.name ?? t("common.you")}</strong>
                <span>{t("game.redPieces")}</span>
              </div>
            </div>
            <CapturedRail owner="red" captured={captured.red} />
            <PieceRoster
              owner="red"
              state={liveState}
              selectedPieceId={selectedPieceId}
              localColor={localColor}
              onSelect={selectPiece}
            />
            <div className="control-stack">
              <div className="mode-tabs" role="tablist" aria-label={t("game.modeTabs")}>
                <Button
                  className={cx(mode === "ai" && "active")}
                  onClick={() => setMode("ai")}
                  role="tab"
                  aria-selected={mode === "ai"}
                  icon={<Swords />}
                >
                  {t("game.tabMachine")}
                </Button>
                <Button
                  className={cx(mode === "online" && "active")}
                  onClick={() => setMode("online")}
                  role="tab"
                  aria-selected={mode === "online"}
                  icon={<MapPin />}
                >
                  {t("game.tabOnline")}
                </Button>
              </div>
              <Select
                label={t("menu.difficulty")}
                value={aiLevel}
                onChange={(event) => setAiLevel(event.target.value as typeof aiLevel)}
                options={[
                  { value: "easy", label: t("difficulty.easy") },
                  { value: "medium", label: t("difficulty.medium") },
                  { value: "hard", label: t("difficulty.hard") }
                ]}
              />
              {mode === "ai" ? (
                <Button onClick={undoMove} disabled={past.length === 0} icon={<Undo2 />}>
                  {t("game.undo")}
                </Button>
              ) : null}
              <Button onClick={resetGame} icon={<RefreshCw />}>
                {t("game.newGame")}
              </Button>
            </div>
          </aside>

          <aside className="side-panel">
            <div className="player-card blue">
              <Headphones />
              <div>
                <strong>{mode === "ai" ? t("game.machine") : t("game.opponent")}</strong>
                <span>{t("game.bluePieces")}</span>
              </div>
            </div>
            <CapturedRail owner="blue" captured={captured.blue} />
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
              status={t(online.status)}
              waiting={online.status === "onlineStatus.waiting"}
              winner={online.snapshot?.state.status.state === "won" ? online.snapshot.state.status.winner : undefined}
              onCreateRoom={online.createRoom}
              onJoinRoom={online.joinRoom}
              onQuickMatch={online.quickMatch}
              onCancelMatch={online.cancelMatch}
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
        </div>

        <button
          type="button"
          className={cx("drawer-scrim", drawerOpen && "open")}
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setDrawerOpen(false)}
        />
        <button
          type="button"
          className="drawer-toggle"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((value) => !value)}
        >
          <LayoutPanelLeft />
          <span>{t("game.panelsTitle")}</span>
        </button>
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
