import { MouseEvent, useEffect, useRef } from "react";
import type { ClaimState, Player, UserId, Wish } from "../types";
import { getClaimers, isClaimedBy } from "../utils/wishlist";
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
  onFulfill: (wishId: string, donorId: UserId) => void;
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
  onFulfill,
}: DetailModalProps) {
  const isOwner = wish.ownerId === currentUserId;
  const claimedByMe = isClaimedBy(claims, wish.id, currentUserId);
  const claimers = getClaimers(claims, wish.id);
  const fulfilledBy = wish.fulfilledBy
    ? playersById.get(wish.fulfilledBy)?.accountName ?? wish.fulfilledBy
    : "";
  const backdropPointerStarted = useRef(false);

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
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        backdropPointerStarted.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (backdropPointerStarted.current && event.target === event.currentTarget) {
          onClose();
        }
        backdropPointerStarted.current = false;
      }}
    >
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
          {wish.fulfilledAt ? (
            <span className="fulfilled-detail">ЗАБРАНО: {fulfilledBy}</span>
          ) : !isOwner ? (
            <button
              className={claimedByMe ? "claim-button active wide" : "claim-button wide"}
              onClick={() => onToggleClaim(wish.id)}
              type="button"
            >
              {claimedByMe ? "✓ I have it" : "I have it"}
            </button>
          ) : (
            <>
              {claimers.length ? (
                <div className="take-actions">
                  {claimers.map((claimerId) => (
                    <button
                      className="take-button wide"
                      key={claimerId}
                      onClick={() => onFulfill(wish.id, claimerId)}
                      type="button"
                    >
                      ЗАБРАЛ у {playersById.get(claimerId)?.accountName ?? claimerId}
                    </button>
                  ))}
                </div>
              ) : null}
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
