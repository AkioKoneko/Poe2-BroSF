import type {
  AscendancyId,
  AscendancyOption,
  ClaimState,
  Player,
  UserId,
  Wish,
} from "../types";
import {
  getClaimers,
  getWishBuild,
  getWishCardTexts,
  isClaimedBy,
  kindLabel,
  priorityLabel,
} from "../utils/wishlist";

interface WishCardProps {
  wish: Wish;
  owner: Player;
  claims: ClaimState;
  currentUserId: UserId;
  playersById: Map<UserId, Player>;
  ascendanciesById: Map<AscendancyId, AscendancyOption>;
  onOpen: (wishId: string) => void;
  onHover: (wishId: string, clientX: number, clientY: number) => void;
  onHoverEnd: () => void;
  onToggleClaim: (wishId: string) => void;
}

export function WishCard({
  wish,
  owner,
  claims,
  currentUserId,
  playersById,
  ascendanciesById,
  onOpen,
  onHover,
  onHoverEnd,
  onToggleClaim,
}: WishCardProps) {
  const isOwner = wish.ownerId === currentUserId;
  const claimers = getClaimers(claims, wish.id);
  const claimedByMe = isClaimedBy(claims, wish.id, currentUserId);
  const ownerBuild = getWishBuild(wish, owner);
  const ownerAscendancy = ascendanciesById.get(ownerBuild.ascendancyId);
  const cardTexts = getWishCardTexts(wish);
  const placeholder =
    wish.kind === "pack"
      ? { title: "Pack", subtitle: "Craft" }
      : wish.kind === "rare"
        ? { title: "Rare", subtitle: "Template" }
        : { title: kindLabel[wish.kind], subtitle: "Wish" };

  function stopAction(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
  }

  return (
    <article
      className={`wish-card rarity-${wish.kind}`}
      onClick={() => onOpen(wish.id)}
      onMouseEnter={(event) =>
        onHover(wish.id, event.clientX, event.clientY)
      }
      onMouseMove={(event) => onHover(wish.id, event.clientX, event.clientY)}
      onMouseLeave={onHoverEnd}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter") onOpen(wish.id);
      }}
    >
      <div className="card-art">
        {wish.icon ? (
          <img src={wish.icon} alt={wish.name} loading="lazy" />
        ) : (
          <div className="rare-placeholder" aria-hidden="true">
            <span>{placeholder.title}</span>
            <small>{placeholder.subtitle}</small>
          </div>
        )}
        <span className={`priority-rune priority-${wish.priority}`}>
          {priorityLabel[wish.priority]}
        </span>
      </div>
      <div className="card-body">
        <div className="card-kicker">
          <span>{kindLabel[wish.kind]}</span>
          {wish.quantity ? <span>Need ×{wish.quantity}</span> : null}
        </div>
        <h2>{wish.name}</h2>
        {cardTexts.map((cardText) => (
          <div
            className={`card-text card-text-${cardText.tone}`}
            key={`${cardText.label}-${cardText.text}`}
          >
            <span>{cardText.label}</span>
            <p>{cardText.text}</p>
          </div>
        ))}
      </div>
      <footer className="card-footer">
        <span className="owner-chip">
          <span className="asc-icon small">
            {ownerAscendancy ? (
              <img src={ownerAscendancy.icon} alt="" loading="lazy" />
            ) : (
              owner.initials
            )}
          </span>
          <span className="owner-copy">
            <strong>{owner.accountName}</strong>
            <small>{ownerBuild.buildName}</small>
          </span>
        </span>

        {claimers.length ? (
          <span className="claimers">
            {claimers.map((id) => playersById.get(id)?.accountName ?? id).join(", ")}
          </span>
        ) : (
          <span className="unclaimed">No claim</span>
        )}

        <div className="card-actions">
          {!isOwner ? (
            <button
              className={claimedByMe ? "claim-button active" : "claim-button"}
              type="button"
              onClick={(event) => {
                stopAction(event);
                onToggleClaim(wish.id);
              }}
            >
              {claimedByMe ? "✓ I have it" : "I have it"}
            </button>
          ) : (
            <span className="own-wish">Own wish</span>
          )}
        </div>
      </footer>
    </article>
  );
}
