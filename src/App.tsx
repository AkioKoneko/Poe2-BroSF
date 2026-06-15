import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AddWishModal } from "./components/AddWishModal";
import { AuthGate } from "./components/AuthGate";
import { BoardControls } from "./components/BoardControls";
import { DetailModal } from "./components/DetailModal";
import { DonorStats } from "./components/DonorStats";
import { ItemTooltip } from "./components/ItemTooltip";
import { ProfileModal } from "./components/ProfileModal";
import { Roster } from "./components/Roster";
import { TopBar } from "./components/TopBar";
import { WishCard } from "./components/WishCard";
import {
  ascendancyOptions,
  currentUserId,
  initialClaims,
  players,
  wishes as initialWishes,
} from "./data/mockData";
import {
  addRemoteWish,
  deleteRemoteWish,
  fulfillRemoteWish,
  loadBoardData,
  redeemInvite,
  saveRemoteProfile,
  setRemoteClaim,
  signInWithAccountName,
  signOutOfSupabase,
  updateRemoteWish,
  type BoardData,
} from "./lib/brossfRepository";
import { isSupabaseConfigured } from "./lib/supabaseEnv";
import type { DraftWish, Player, SortMode, UserId } from "./types";
import { clearLocalAuth, loadLocalAuth, saveLocalAuth } from "./utils/localAuth";
import {
  applyDraftToWish,
  buildAscendancyMap,
  buildPlayerMap,
  createWishFromDraft,
  filterWishes,
  getActiveBuild,
  getBuildWishCounts,
  getDonationCounts,
  isClaimedBy,
  sortWishes,
  toggleClaim,
} from "./utils/wishlist";

const useRemoteData = isSupabaseConfigured();

