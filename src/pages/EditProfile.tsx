import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../session";
import { ProfileEditor } from "../components/ProfileEditor";

export function EditProfile() {
  const { token } = useSession();
  const blocked = useQuery(api.blocks.listBlocked, { token }) ?? [];
  const unblock = useMutation(api.blocks.unblock);
  const hidden = useQuery(api.hides.listHidden, { token }) ?? [];
  const unhide = useMutation(api.hides.unhide);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <ProfileEditor onboarding={false} />

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>Hidden from matches</h3>
        {hidden.length === 0 ? (
          <p className="muted">No one hidden.</p>
        ) : (
          hidden.map((h) => (
            <div className="row" key={h.id} style={{ justifyContent: "space-between", padding: "6px 0" }}>
              <span>{h.name}</span>
              <button className="btn btn--ghost btn--sm" onClick={() => unhide({ token, userId: h.id })}>
                Unhide
              </button>
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>Blocked people</h3>
        {blocked.length === 0 ? (
          <p className="muted">You haven't blocked anyone.</p>
        ) : (
          blocked.map((b) => (
            <div className="row" key={b.id} style={{ justifyContent: "space-between", padding: "6px 0" }}>
              <span>{b.name}</span>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => unblock({ token, userId: b.id })}
              >
                Unblock
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
