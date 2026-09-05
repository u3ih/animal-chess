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
  LayoutPanelLeft,
  MapPin,
  Move,
  RefreshCw,
  Sparkles,
  Swords,
  Undo2,
  UserRound,
  X
} from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { BoardCanvas } from "@/components/board-canvas";
import { CapturedRail } from "@/components/captured-rail";
import { ChatPanel } from "@/components/chat-panel";
import { CostumeShop } from "@/components/costume-shop";
import { DmChat } from "@/components/dm-chat";
import { FriendListPanel } from "@/components/friend-list-panel";
import { type AuthAction, GameActions } from "@/components/game-actions";
import { InGameChat } from "@/components/in-game-chat";
import { PlayerBadge } from "@/components/player-badge";
import { ProfilePanel } from "@/components/profile-panel";
import { RankLadder } from "@/components/rank-ladder";
import { RankRail } from "@/components/rank-rail";
import { RewardToasts } from "@/components/reward-toasts";
import { RewardsPanel } from "@/components/rewards-panel";
import { LobbyScreen } from "@/components/screens/LobbyScreen";
import { LoginScreen } from "@/components/screens/LoginScreen";
import { MenuScreen } from "@/components/screens/MenuScreen";
import { RulesModal } from "@/components/screens/RulesModal";
import { WinOverlay } from "@/components/screens/WinOverlay";
import { useCostumes } from "@/hooks/use-costumes";
import { PIECE_ORDER, useGameController } from "@/hooks/use-game-controller";
import { useMediaQuery } from "@/hooks/use-media-query";
import { STATIC_EXPORT } from "@/lib/flags";
import styles from "./page.module.scss";

