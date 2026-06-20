"use client";

import type { PieceKind, Player } from "@animal-chess/game-core";
import { useTranslation } from "@animal-chess/i18n";
import { Button, cx, IconButton, Select } from "@animal-chess/ui";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Headphones,
  HelpCircle,
  Home as HomeIcon,
  LayoutPanelLeft,
  LogIn,
  LogOut,
  MapPin,
  Move,
  RefreshCw,
  Sparkles,
  Swords,
  Undo2,
  UserRound,
  Volume2,
  VolumeX,
  X
} from "lucide-react";
import dynamic from "next/dynamic";
import { signIn, signOut, useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import { ChatPanel } from "@/components/chat-panel";
import { FriendListPanel } from "@/components/friend-list-panel";
import { GuestLoginPanel } from "@/components/guest-login-panel";
import { LanguageSwitcher } from "@/components/language-switcher";
import { OnlinePanel } from "@/components/online-panel";
import { PlayerBadge } from "@/components/player-badge";
import { ProfilePanel } from "@/components/profile-panel";
import { RankRail } from "@/components/rank-rail";
import { MenuScreen } from "@/components/screens/MenuScreen";
import { RulesModal } from "@/components/screens/RulesModal";
import { WinOverlay } from "@/components/screens/WinOverlay";
import { PIECE_ORDER, useGameController } from "@/hooks/use-game-controller";
import { STATIC_EXPORT } from "@/lib/flags";

function BoardLoading() {
  const { t } = useTranslation();
  return <div className="board-loading">{t("game.boardLoading")}</div>;
}

const GameCanvas = dynamic(() => import("@/components/three/GameCanvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => <BoardLoading />
});

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
  const youColor: Player = localColor ?? "red";
  const foeColor: Player = youColor === "red" ? "blue" : "red";
  const youName = identity?.username ?? session?.user?.name ?? t("common.you");
  const foeSlot = online.snapshot?.players.find((slot) => slot.color === foeColor);
  const foeName = mode === "ai" ? t("game.machine") : (foeSlot?.username ?? t("game.opponent"));
  const clockFor = (color: Player) =>
    mode === "online" && online.snapshot
      ? online.timer[color]
      : liveState.turn === color && liveState.status.state === "playing"
        ? moveSecondsLeft
        : moveSecondsTotal;

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
      <section className="arena match-skin">
        <div className="brand-logo">
          <Sparkles aria-hidden="true" />
          <span>{t("game.title")}</span>
        </div>
        <RankRail
          owner="red"
          state={liveState}
          selectedPieceId={selectedPieceId}
          localColor={localColor}
          pieceLabels={pieceLabels}
          onSelect={selectPiece}
        />
        <section className="board-stage">
          <div className="board-3d">
            <PlayerBadge
              side="you"
              color={youColor}
              name={youName}
              seconds={clockFor(youColor)}
              active={liveState.status.state === "playing" && liveState.turn === youColor}
              avatarUrl={session?.user?.image}
              icon={<UserRound />}
            />
            <PlayerBadge
              side="foe"
              color={foeColor}
              name={foeName}
              seconds={clockFor(foeColor)}
              active={liveState.status.state === "playing" && liveState.turn === foeColor}
              icon={<Headphones />}
            />
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
        </section>

        <RankRail
          owner="blue"
          state={liveState}
          selectedPieceId={selectedPieceId}
          localColor={localColor}
          pieceLabels={pieceLabels}
          onSelect={selectPiece}
        />

        <div className={cx("rails", drawerOpen && "open")}>
          <div className="rails-head">
            <span className="panel-title">
              <LayoutPanelLeft />
              {t("game.panelsTitle")}
            </span>
            <IconButton label={t("common.close")} icon={<X />} onClick={() => setDrawerOpen(false)} />
          </div>
          <aside className="side-panel">
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
                {STATIC_EXPORT ? null : (
                  <Button
                    className={cx(mode === "online" && "active")}
                    onClick={() => setMode("online")}
                    role="tab"
                    aria-selected={mode === "online"}
                    icon={<MapPin />}
                  >
                    {t("game.tabOnline")}
                  </Button>
                )}
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
            {STATIC_EXPORT ? null : (
              <>
                <OnlinePanel
                  active={mode === "online"}
                  onActivate={() => setMode("online")}
                  roomId={online.snapshot?.id}
                  status={t(online.status)}
                  waiting={online.status === "onlineStatus.waiting"}
                  winner={
                    online.snapshot?.state.status.state === "won" ? online.snapshot.state.status.winner : undefined
                  }
                  onCreateRoom={online.createRoom}
                  onJoinRoom={online.joinRoom}
                  onQuickMatch={online.quickMatch}
                  onCancelMatch={online.cancelMatch}
                  onRematch={online.rematch}
                />
                {identity ? (
                  <ChatPanel
                    messages={online.snapshot?.chat ?? []}
                    disabled={!online.snapshot}
                    onSend={online.sendChat}
                  />
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
              </>
            )}
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

      <footer className="topbar footer-bar">
        <p className="eyebrow">{t("game.eyebrow")}</p>
        <div className="topbar-actions">
          <LanguageSwitcher />
          {mode === "online" && foeSlot ? (
            // biome-ignore lint/a11y/useSemanticElements: visual grouping; <fieldset> would break the flex layout and need a legend
            <div className="footer-faceoff" role="group" aria-label={t("game.faceoff")}>
              <span className={cx("faceoff-side", youColor)}>
                <span className="faceoff-avatar">
                  {session?.user?.image ? (
                    // biome-ignore lint/performance/noImgElement: remote avatar on static export; next/image optimization is off
                    <img src={session.user.image} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <UserRound />
                  )}
                </span>
                <span className="faceoff-name">{youName}</span>
              </span>
              <Swords className="faceoff-vs" aria-hidden="true" />
              <span className={cx("faceoff-side", foeColor)}>
                <span className="faceoff-avatar">
                  <Headphones />
                </span>
                <span className="faceoff-name">{foeName}</span>
              </span>
            </div>
          ) : (
            <IconButton label={t("game.backToMenu")} icon={<HomeIcon />} onClick={goMenu} />
          )}
          <IconButton label={t("game.rules")} icon={<HelpCircle />} onClick={() => setShowRules(true)} />
          <IconButton
            label={t("game.toggleSound")}
            icon={audioEnabled ? <Volume2 /> : <VolumeX />}
            onClick={() => setAudioEnabled((value) => !value)}
          />
          {STATIC_EXPORT ? null : session?.user ? (
            <IconButton label={t("game.signOut")} icon={<LogOut />} onClick={() => signOut()} />
          ) : identity?.kind === "guest" ? (
            <IconButton label={t("game.exitGuest")} icon={<LogOut />} onClick={signOutGuest} />
          ) : (
            <IconButton label={t("game.signInGoogle")} icon={<LogIn />} onClick={() => signIn("google")} />
          )}
        </div>
      </footer>

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
