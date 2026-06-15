import type { Player, UserId } from "../types";

interface DonorStatsProps {
  players: Player[];
  donationCounts: Map<UserId, number>;
}

export function DonorStats({ players, donationCounts }: DonorStatsProps) {
  const rows = players
    .map((player) => ({
      player,
      count: donationCounts.get(player.id) ?? 0,
    }))
    .sort((a, b) => b.count - a.count || a.player.accountName.localeCompare(b.player.accountName));
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <section className="donor-board" aria-label="Donation stats">
      <div className="panel-title">
        <span>Donor board</span>
        <small>{total ? `${total} delivered` : "no confirmed donations yet"}</small>
      </div>
      <div className="donor-list">
        {rows.map(({ player, count }, index) => (
          <span
            className={count ? "donor-pill active" : "donor-pill"}
            key={player.id}
          >
            <strong>{index + 1}. {player.accountName}</strong>
            <small>{count}</small>
          </span>
        ))}
      </div>
    </section>
  );
}