export default function Home() {
  const { t } = useTranslation();
  const { data: session, status: sessionStatus } = useSession();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showLadder, setShowLadder] = useState(false);
  // Avoid a hydration mismatch: localStorage guest + session both resolve only on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Same breakpoint the stylesheet uses to turn `.rails` into a bottom sheet: below it the footer sits
  // under a viewport-tall board, so its actions move into the drawer instead of being scrolled to.
  const compact = useMediaQuery("(max-width: 1180px)");
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
    hapticsEnabled,
    setHapticsEnabled,
    hapticsSupported,
    past,
    selectedPieceId,
    identity,
    signInGuest,
    signOutGuest,
    online,
    social,
    joinOnlineRoom,
    setUsername,
    liveState,
    legalMoves,
    selectedPiece,
    localColor,
    canAct,
    captured,
    dpadMoves,
    resetGame,
    startGame,
    goMenu,
    undoMove,
    handleCellClick,
    selectPiece,
    moveSelectedDir
  } = game;
  const costumes = useCostumes(identity);

  // react-i18next returns a fresh `t` on language change, so this recomputes (and re-bakes badges) per language.
  const pieceLabels = useMemo(
    () => Object.fromEntries(PIECE_ORDER.map((kind) => [kind, t(`pieces.${kind}`)])) as Record<PieceKind, string>,
    [t]
  );
  const activeDmFriend = social.friends.find((f) => f.user.id === social.activeDmFriendId)?.user ?? null;
  const youColor: Player = localColor ?? "red";
  const foeColor: Player = youColor === "red" ? "blue" : "red";
  const youName = identity?.username ?? session?.user?.name ?? t("common.you");
  const foeSlot = online.snapshot?.players.find((slot) => slot.color === foeColor);
  const foeName = mode === "ai" ? t("game.machine") : (foeSlot?.username ?? t("game.opponent"));
  const authAction: AuthAction = session?.user
    ? "sign-out-google"
    : identity?.kind === "guest"
      ? "sign-out-guest"
      : "sign-in";
  const actionProps = {
    audioEnabled,
    hapticsEnabled,
    hapticsSupported,
    authAction,
    onMenu: goMenu,
    onShowRules: () => setShowRules(true),
    onToggleAudio: () => setAudioEnabled((value) => !value),
    onToggleHaptics: () => setHapticsEnabled(!hapticsEnabled),
    onAuth: () => {
      if (authAction === "sign-in") void signIn("google");
      else if (authAction === "sign-out-guest") signOutGuest();
      else void signOut();
    }
  };

  // Hold the splash until the client resolves identity (NextAuth session + localStorage guest).
  if (!mounted || sessionStatus === "loading") {
    return (
      <main className="menu-screen">
        <div className="menu-card">
          <p className="menu-sub">{t("login.loading")}</p>
        </div>
      </main>
    );
  }

  // Login gate: no Google session and no guest yet → force a sign-in choice before the menu.
  if (!identity) {
    return (
      <>
        <LoginScreen onGoogle={() => signIn("google")} onGuest={signInGuest} />
        {showRules ? <RulesModal onClose={() => setShowRules(false)} /> : null}
      </>
    );
  }

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
          onOpenShop={() => setShowShop(true)}
        />
        {showRules ? <RulesModal onClose={() => setShowRules(false)} /> : null}
        <CostumeShop
          open={showShop}
          onClose={() => setShowShop(false)}
          costumes={costumes}
          coins={social.me?.wallet.coins ?? null}
          isGoogle={identity?.kind === "google"}
        />
      </>
    );
  }

  if (screen === "lobby") {
    return (
      <>
        <LobbyScreen
          online={online}
          lobby={social.lobby}
          statusLabel={t(online.status)}
          onRefresh={social.refreshLobby}
          onBack={goMenu}
        />
        {showRules ? <RulesModal onClose={() => setShowRules(false)} /> : null}
      </>
    );
  }

  return (
    <main className={styles.gameShell}>
      <section className={cx(styles.arena, "match-skin")}>
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
        <section className={styles.boardStage}>
          <div className={styles.board3d}>
            <PlayerBadge
              side="you"
              color={youColor}
              name={youName}
              active={liveState.status.state === "playing" && liveState.turn === youColor}
              avatarUrl={identity?.avatar ?? session?.user?.image}
              icon={<UserRound />}
            />
            <PlayerBadge
              side="foe"
              color={foeColor}
              name={foeName}
              active={liveState.status.state === "playing" && liveState.turn === foeColor}
              avatarUrl={foeSlot?.avatar}
              icon={<Headphones />}
            />
            <CapturedRail side="you" owner={youColor} captured={captured[youColor]} />
            <CapturedRail side="foe" owner={foeColor} captured={captured[foeColor]} />
            <BoardCanvas
              state={liveState}
              pieceLabels={pieceLabels}
              equippedCostumes={costumes.equipped}
              selectedPieceId={selectedPieceId}
              legalMoves={legalMoves}
              interactive={canAct}
              viewColor={localColor}
              onCellClick={handleCellClick}
            />
          </div>
          {selectedPiece && canAct ? (
            <div className={styles.boardDpad} role="toolbar" aria-label={t("game.movePad")}>
              <button
                type="button"
                className={styles.dpadUp}
                onClick={() => moveSelectedDir("up")}
                disabled={!dpadMoves.up}
                aria-label={t("game.moveUp")}
              >
                <ArrowUp />
              </button>
              <button
                type="button"
                className={styles.dpadLeft}
                onClick={() => moveSelectedDir("left")}
                disabled={!dpadMoves.left}
                aria-label={t("game.moveLeft")}
              >
                <ArrowLeft />
              </button>
              <div className={styles.dpadCore} aria-hidden="true">
                <Move />
              </div>
              <button
                type="button"
                className={styles.dpadRight}
                onClick={() => moveSelectedDir("right")}
                disabled={!dpadMoves.right}
                aria-label={t("game.moveRight")}
              >
                <ArrowRight />
              </button>
              <button
                type="button"
                className={styles.dpadDown}
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

        <div className={cx(styles.rails, drawerOpen && styles.open)}>
          <div className={styles.railsHead}>
            <span className="panel-title">
              <LayoutPanelLeft />
              {t("game.panelsTitle")}
            </span>
            <IconButton label={t("common.close")} icon={<X />} onClick={() => setDrawerOpen(false)} />
          </div>
          {compact ? (
            <aside className="side-panel">
              <span className="panel-title">{t("game.quickActions")}</span>
              <GameActions className={styles.drawerActions} {...actionProps} />
            </aside>
          ) : null}
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
                {identity ? (
                  <ChatPanel
                    messages={online.snapshot?.chat ?? []}
                    disabled={!online.snapshot}
                    onSend={online.sendChat}
                  />
                ) : null}
                <ProfilePanel
                  me={social.me}
                  onRename={social.updateUsername}
                  onUsernameChange={setUsername}
                  onOpenLadder={() => setShowLadder(true)}
                />
                {session?.user ? (
                  <RewardsPanel
                    dailyStatus={social.dailyStatus}
                    quests={social.quests}
                    onClaimDaily={() => void social.claimDaily()}
                    onClaimQuest={social.claimQuest}
                  />
                ) : null}
                <FriendListPanel
                  identity={identity}
                  friends={social.friends}
                  requests={social.requests}
                  invites={social.invites}
                  dmUnread={social.dmUnread}
                  roomId={online.snapshot?.id}
                  onRequest={social.sendFriendRequest}
                  onAddById={social.sendFriendRequestTo}
                  onSearch={social.searchUsers}
                  onRespond={social.respondFriendRequest}
                  onRemove={social.removeFriend}
                  onInvite={(toUserId) => online.snapshot?.id && social.sendRoomInvite(toUserId, online.snapshot.id)}
                  onOpenChat={(user) => void social.openDm(user.id)}
                  onAcceptInvite={joinOnlineRoom}
                  onDismissInvite={social.dismissInvite}
                />
              </>
            )}
          </aside>
        </div>

        <button
          type="button"
          className={cx(styles.drawerScrim, drawerOpen && styles.open)}
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setDrawerOpen(false)}
        />
        <button
          type="button"
          className={styles.drawerToggle}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((value) => !value)}
        >
          <LayoutPanelLeft />
          <span>{t("game.panelsTitle")}</span>
        </button>

        {!STATIC_EXPORT && mode === "online" && online.snapshot ? (
          <InGameChat
            messages={online.snapshot.chat}
            disabled={false}
            onSend={online.sendChat}
            selfId={identity.userId}
          />
        ) : null}
        {!STATIC_EXPORT && activeDmFriend ? (
          <DmChat
            friend={activeDmFriend}
            messages={social.dmThreads[activeDmFriend.id] ?? []}
            meId={social.me?.user.id ?? null}
            onSend={(body) => activeDmFriend && void social.sendDm(activeDmFriend.id, body)}
            onClose={social.closeDm}
          />
        ) : null}
        {STATIC_EXPORT ? null : <RewardToasts toasts={social.toasts} onDismiss={social.dismissToast} />}
      </section>

      {/* Compact viewports get this cluster inside the panels drawer instead — see `compact` above. */}
      <footer className={cx(styles.topbar, styles.footerBar, compact && styles.footerHidden)}>
        <p className="eyebrow">{t("game.eyebrow")}</p>
        <div className={styles.footerRight}>
          {mode === "online" && foeSlot ? (
            // biome-ignore lint/a11y/useSemanticElements: visual grouping; <fieldset> would break the flex layout and need a legend
            <div className={styles.footerFaceoff} role="group" aria-label={t("game.faceoff")}>
              <span className={cx(styles.faceoffSide, styles[youColor])}>
                <span className={styles.faceoffAvatar}>
                  {(identity?.avatar ?? session?.user?.image) ? (
                    // biome-ignore lint/performance/noImgElement: remote avatar on static export; next/image optimization is off
                    <img src={identity?.avatar ?? session?.user?.image ?? ""} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <UserRound />
                  )}
                </span>
                <span className={styles.faceoffName}>{youName}</span>
              </span>
              <Swords className={styles.faceoffVs} aria-hidden="true" />
              <span className={cx(styles.faceoffSide, styles[foeColor])}>
                <span className={styles.faceoffAvatar}>
                  {foeSlot?.avatar ? (
                    // biome-ignore lint/performance/noImgElement: remote avatar on static export; next/image optimization is off
                    <img src={foeSlot.avatar} alt="" referrerPolicy="no-referrer" />
                  ) : (
                    <Headphones />
                  )}
                </span>
                <span className={styles.faceoffName}>{foeName}</span>
              </span>
            </div>
          ) : null}
          <GameActions className={styles.topbarActions} {...actionProps} />
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
      {showLadder ? <RankLadder me={social.me} onClose={() => setShowLadder(false)} /> : null}
    </main>
  );
}
