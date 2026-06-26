import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useSession } from "./session";
import { Login } from "./pages/Login";
import { Onboarding } from "./pages/Onboarding";
import { Browse } from "./pages/Browse";
import { PublicProfile } from "./pages/PublicProfile";
import { Messages } from "./pages/Messages";
import { EditProfile } from "./pages/EditProfile";
import { Admin } from "./pages/Admin";
import { Id } from "../convex/_generated/dataModel";

type Tab = "browse" | "messages" | "profile" | "admin";

export default function App() {
  const { token, signOut } = useSession();
  const me = useQuery(api.auth.me, { token });

  if (me === undefined && token) {
    return <div className="empty">Loading…</div>;
  }
  if (!token || me === null) {
    return <Login />;
  }
  if (me && !me.onboarded) {
    return <Onboarding />;
  }
  if (!me) return <Login />;

  return <Shell isAdmin={me.isAdmin} onSignOut={signOut} />;
}

function Shell({
  isAdmin,
  onSignOut,
}: {
  isAdmin: boolean;
  onSignOut: () => void;
}) {
  const { token } = useSession();
  const [tab, setTab] = useState<Tab>("browse");
  const [viewUser, setViewUser] = useState<Id<"users"> | null>(null);
  const [openThread, setOpenThread] = useState<Id<"users"> | null>(null);
  const unread = useQuery(api.messages.unreadCount, { token }) ?? 0;

  const goMessage = (userId: Id<"users">) => {
    setViewUser(null);
    setOpenThread(userId);
    setTab("messages");
  };

  return (
    <div className="shell">
      <div className="topbar">
        <span className="brand">
          toward<span className="grad">.love</span>
        </span>
        <nav className="nav">
          <button
            className={"tab" + (tab === "browse" ? " tab--on" : "")}
            onClick={() => {
              setTab("browse");
              setViewUser(null);
            }}
          >
            Browse
          </button>
          <button
            className={"tab" + (tab === "messages" ? " tab--on" : "")}
            onClick={() => {
              setTab("messages");
              setViewUser(null);
            }}
          >
            Messages
            {unread > 0 && <span className="badge">{unread}</span>}
          </button>
          <button
            className={"tab" + (tab === "profile" ? " tab--on" : "")}
            onClick={() => {
              setTab("profile");
              setViewUser(null);
            }}
          >
            Profile
          </button>
          {isAdmin && (
            <button
              className={"tab" + (tab === "admin" ? " tab--on" : "")}
              onClick={() => {
                setTab("admin");
                setViewUser(null);
              }}
            >
              Admin
            </button>
          )}
        </nav>
        <span className="spacer" />
        <button className="btn btn--ghost btn--sm" onClick={onSignOut}>
          Sign out
        </button>
      </div>

      {viewUser ? (
        <PublicProfile
          userId={viewUser}
          onBack={() => setViewUser(null)}
          onMessage={goMessage}
        />
      ) : tab === "browse" ? (
        <Browse onOpen={setViewUser} />
      ) : tab === "messages" ? (
        <Messages
          openThread={openThread}
          clearOpen={() => setOpenThread(null)}
          onViewProfile={setViewUser}
        />
      ) : tab === "profile" ? (
        <EditProfile />
      ) : (
        <Admin />
      )}
    </div>
  );
}
