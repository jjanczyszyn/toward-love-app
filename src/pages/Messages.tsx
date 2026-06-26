import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../session";
import { Avatar } from "../components/Chips";
import { getErr } from "../err";
import { Id } from "../../convex/_generated/dataModel";

export function Messages({
  openThread,
  clearOpen,
  onViewProfile,
}: {
  openThread: Id<"users"> | null;
  clearOpen: () => void;
  onViewProfile: (id: Id<"users">) => void;
}) {
  const { token } = useSession();
  const convos = useQuery(api.messages.listConversations, { token });
  const [selected, setSelected] = useState<Id<"users"> | null>(openThread);

  useEffect(() => {
    if (openThread) {
      setSelected(openThread);
      clearOpen();
    }
  }, [openThread, clearOpen]);

  return (
    <div className="msglayout">
      <div className="card" style={{ padding: 10 }}>
        {convos === undefined ? (
          <div className="empty">Loading…</div>
        ) : convos.length === 0 && !selected ? (
          <div className="empty">No conversations yet. Find someone in Browse.</div>
        ) : (
          convos.map((c) => (
            <div
              key={c.otherId}
              className={"convo" + (selected === c.otherId ? " convo--on" : "")}
              onClick={() => setSelected(c.otherId)}
            >
              <Avatar url={c.photoUrl} name={c.name} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row" style={{ gap: 6 }}>
                  <b style={{ whiteSpace: "nowrap" }}>{c.name}</b>
                  {c.unread > 0 && <span className="badge" style={{ position: "static" }}>{c.unread}</span>}
                </div>
                <div className="small muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.lastFromMe ? "You: " : ""}{c.lastBody}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selected ? (
        <Thread otherUserId={selected} onViewProfile={onViewProfile} />
      ) : (
        <div className="card empty">Select a conversation.</div>
      )}
    </div>
  );
}

function Thread({
  otherUserId,
  onViewProfile,
}: {
  otherUserId: Id<"users">;
  onViewProfile: (id: Id<"users">) => void;
}) {
  const { token } = useSession();
  const data = useQuery(api.messages.thread, { token, otherUserId });
  const send = useMutation(api.messages.send);
  const markRead = useMutation(api.messages.markRead);
  const block = useMutation(api.blocks.block);
  const hide = useMutation(api.hides.hide);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const count = data?.messages.length ?? 0;
  useEffect(() => {
    if (count > 0) markRead({ token, otherUserId });
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [count, otherUserId, token, markRead]);

  if (data === undefined) return <div className="card empty">Loading…</div>;
  if (data === null) return <div className="card empty">Conversation unavailable.</div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const text = body.trim();
    if (!text) return;
    setBody("");
    try {
      await send({ token, toUserId: otherUserId, body: text });
    } catch (err) {
      setBody(text);
      setError(getErr(err, "Could not send."));
    }
  };

  return (
    <div className="chat">
      <div className="chat__head">
        <Avatar url={data.other.photoUrl} name={data.other.name} />
        <b>{data.other.name}</b>
        <span className="spacer" />
        <button className="btn btn--ghost btn--sm" onClick={() => onViewProfile(otherUserId)}>
          Profile
        </button>
        <button className="btn btn--ghost btn--sm" onClick={() => hide({ token, userId: otherUserId })}>
          Hide
        </button>
        <button className="btn btn--danger btn--sm" onClick={() => block({ token, userId: otherUserId })}>
          Block
        </button>
      </div>
      <div className="chat__body">
        {data.messages.length === 0 && (
          <div className="empty">Say hello 👋</div>
        )}
        {data.messages.map((m) => (
          <div key={m.id} className={"bubble " + (m.fromMe ? "bubble--me" : "bubble--them")}>
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {data.canMessage ? (
        <form className="composer" onSubmit={submit}>
          <input
            className="input"
            placeholder="Write a message…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button className="btn btn--primary" disabled={!body.trim()}>
            Send
          </button>
        </form>
      ) : (
        <div className="composer">
          <span className="notice" style={{ flex: 1 }}>
            {data.blocked
              ? "Messaging is blocked."
              : "You no longer meet each other's deal-breakers."}
          </span>
        </div>
      )}
      {error && <p className="error" style={{ padding: "0 12px 10px" }}>{error}</p>}
    </div>
  );
}
