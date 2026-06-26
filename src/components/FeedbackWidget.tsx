import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../session";
import { getErr } from "../err";

export function FeedbackWidget() {
  const { token } = useSession();
  const genUrl = useMutation(api.files.generateUploadUrl);
  const submit = useMutation(api.feedback.submit);

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setOpen(false);
    setDone(false);
    setError("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!message.trim() && !file) {
      setError("Add a note or a screenshot.");
      return;
    }
    setBusy(true);
    try {
      let screenshotId: string | undefined;
      if (file) {
        const url = await genUrl({ token });
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        screenshotId = (await res.json()).storageId;
      }
      await submit({
        token,
        message,
        screenshotId: screenshotId as any,
        context: window.location.href,
        userAgent: navigator.userAgent,
      });
      setDone(true);
      setMessage("");
      setFile(null);
    } catch (err) {
      setError(getErr(err, "Could not send. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        className="fab"
        onClick={() => setOpen((o) => !o)}
        aria-label="Send feedback or report a bug"
        title="Feedback / report a bug"
      >
        {open ? "×" : "💬 Feedback"}
      </button>

      {open && (
        <div className="fab__panel" role="dialog" aria-label="Feedback">
          {done ? (
            <div className="center" style={{ padding: "10px 4px" }}>
              <p style={{ margin: "0 0 12px" }}>Thank you 💛 Got it.</p>
              <button className="btn btn--ghost btn--sm" onClick={close}>
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="row" style={{ marginBottom: 8 }}>
                <b>Feedback / bug report</b>
                <span className="spacer" />
                <button type="button" className="linklike" onClick={close}>
                  Close
                </button>
              </div>
              <textarea
                className="input"
                style={{ minHeight: 90 }}
                placeholder="What happened, or what would make this better?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <label className="btn btn--ghost btn--sm" style={{ marginTop: 8, display: "inline-block" }}>
                {file ? "📎 " + file.name.slice(0, 22) : "📎 Attach screenshot"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
              <button
                className="btn btn--primary btn--full"
                style={{ marginTop: 10 }}
                disabled={busy}
              >
                {busy ? "Sending…" : "Send"}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
