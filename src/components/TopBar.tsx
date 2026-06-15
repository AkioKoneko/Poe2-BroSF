import type { AscendancyOption, Player } from "../types";
import { getActiveBuild } from "../utils/wishlist";

interface TopBarProps {
  currentPlayer: Player;
  currentAscendancy?: AscendancyOption;
  wishCount: number;
  onAdd: () => void;
  onProfile: () => void;
  onLogout: () => void;
}

export function TopBar({
  currentPlayer,
  currentAscendancy,
  wishCount,
  onAdd,
  onProfile,
  onLogout,
}: TopBarProps) {
  const activeBuild = getActiveBuild(currentPlayer);

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Private Pact</p>
        <h1>BROSF Wishlist</h1>
      </div>
      <span className="wish-count">{wishCount} wishes</span>
      <div className="topbar-actions">
        <button className="primary-action compact" onClick={onAdd} type="button">
          + Add wish
        </button>
        <button className="profile-chip" onClick={onProfile} type="button">
          <span className="asc-icon">
            {currentAscendancy ? (
              <img src={currentAscendancy.icon} alt="" loading="lazy" />
            ) : (
              currentPlayer.initials
            )}
          </span>
          <span>
            <strong>{currentPlayer.accountName}</strong>
            <small>{activeBuild.buildName} / profile</small>
          </span>
        </button>
        <button
          className="icon-button"
          aria-label="Log out"
          onClick={onLogout}
          type="button"
        >
          ⏻
        </button>
      </div>
    </header>
  );
}
