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
  onMessage: (id: Id<"users">, intent: "romantic" | "friend") => void;
}) {
  const { token } = useSession();
  const p = useQuery(api.users.getProfile, { token, userId });
  const block = useMutation(api.blocks.block);
  const unblock = useMutation(api.blocks.unblock);
  const hide = useMutation(api.hides.hide);
  const unhide = useMutation(api.hides.unhide);

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
        {p.locations && p.locations.length > 0 && (
          <div className="muted">{p.locations.join(" · ")}</div>
        )}

        <div className="tags" style={{ marginTop: 12 }}>
          {p.compatible && <span className="tag tag--ok">✓ matches you</span>}
          {tags.map((t) => (
            <span className="tag" key={t}>{t}</span>
          ))}
        </div>

        {p.seeking && p.seeking.length > 0 && (
          <p className="small muted" style={{ marginTop: 10 }}>
            Open to {p.seeking.map((s) => (s === "friend" ? "friendship" : "romantic")).join(" & ")}
          </p>
        )}

        {p.bio && <p style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{p.bio}</p>}

        <div className="row row--wrap" style={{ marginTop: 20, gap: 10 }}>
          {p.romanticOk && (
            <button className="btn btn--primary" onClick={() => onMessage(p.id, "romantic")}>
              Message
            </button>
          )}
          {p.friendOk && (
            <button
              className={"btn " + (p.romanticOk ? "btn--ghost" : "btn--primary")}
              onClick={() => onMessage(p.id, "friend")}
            >
              Message as friend
            </button>
          )}
          {!p.romanticOk && !p.friendOk && (
            <span className="notice" style={{ flex: 1 }}>
              {p.youBlocked
                ? "You've blocked this person."
                : !p.passesMine
                  ? "They don't meet one of your deal-breakers (for romantic)."
                  : !p.passesTheirs
                    ? "You don't meet one of their deal-breakers (for romantic)."
                    : "Messaging isn't available for the connection types you both chose."}
            </span>
          )}
          {p.youHid ? (
            <button className="btn btn--ghost" onClick={() => unhide({ token, userId: p.id })}>
              Unhide
            </button>
          ) : (
            <button className="btn btn--ghost" onClick={() => hide({ token, userId: p.id })}>
              Hide from matches
            </button>
          )}
          {p.youBlocked ? (
            <button className="btn btn--ghost" onClick={() => unblock({ token, userId: p.id })}>
              Unblock
            </button>
          ) : (
            <button
              className="btn btn--danger"
              onClick={() => {
                if (
                  window.confirm(
                    `Block ${p.name}? They won't be able to message you, you'll disappear from each other's matches, and their messages will be hidden. You can unblock later from your profile.`,
                  )
                )
                  block({ token, userId: p.id });
              }}
            >
              Block
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
