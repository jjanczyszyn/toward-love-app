import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../session";
import {
  GENDERS,
  ORIENTATIONS,
  RELATIONSHIPS,
  HAVE_KIDS,
  WANT_KIDS,
  labelFor,
} from "../labels";
import { Id } from "../../convex/_generated/dataModel";

export function PublicProfile({
  userId,
  onBack,
  onMessage,
}: {
  userId: Id<"users">;
  onBack: () => void;
  onMessage: (id: Id<"users">) => void;
}) {
  const { token } = useSession();
  const p = useQuery(api.users.getProfile, { token, userId });
  const block = useMutation(api.blocks.block);
  const unblock = useMutation(api.blocks.unblock);

  if (p === undefined) return <div className="empty">Loading…</div>;
  if (p === null) return <div className="empty">This member is no longer here.</div>;

  const tags = [
    labelFor(GENDERS, p.gender),
    labelFor(ORIENTATIONS, p.orientation),
    labelFor(RELATIONSHIPS, p.relationship),
    labelFor(HAVE_KIDS, p.haveKids),
    labelFor(WANT_KIDS, p.wantKids),
  ].filter(Boolean);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <button className="btn btn--ghost btn--sm" onClick={onBack}>
        ← Back
      </button>

      <div className="card" style={{ marginTop: 14 }}>
        {p.photoUrls.length > 0 && (
          <div className="gallery">
            {p.photoUrls.map((u, i) => (
              <img key={i} src={u} alt="" />
            ))}
          </div>
        )}
        <h2 style={{ margin: "16px 0 2px" }}>
          {p.name}
          {p.age ? <span className="muted">, {p.age}</span> : null}
        </h2>
        {p.location && <div className="muted">{p.location}</div>}

        <div className="tags" style={{ marginTop: 12 }}>
          {p.compatible && <span className="tag tag--ok">✓ matches you</span>}
          {tags.map((t) => (
            <span className="tag" key={t}>{t}</span>
          ))}
        </div>

        {p.bio && <p style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{p.bio}</p>}

        <div className="row" style={{ marginTop: 20, gap: 10 }}>
          {p.canMessage ? (
            <button className="btn btn--primary" onClick={() => onMessage(p.id)}>
              Message
            </button>
          ) : (
            <span className="notice" style={{ flex: 1 }}>
              {p.youBlocked
                ? "You've blocked this person."
                : !p.passesMine
                  ? "They don't meet one of your deal-breakers."
                  : !p.passesTheirs
                    ? "You don't meet one of their deal-breakers."
                    : "Messaging isn't available."}
            </span>
          )}
          {p.youBlocked ? (
            <button className="btn btn--ghost" onClick={() => unblock({ token, userId: p.id })}>
              Unblock
            </button>
          ) : (
            <button className="btn btn--danger" onClick={() => block({ token, userId: p.id })}>
              Block
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
