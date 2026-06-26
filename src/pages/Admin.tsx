import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../session";

function parseEntries(text: string): { email: string; name?: string }[] {
  const out: { email: string; name?: string }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/[^\s,<>]+@[^\s,<>]+\.[^\s,<>]+/);
    if (!m) continue;
    const email = m[0];
    const name = line
      .replace(email, "")
      .replace(/[<>,]/g, " ")
      .trim();
    out.push({ email, name: name || undefined });
  }
  return out;
}

export function Admin() {
  const { token } = useSession();
  const rows = useQuery(api.allowlist.list, { token });
  const add = useMutation(api.allowlist.add);
  const remove = useMutation(api.allowlist.remove);

  const seedProfiles = useMutation(api.seed.seedFakeProfiles);
  const deleteSeed = useMutation(api.seed.deleteSeedProfiles);
  const feedback = useQuery(api.feedback.list, { token }) ?? [];

  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoMsg, setDemoMsg] = useState("");

  const submit = async () => {
    const entries = parseEntries(text);
    if (entries.length === 0) {
      setMsg("No valid emails found.");
      return;
    }
    setBusy(true);
    try {
      const r = await add({ token, entries });
      setMsg(`Added ${r.added} new (of ${r.total} parsed).`);
      setText("");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Approve members</h2>
        <p className="hint" style={{ marginTop: 0 }}>
          Only emails on this list can sign in. Paste one per line. Formats like{" "}
          <code>alex@email.com</code>, <code>alex@email.com, Alex</code>, or{" "}
          <code>Alex &lt;alex@email.com&gt;</code> all work.
        </p>
        <textarea
          className="input"
          style={{ minHeight: 120 }}
          placeholder={"alex@email.com, Alex\nsam@email.com, Sam"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {msg && <p className="ok" style={{ marginTop: 10 }}>{msg}</p>}
        <button className="btn btn--primary" style={{ marginTop: 12 }} onClick={submit} disabled={busy}>
          {busy ? "Adding…" : "Add to allowlist"}
        </button>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>Feedback &amp; bug reports {feedback.length ? `(${feedback.length})` : ""}</h3>
        {feedback.length === 0 ? (
          <p className="muted">No feedback yet.</p>
        ) : (
          feedback.map((f) => (
            <div key={f.id} style={{ padding: "10px 0", borderTop: "1px solid var(--card-border)" }}>
              <div className="row" style={{ gap: 8 }}>
                <b>{f.from}</b>
                <span className="small muted">{new Date(f.createdAt).toLocaleString()}</span>
              </div>
              {f.message && <p style={{ margin: "6px 0", whiteSpace: "pre-wrap" }}>{f.message}</p>}
              {f.context && <div className="small muted" style={{ wordBreak: "break-all" }}>{f.context}</div>}
              {f.screenshotUrl && (
                <a href={f.screenshotUrl} target="_blank" rel="noreferrer">
                  <img src={f.screenshotUrl} alt="screenshot" style={{ maxWidth: "100%", borderRadius: 10, marginTop: 8 }} />
                </a>
              )}
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>Demo data</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          Add sample profiles to try out browsing, filtering, and messaging.
          Delete them all in one tap before launch.
        </p>
        {demoMsg && <p className="ok" style={{ marginTop: 10 }}>{demoMsg}</p>}
        <div className="row" style={{ gap: 10, marginTop: 12 }}>
          <button
            className="btn btn--primary btn--sm"
            onClick={async () => {
              setDemoMsg("");
              const r = await seedProfiles({ token });
              setDemoMsg(`Added ${r.created} sample profiles.`);
            }}
          >
            Add sample profiles
          </button>
          <button
            className="btn btn--danger btn--sm"
            onClick={async () => {
              setDemoMsg("");
              const r = await deleteSeed({ token });
              setDemoMsg(`Deleted ${r.deleted} sample profiles.`);
            }}
          >
            Delete sample profiles
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>
          Allowlist {rows ? `(${rows.length})` : ""}
        </h3>
        {rows === undefined ? (
          <div className="empty">Loading…</div>
        ) : rows.length === 0 ? (
          <p className="muted">No one approved yet.</p>
        ) : (
          rows.map((r) => (
            <div className="row" key={r.email} style={{ justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--card-border)" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{r.name || r.email}</div>
                <div className="small muted">{r.email}</div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <span className="tag">
                  {r.onboarded ? "active" : r.hasAccount ? "signed in" : "invited"}
                </span>
                <button className="btn btn--ghost btn--sm" onClick={() => remove({ token, email: r.email })}>
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
