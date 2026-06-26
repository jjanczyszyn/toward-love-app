import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../session";
import { ProfileEditor } from "../components/ProfileEditor";

export function EditProfile() {
  const { token } = useSession();
  const blocked = useQuery(api.blocks.listBlocked, { token }) ?? [];
  const unblock = useMutation(api.blocks.unblock);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <ProfileEditor onboarding={false} />

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
