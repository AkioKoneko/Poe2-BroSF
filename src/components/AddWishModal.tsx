import { FormEvent, useState } from "react";
import type { DraftWish, Wish, WishPriority } from "../types";
import { syncPoe2dbItem } from "../lib/brossfRepository";
import { draftFromWish } from "../utils/wishlist";

interface AddWishModalProps {
  onClose: () => void;
  onSave: (draft: DraftWish) => void | Promise<void>;
  initialWish?: Wish;
}

const draftDefaults: DraftWish = {
  kind: "unique",
  gemFlavor: "skill",
  name: "",
  baseType: "",
  sourceUrl: "",
  dropSource: "",
  icon: "",
  quantity: "1",
  priority: "normal",
  note: "",
  metaLines: "",
  requirements: "",
  properties: "",
  descriptionLines: "",
  explicitMods: "",
  desiredMods: "",
  mustHaveAffixes: "",
  niceAffixes: "",
  flavourLines: "",
  footerLine: "",
};

const kindTabs: { value: DraftWish["kind"]; label: string }[] = [
  { value: "unique", label: "Unique / item" },
  { value: "currency", label: "Currency / rune" },
  { value: "tablet", label: "Tablet" },
  { value: "gem", label: "Gem" },
  { value: "rare", label: "Rare template" },
];

const priorityOptions: WishPriority[] = ["low", "normal", "high", "urgent"];

export function AddWishModal({
  onClose,
  onSave,
  initialWish,
}: AddWishModalProps) {
  const [draft, setDraft] = useState<DraftWish>(() =>
    initialWish ? draftFromWish(initialWish) : draftDefaults,
  );
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const isEditing = Boolean(initialWish);

  function update<Key extends keyof DraftWish>(key: Key, value: DraftWish[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(draft);
  }

  async function syncFromPoe2db() {
    const sourceUrl = draft.sourceUrl.trim();
    if (!sourceUrl) {
      setSyncError("Paste a PoE2DB URL first.");
      return;
    }

    try {
      setSyncing(true);
      setSyncError("");
      const synced = await syncPoe2dbItem(sourceUrl);
      setDraft((current) => ({
        ...current,
        ...synced,
        sourceUrl: synced.sourceUrl ?? current.sourceUrl,
        quantity: current.quantity || "1",
        priority: current.priority,
        note: current.note,
      }));
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "PoE2DB sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  const showQuantity = draft.kind === "currency" || draft.kind === "tablet";
  const showRare = draft.kind === "rare";
  const showTablet = draft.kind === "tablet";

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <form
        className="add-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-title"
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <p className="eyebrow">
              {isEditing ? "Edit pact request" : "New pact request"}
            </p>
            <h2 id="add-title">{isEditing ? "Edit wish" : "Add wish"}</h2>
          </div>
          <button
            aria-label={isEditing ? "Close edit wish" : "Close add wish"}
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="type-tabs" role="tablist" aria-label="Wish type">
          {kindTabs.map((tab) => (
            <button
              aria-selected={draft.kind === tab.value}
              className={draft.kind === tab.value ? "type-tab active" : "type-tab"}
              key={tab.value}
              onClick={() => update("kind", tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="form-grid">
          <label>
            {showRare ? "Template name or base" : "Item name"}
            <input
              value={draft.name}
              onChange={(event) => update("name", event.target.value)}
              placeholder={showRare ? "Generic minion amulet" : "Forgotten Warden"}
            />
          </label>
          <label>
            Priority
            <select
              value={draft.priority}
              onChange={(event) =>
                update("priority", event.target.value as WishPriority)
              }
            >
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          {draft.kind === "gem" ? (
            <label>
              Gem type
              <select
                value={draft.gemFlavor}
                onChange={(event) =>
                  update("gemFlavor", event.target.value as DraftWish["gemFlavor"])
                }
              >
                <option value="skill">Skill gem</option>
                <option value="support">Support gem</option>
              </select>
            </label>
          ) : null}
          {showQuantity ? (
            <label>
              Quantity
              <input
                min="1"
                type="number"
                value={draft.quantity}
                onChange={(event) => update("quantity", event.target.value)}
              />
            </label>
          ) : null}
          <label className="wide-field sync-field">
            <span>PoE2DB URL</span>
            <div className="sync-row">
              <input
                value={draft.sourceUrl}
                onChange={(event) => update("sourceUrl", event.target.value)}
                placeholder="https://poe2db.tw/us/..."
              />
              <button
                className="ghost-button"
                disabled={syncing}
                onClick={syncFromPoe2db}
                type="button"
              >
                {syncing ? "Syncing" : "Sync"}
              </button>
            </div>
          </label>
          {syncError ? <p className="form-error wide-field">{syncError}</p> : null}
          <label>
            Base type
            <input
              value={draft.baseType}
              onChange={(event) => update("baseType", event.target.value)}
              placeholder="Stoic Sceptre"
            />
          </label>
          <label className="wide-field">
            Drop source
            <input
              value={draft.dropSource}
              onChange={(event) => update("dropSource", event.target.value)}
              placeholder="Drops from The Bodach, Ritual pinnacle boss"
            />
          </label>
          {showTablet ? (
            <label className="wide-field">
              Desired tablet properties
              <textarea
                value={draft.desiredMods}
                onChange={(event) => update("desiredMods", event.target.value)}
                placeholder="Unique Monsters have one additional Rare Modifier"
              />
            </label>
          ) : null}
          {showRare ? (
            <>
              <label className="wide-field">
                Must-have affixes
                <textarea
                  value={draft.mustHaveAffixes}
                  onChange={(event) =>
                    update("mustHaveAffixes", event.target.value)
                  }
                  placeholder="+1 to Level of all Minion Skills"
                />
              </label>
              <label className="wide-field">
                Nice-to-have affixes
                <textarea
                  value={draft.niceAffixes}
                  onChange={(event) => update("niceAffixes", event.target.value)}
                  placeholder="life, mana, resists"
                />
              </label>
            </>
          ) : null}
          <label className="wide-field">
            Note
            <textarea
              value={draft.note}
              onChange={(event) => update("note", event.target.value)}
              placeholder="Why this matters for the build"
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="ghost-button wide" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-action wide" type="submit">
            {isEditing ? "Save changes" : "Save wish"}
          </button>
        </div>
      </form>
    </div>
  );
}
