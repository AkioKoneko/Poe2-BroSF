import { useEffect } from "react";
import type { ClaimState, Player, UserId, Wish } from "../types";
import { isClaimedBy } from "../utils/wishlist";
import { ItemTooltip } from "./ItemTooltip";

interface DetailModalProps {
  wish: Wish;
  owner: Player;
  currentUserId: UserId;
  claims: ClaimState;
  playersById: Map<UserId, Player>;
  onClose: () => void;
  onToggleClaim: (wishId: string) => void;
  onEdit: (wishId: string) => void;
  onDelete: (wishId: string) => void;
}

export function DetailModal({
  wish,
  owner,
  currentUserId,
  claims,
  playersById,
  onClose,
  onToggleClaim,
  onEdit,
  onDelete,
}: DetailModalProps) {
  const isOwner = wish.ownerId === currentUserId;
  const claimedByMe = isClaimedBy(claims, wish.id, currentUserId);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${wish.name} details`}
        onClick={(event) => event.stopPropagation()}
      >
        <ItemTooltip
          wish={wish}
          owner={owner}
          claims={claims}
          playersById={playersById}
        />
        <div className={isOwner ? "modal-actions owner-actions" : "modal-actions"}>
          {!isOwner ? (
            <button
              className={claimedByMe ? "claim-button active wide" : "claim-button wide"}
              onClick={() => onToggleClaim(wish.id)}
              type="button"
            >
              {claimedByMe ? "✓ I have it" : "I have it"}
            </button>
          ) : (
            <>
              <button
                className="ghost-button wide"
                onClick={() => onEdit(wish.id)}
                type="button"
              >
                Edit wish
              </button>
              <button
                className="danger-button wide"
                onClick={() => onDelete(wish.id)}
                type="button"
              >
                Delete own wish
              </button>
            </>
          )}
          <button className="ghost-button wide" onClick={onClose} type="button">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
