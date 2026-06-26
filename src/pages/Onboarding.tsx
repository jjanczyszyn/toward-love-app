import { ProfileEditor } from "../components/ProfileEditor";
import { useSession } from "../session";

export function Onboarding() {
  const { signOut } = useSession();
  return (
    <div className="shell">
      <div className="topbar">
        <span className="brand">
          toward<span className="grad">.love</span>
        </span>
        <span className="spacer" />
        <button className="btn btn--ghost btn--sm" onClick={signOut}>
          Sign out
        </button>
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <ProfileEditor onboarding />
      </div>
    </div>
  );
}
