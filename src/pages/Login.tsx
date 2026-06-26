import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../session";
import { getErr } from "../err";

export function Login() {
  const requestCode = useAction(api.auth.requestCode);
  const verifyCode = useMutation(api.auth.verifyCode);
  const { signIn } = useSession();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("Enter your email.");
    setBusy(true);
    try {
      await requestCode({ email: email.trim() });
      setStep("code");
      setNote(
        "If your email is approved, a 6-digit code is on its way. Check your inbox (and spam).",
      );
    } catch (err) {
      setError(getErr(err));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { token } = await verifyCode({ email: email.trim(), code });
      signIn(token);
    } catch (err) {
      setError(getErr(err, "Invalid code."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="authwrap">
      <h1>
        toward<span className="grad">.love</span>
      </h1>
      <p className="muted">
        A private, invite-only space for our dating events and community.
      </p>

      {step === "email" ? (
        <form className="card authcard" onSubmit={sendCode}>
          <label className="label label--first">Email</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="hint">
            Only preapproved members can sign in. We'll email you a one-time
            code. No passwords, and we never share your email.
          </p>
          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
          <button
            className="btn btn--primary btn--full"
            style={{ marginTop: 16 }}
            disabled={busy}
          >
            {busy ? "Sending…" : "Send me a code"}
          </button>
        </form>
      ) : (
        <form className="card authcard" onSubmit={submitCode}>
          {note && <p className="hint" style={{ marginTop: 0 }}>{note}</p>}
          <label className="label">6-digit code</label>
          <input
            className="input"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ letterSpacing: 6, fontSize: 20, textAlign: "center" }}
          />
          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
          <button
            className="btn btn--primary btn--full"
            style={{ marginTop: 16 }}
            disabled={busy}
          >
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--full"
            style={{ marginTop: 8 }}
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}
