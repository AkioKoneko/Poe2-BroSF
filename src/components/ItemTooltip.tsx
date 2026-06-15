import type { Player, UserId, Wish } from "../types";
import {
  getClaimers,
  getWishBuild,
  kindLabel,
  priorityLabel,
} from "../utils/wishlist";
import type { ClaimState } from "../types";

interface ItemTooltipProps {
  wish: Wish;
  owner: Player;
  claims: ClaimState;
  playersById: Map<UserId, Player>;
}

function Lines({ lines }: { lines?: string[] }) {
  if (!lines?.length) return null;
  return (
    <div className="tip-section">
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}

function AffixList({ title, lines }: { title: string; lines?: string[] }) {
  if (!lines?.length) return null;
  return (
    <div className="tip-section">
      <div className="tip-subtitle">{title}</div>
      {lines.map((line) => (
        <div className="mod-line" key={line}>
          {line}
        </div>
      ))}
    </div>
  );
}

export function ItemTooltip({
  wish,
  owner,
  claims,
  playersById,
}: ItemTooltipProps) {
  const claimers = getClaimers(claims, wish.id);
  const ownerBuild = getWishBuild(wish, owner);
  const claimedBy = claimers
    .map((id) => playersById.get(id)?.accountName)
    .filter(Boolean)
    .join(", ");

  return (
    <article className={`item-tooltip rarity-${wish.kind}`}>
      <div className="tip-art">
        {wish.icon ? (
          <img src={wish.icon} alt="" loading="lazy" />
        ) : (
          <div className="rare-placeholder tip-placeholder" aria-hidden="true">
            <span>Rare</span>
            <small>Template</small>
          </div>
        )}
      </div>
      <header className="tip-header">
        <h2>{wish.name}</h2>
        <p>{wish.baseType}</p>
      </header>

      <div className="tip-body">
        <Lines lines={wish.metaLines} />

        {wish.properties?.length ? (
          <div className="tip-section">
            {wish.properties.map((property) => (
              <div className="property-line" key={property.label}>
                <span>{property.label}: </span>
                <strong>{property.value}</strong>
              </div>
            ))}
          </div>
        ) : null}

        <Lines lines={wish.requirements} />

        {wish.quantity ? (
          <div className="tip-section">
            Stack wanted: <strong>{wish.quantity}</strong>
          </div>
        ) : null}

        <Lines lines={wish.descriptionLines} />

        {wish.explicitMods?.length ? (
          <div className="tip-section">
            {wish.explicitMods.map((line) => (
              <div className="mod-line" key={line}>
                {line}
              </div>
            ))}
          </div>
        ) : null}

        <AffixList title="Desired tablet properties" lines={wish.desiredMods} />
        <AffixList title="Must-have affixes" lines={wish.mustHaveAffixes} />
        <AffixList title="Nice-to-have affixes" lines={wish.niceAffixes} />

        {wish.flavourLines?.length ? (
          <div className="tip-section flavour">
            {wish.flavourLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        ) : null}

        {wish.footerLine ? (
          <div className="tip-section tip-footer">{wish.footerLine}</div>
        ) : null}

        <footer className="wishlist-note">
          <div>
            <span>Owner</span>
            <strong>{owner.accountName}</strong>
          </div>
          <div>
            <span>Build</span>
            <strong>{ownerBuild.buildName}</strong>
          </div>
          <div>
            <span>Type</span>
            <strong>{kindLabel[wish.kind]}</strong>
          </div>
          <div>
            <span>Priority</span>
            <strong>{priorityLabel[wish.priority]}</strong>
          </div>
          <div>
            <span>Claim</span>
            <strong>{claimedBy || "No one yet"}</strong>
          </div>
          {wish.note ? (
            <p className="owner-note">
              <span>Comment</span>
              {wish.note}
            </p>
          ) : null}
          {wish.sourceUrl ? (
            <a href={wish.sourceUrl} target="_blank" rel="noreferrer">
              PoE2DB source
            </a>
          ) : null}
        </footer>
      </div>
    </article>
  );
}
