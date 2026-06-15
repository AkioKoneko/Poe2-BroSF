import type { Player, UserId } from "../types";

interface DonorStatsProps {
  players: Player[];
  donationCounts: Map<UserId, number>;
  onClose: () => void;
}

export function DonorStats({ players, donationCounts, onClose }: DonorStatsProps) {
  const rows = players
    .map((player) => ({
      player,
      count: donationCounts.get(player.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.player.accountName.localeCompare(b.player.accountName));
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="modal-backdrop donor-backdrop" onMouseDown={onClose}>
      <section
        className="donor-modal"
        aria-labelledby="donor-board-title"
        aria-modal="true"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Guild deliveries</p>
            <h2 id="donor-board-title">Donor board</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close donor board"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>
        <p className="donor-total">
          {total ? `${total} confirmed donations` : "No confirmed donations yet"}
        </p>
        <div className="donor-list">
          {rows.map(({ player, count }, index) => (
            <span
              className={count ? "donor-pill active" : "donor-pill"}
              key={player.id}
            >
              <span className="donor-rank">{index + 1}</span>
              <strong>{player.accountName}</strong>
              <small>{count}</small>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
