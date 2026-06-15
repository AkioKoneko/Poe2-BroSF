import type { AscendancyId, AscendancyOption, Player } from "../types";
import { getBuildOptions } from "../utils/wishlist";

interface RosterProps {
  players: Player[];
  counts: Map<string, number>;
  activeBuildIds: string[];
  ascendanciesById: Map<AscendancyId, AscendancyOption>;
  onToggleBuild: (buildId: string) => void;
  onClearBuilds: () => void;
}

export function Roster({
  players,
  counts,
  activeBuildIds,
  ascendanciesById,
  onToggleBuild,
  onClearBuilds,
}: RosterProps) {
  const buildOptions = getBuildOptions(players);
  const activeBuilds = new Set(activeBuildIds);
  const hasActiveBuilds = activeBuildIds.length > 0;

  return (
    <section className="roster" aria-label="Group filter">
      <div className="panel-title">
        <span>Group filter</span>
        {hasActiveBuilds ? (
          <button className="clear-filter" onClick={onClearBuilds} type="button">
            Clear
          </button>
        ) : null}
      </div>
      <div className="roster-list">
        {buildOptions.map(({ player, build }) => {
          const ascendancy = ascendanciesById.get(build.ascendancyId);
          const isActive = activeBuilds.has(build.id);

          return (
          <button
            aria-pressed={isActive}
            className={isActive ? "roster-row active" : "roster-row"}
            key={`${player.id}-${build.id}`}
            onClick={() => onToggleBuild(build.id)}
            type="button"
          >
            <span className="asc-icon roster-mark">
              {ascendancy ? (
                <img src={ascendancy.icon} alt="" loading="lazy" />
              ) : (
                player.initials
              )}
            </span>
            <span className="roster-copy">
              <strong>{player.accountName}</strong>
              <small>
                {build.buildName} / {ascendancy?.name ?? "Unknown"}
              </small>
            </span>
            <span className="roster-count">{counts.get(build.id) ?? 0}</span>
            {isActive ? <span className="roster-check">✓</span> : null}
          </button>
          );
        })}
      </div>
    </section>
  );
}
