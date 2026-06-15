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

const richTermPattern =
  /\b(Allies|Attributes|Companions|Discipline|Life|Marked|Presence|Spirit)\b/g;
const rollPattern = /(\+?\(\d+[-–—]\d+\)%?|\+\d+|\b\d+%?\b)/g;

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\+?\(\d+[-–—]\d+\)%?|\+\d+|\b\d+%?\b|\bAllies\b|\bAttributes\b|\bCompanions\b|\bDiscipline\b|\bLife\b|\bMarked\b|\bPresence\b|\bSpirit\b)/g);
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        if (rollPattern.test(part)) {
          rollPattern.lastIndex = 0;
          return (
            <span className="roll-value" key={`${part}-${index}`}>
              {part}
            </span>
          );
        }
        rollPattern.lastIndex = 0;
        if (richTermPattern.test(part)) {
          richTermPattern.lastIndex = 0;
          return (
            <span className="poe-term" key={`${part}-${index}`}>
              {part}
            </span>
          );
        }
        richTermPattern.lastIndex = 0;
        return part;
      })}
    </>
  );
}

function Lines({ lines }: { lines?: string[] }) {
  if (!lines?.length) return null;
  return (
    <div className="tip-section">
      {lines.map((line) => (
        <div key={line}>
          <RichText text={line} />
        </div>
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
          <RichText text={line} />
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
  const placeholder =
    wish.kind === "pack"
      ? { title: "Pack", subtitle: "Craft" }
      : wish.kind === "rare"
        ? { title: "Rare", subtitle: "Template" }
        : { title: kindLabel[wish.kind], subtitle: "Wish" };
  const claimedBy = claimers
    .map((id) => playersById.get(id)?.accountName)
    .filter(Boolean)
    .join(", ");
  const fulfilledBy = wish.fulfilledBy
    ? playersById.get(wish.fulfilledBy)?.accountName ?? wish.fulfilledBy
    : "";

  return (
    <article className={`item-tooltip rarity-${wish.kind}`}>
      <div className="tip-art">
        {wish.icon ? (
          <img src={wish.icon} alt="" loading="lazy" />
        ) : (
          <div className="rare-placeholder tip-placeholder" aria-hidden="true">
            <span>{placeholder.title}</span>
            <small>{placeholder.subtitle}</small>
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
                <strong>
                  <RichText text={property.value} />
                </strong>
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
                <RichText text={line} />
              </div>
            ))}
          </div>
        ) : null}

        <AffixList
          title={wish.kind === "pack" ? "Pack contents" : "Desired tablet properties"}
          lines={wish.desiredMods}
        />
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
            <span>{wish.fulfilledAt ? "Taken" : "Claim"}</span>
            <strong>{wish.fulfilledAt ? fulfilledBy : claimedBy || "No one yet"}</strong>
          </div>
          {wish.note ? (
            <p className="owner-note">
              <span>Comment</span>
              {wish.note}
            </p>
          ) : null}
          {wish.dropSource ? (
            <p className="owner-note drop-source-note">
              <span>Drops from</span>
              {wish.dropSource}
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