export default function App() {
  const [activeUserId, setActiveUserId] = useState<UserId | null>(() =>
    useRemoteData ? null : loadLocalAuth(),
  );
  const [playerList, setPlayerList] = useState(players);
  const [wishList, setWishList] = useState(initialWishes);
  const [claims, setClaims] = useState(initialClaims);
  const [appError, setAppError] = useState("");
  const [loading, setLoading] = useState(useRemoteData);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [activeBuildIds, setActiveBuildIds] = useState<string[]>([]);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipHeight, setTooltipHeight] = useState(620);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingWishId, setEditingWishId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [donorBoardOpen, setDonorBoardOpen] = useState(false);

  const playersById = useMemo(() => buildPlayerMap(playerList), [playerList]);
  const ascendanciesById = useMemo(
    () => buildAscendancyMap(ascendancyOptions),
    [],
  );
  const currentPlayer =
    playersById.get(activeUserId ?? currentUserId) ?? playerList[0];
  const currentBuild = getActiveBuild(currentPlayer);
  const currentAscendancy = ascendanciesById.get(currentBuild.ascendancyId);

  const visibleWishes = useMemo(() => {
    const filtered = filterWishes(
      wishList,
      deferredSearch,
      activeBuildIds,
      playersById,
    );
    return sortWishes(filtered, sortMode, claims, playersById);
  }, [activeBuildIds, claims, deferredSearch, playersById, sortMode, wishList]);

  const openWishes = useMemo(
    () => visibleWishes.filter((wish) => !wish.fulfilledAt),
    [visibleWishes],
  );
  const fulfilledWishes = useMemo(
    () => visibleWishes.filter((wish) => wish.fulfilledAt),
    [visibleWishes],
  );

  const counts = useMemo(() => getBuildWishCounts(wishList), [wishList]);
  const donationCounts = useMemo(() => getDonationCounts(wishList), [wishList]);
  const hoveredWish = useMemo(
    () => wishList.find((wish) => wish.id === hover?.id) ?? null,
    [hover?.id, wishList],
  );
  const detailWish = useMemo(
    () => wishList.find((wish) => wish.id === detailId) ?? null,
    [detailId, wishList],
  );
  const editingWish = useMemo(
    () => wishList.find((wish) => wish.id === editingWishId) ?? null,
    [editingWishId, wishList],
  );
  const tooltipPosition = useMemo(() => {
    if (!hover || typeof window === "undefined") {
      return { left: 14, top: 14 };
    }

    const maxLeft = window.innerWidth - 448;
    const maxTop = window.innerHeight - tooltipHeight - 12;

    return {
      left: Math.max(14, Math.min(hover.x + 18, maxLeft)),
      top: Math.max(12, Math.min(hover.y - 40, maxTop)),
    };
  }, [hover, tooltipHeight]);

  useEffect(() => {
    if (!useRemoteData) return;

    let cancelled = false;
    loadBoardData()
      .then((data) => {
        if (!cancelled) applyBoardData(data);
      })
      .catch(() => {
        if (!cancelled) setActiveUserId(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    if (!hoveredWish || !tooltipRef.current) return;

    setTooltipHeight(Math.ceil(tooltipRef.current.getBoundingClientRect().height));
  }, [hoveredWish]);

  function applyBoardData(data: BoardData) {
    setActiveUserId(data.activeUserId);
    setPlayerList(data.players);
    setWishList(data.wishes);
    setClaims(data.claims);
    setAppError("");
  }

  async function runRemote(action: () => Promise<BoardData>) {
    try {
      setLoading(true);
      applyBoardData(await action());
    } catch (error) {
      setAppError(error instanceof Error ? error.message : "Supabase action failed.");
    } finally {
      setLoading(false);
    }
  }

  async function login(accountName: string, password: string) {
    if (useRemoteData) {
      await runRemote(() => signInWithAccountName(accountName, password));
      return;
    }

    const player = playerList.find(
      (candidate) =>
        candidate.accountName.toLowerCase() === accountName.trim().toLowerCase(),
    );
    if (!player) return;

    saveLocalAuth(player.id);
    setActiveUserId(player.id);
  }

  async function claimInvite(token: string, password: string) {
    if (useRemoteData) {
      await runRemote(() => redeemInvite(token, password));
      return;
    }

    saveLocalAuth("pasha");
    setActiveUserId("pasha");
  }

  async function logout() {
    if (useRemoteData) {
      try {
        await signOutOfSupabase();
      } catch (error) {
        setAppError(error instanceof Error ? error.message : "Sign out failed.");
      }
    } else {
      clearLocalAuth();
    }

    setActiveUserId(null);
    setDetailId(null);
    setAddOpen(false);
    setEditingWishId(null);
    setProfileOpen(false);
  }

  function openAddWish() {
    setEditingWishId(null);
    setAddOpen(true);
  }

  async function saveWish(draft: DraftWish, buildId: string) {
    if (useRemoteData) {
      await runRemote(() =>
        addRemoteWish(draft, currentPlayer.id, buildId, wishList.length + 1),
      );
      setAddOpen(false);
      return;
    }

    setWishList((current) => [
      createWishFromDraft(draft, currentPlayer.id, buildId, current.length + 1),
      ...current,
    ]);
    setAddOpen(false);
  }

  function openEditWish(wishId: string) {
    setAddOpen(false);
    setDetailId(null);
    setEditingWishId(wishId);
  }

  async function saveEditedWish(draft: DraftWish, buildId: string) {
    if (!editingWish) return;

    if (useRemoteData) {
      await runRemote(() => updateRemoteWish(editingWish, draft, buildId));
      setEditingWishId(null);
      return;
    }

    setWishList((current) =>
      current.map((wish) =>
        wish.id === editingWish.id && wish.ownerId === currentPlayer.id
          ? applyDraftToWish(wish, draft, buildId)
          : wish,
      ),
    );
    setEditingWishId(null);
  }

  async function deleteWish(wishId: string) {
    if (useRemoteData) {
      await runRemote(() => deleteRemoteWish(wishId));
    } else {
      setWishList((current) =>
        current.filter(
          (wish) => wish.id !== wishId || wish.ownerId !== currentPlayer.id,
        ),
      );
    }

    setDetailId(null);
    setEditingWishId((current) => (current === wishId ? null : current));
  }

  async function toggleWishClaim(wishId: string) {
    const wish = wishList.find((candidate) => candidate.id === wishId);
    if (wish?.fulfilledAt) return;

    if (useRemoteData) {
      await runRemote(() =>
        setRemoteClaim(
          wishId,
          currentPlayer.id,
          !isClaimedBy(claims, wishId, currentPlayer.id),
        ),
      );
      return;
    }

    setClaims((current) => toggleClaim(current, wishId, currentPlayer.id));
  }

  async function fulfillWish(wishId: string, donorId: UserId) {
    if (useRemoteData) {
      await runRemote(() => fulfillRemoteWish(wishId, donorId));
      setDetailId(null);
      return;
    }

    setWishList((current) =>
      current.map((wish) =>
        wish.id === wishId && wish.ownerId === currentPlayer.id
          ? {
              ...wish,
              fulfilledBy: donorId,
              fulfilledAt: new Date().toISOString(),
            }
          : wish,
      ),
    );
    setDetailId(null);
  }

  function toggleBuildFilter(buildId: string) {
    setActiveBuildIds((current) =>
      current.includes(buildId)
        ? current.filter((id) => id !== buildId)
        : [...current, buildId],
    );
  }

  async function saveProfile(player: Player) {
    if (useRemoteData) {
      await runRemote(() => saveRemoteProfile(player));
      setProfileOpen(false);
      return;
    }

    setPlayerList((current) =>
      current.map((candidate) =>
        candidate.id === player.id ? player : candidate,
      ),
    );
  }

  if (loading && !activeUserId) {
    return (
      <main className="auth-shell">
        <section className="auth-card" aria-label="Loading BROSF">
          <div className="auth-brand">
            <p className="eyebrow">Shared Wishlist / SSF Trade Pact</p>
            <h1>BROSF</h1>
            <div className="rule" />
          </div>
        </section>
      </main>
    );
  }

  if (!activeUserId) {
    return (
      <AuthGate
        players={playerList}
        mockMode={!useRemoteData}
        onLogin={login}
        onInvite={claimInvite}
        error={appError}
      />
    );
  }

  return (
    <div className="app-shell">
      <TopBar
        currentPlayer={currentPlayer}
        currentAscendancy={currentAscendancy}
        wishCount={wishList.filter((wish) => !wish.fulfilledAt).length}
        onAdd={openAddWish}
        onDonorBoard={() => setDonorBoardOpen(true)}
        onProfile={() => setProfileOpen(true)}
        onLogout={logout}
      />

      <main className="workspace">
        <section className="board" aria-label="Wishlist board">
          {appError ? <p className="form-error">{appError}</p> : null}
          <Roster
            players={playerList}
            counts={counts}
            activeBuildIds={activeBuildIds}
            ascendanciesById={ascendanciesById}
            onToggleBuild={toggleBuildFilter}
            onClearBuilds={() => setActiveBuildIds([])}
          />
          <div className="board-tools">
            <BoardControls
              search={search}
              sort={sortMode}
              onSearch={setSearch}
              onSort={setSortMode}
            />
          </div>

          <div className="showcase-scroll">
            {openWishes.length ? (
              <div className="wish-grid">
                {openWishes.map((wish) => {
                  const owner = playersById.get(wish.ownerId) ?? playerList[0];
                  return (
                    <WishCard
                      key={wish.id}
                      wish={wish}
                      owner={owner}
                      claims={claims}
                      currentUserId={currentPlayer.id}
                      ascendanciesById={ascendanciesById}
                      onOpen={setDetailId}
                      onHover={(id, x, y) => setHover({ id, x, y })}
                      onHoverEnd={() => setHover(null)}
                      onToggleClaim={toggleWishClaim}
                      onFulfill={fulfillWish}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <h2>No wishes match this view</h2>
                <p>Try a shorter search, clear group filters, or add the first wish.</p>
              </div>
            )}
            {fulfilledWishes.length ? (
              <section className="fulfilled-section" aria-label="Fulfilled wishes">
                <div className="section-title">
                  <span>Claimed and taken</span>
                  <small>auto-clean after about 14 days</small>
                </div>
                <div className="wish-grid fulfilled-grid">
                  {fulfilledWishes.map((wish) => {
                    const owner = playersById.get(wish.ownerId) ?? playerList[0];
                    return (
                      <WishCard
                        key={wish.id}
                        wish={wish}
                        owner={owner}
                        claims={claims}
                        currentUserId={currentPlayer.id}
                        ascendanciesById={ascendanciesById}
                        onOpen={setDetailId}
                        onHover={(id, x, y) => setHover({ id, x, y })}
                        onHoverEnd={() => setHover(null)}
                        onToggleClaim={toggleWishClaim}
                        onFulfill={fulfillWish}
                      />
                    );
                  })}
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </main>

      {hoveredWish ? (
        <div ref={tooltipRef} className="hover-tip" style={tooltipPosition}>
          <ItemTooltip
            wish={hoveredWish}
            owner={playersById.get(hoveredWish.ownerId) ?? playerList[0]}
            claims={claims}
            playersById={playersById}
          />
        </div>
      ) : null}

      {detailWish ? (
        <DetailModal
          wish={detailWish}
          owner={playersById.get(detailWish.ownerId) ?? playerList[0]}
          currentUserId={currentPlayer.id}
          claims={claims}
          playersById={playersById}
          onClose={() => setDetailId(null)}
          onToggleClaim={toggleWishClaim}
          onEdit={openEditWish}
          onDelete={deleteWish}
          onFulfill={fulfillWish}
        />
      ) : null}

      {addOpen ? (
        <AddWishModal
          builds={currentPlayer.builds}
          initialBuildId={currentBuild.id}
          onClose={() => setAddOpen(false)}
          onSave={saveWish}
        />
      ) : null}

      {editingWish ? (
        <AddWishModal
          key={editingWish.id}
          builds={currentPlayer.builds}
          initialBuildId={editingWish.buildId}
          initialWish={editingWish}
          onClose={() => setEditingWishId(null)}
          onSave={saveEditedWish}
        />
      ) : null}

      {profileOpen ? (
        <ProfileModal
          player={currentPlayer}
          ascendancies={ascendancyOptions}
          onClose={() => setProfileOpen(false)}
          onSave={saveProfile}
        />
      ) : null}

      {donorBoardOpen ? (
        <DonorStats
          players={playerList}
          donationCounts={donationCounts}
          onClose={() => setDonorBoardOpen(false)}
        />
      ) : null}
    </div>
  );
}
