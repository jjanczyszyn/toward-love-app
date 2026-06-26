import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../session";
import { ChipSelect, ChipMulti } from "../components/Chips";
import {
  GENDERS,
  RELATIONSHIPS,
  WANT_KIDS,
  HAVE_KIDS,
  labelFor,
} from "../labels";
import { Id } from "../../convex/_generated/dataModel";

export function Browse({ onOpen }: { onOpen: (id: Id<"users">) => void }) {
  const { token } = useSession();
  const [view, setView] = useState<"romantic" | "friend">("romantic");
  const [showFilters, setShowFilters] = useState(false);
  const [genders, setGenders] = useState<string[]>([]);
  const [relationships, setRelationships] = useState<string[]>([]);
  const [wantKids, setWantKids] = useState<string[]>([]);
  const [haveKids, setHaveKids] = useState<string>("");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [hasPhoto, setHasPhoto] = useState(false);
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const [search, setSearch] = useState("");

  const filters = {
    genders: genders.length ? (genders as any) : undefined,
    relationships: relationships.length ? (relationships as any) : undefined,
    wantKids: wantKids.length ? (wantKids as any) : undefined,
    haveKids: (haveKids || undefined) as any,
    ageMin: ageMin ? Number(ageMin) : undefined,
    ageMax: ageMax ? Number(ageMax) : undefined,
    hasPhoto: hasPhoto || undefined,
    onlyCompatible: onlyCompatible || undefined,
    search: search.trim() || undefined,
  };

  const people = useQuery(api.users.browse, { token, filters, intent: view });
  const hide = useMutation(api.hides.hide);
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const reset = () => {
    setGenders([]);
    setRelationships([]);
    setWantKids([]);
    setHaveKids("");
    setAgeMin("");
    setAgeMax("");
    setHasPhoto(false);
    setOnlyCompatible(false);
    setSearch("");
  };

  return (
    <div>
      {toast && <div className="toast">{toast}</div>}
      <div className="seg" style={{ marginBottom: 14 }}>
        <button
          className={"seg__btn" + (view === "romantic" ? " seg__btn--on" : "")}
          onClick={() => setView("romantic")}
        >
          Romantic
        </button>
        <button
          className={"seg__btn" + (view === "friend" ? " seg__btn--on" : "")}
          onClick={() => setView("friend")}
        >
          Friends
        </button>
      </div>
      <div className="row" style={{ marginBottom: 14 }}>
        <input
          className="input"
          placeholder="Search name, bio, location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="btn btn--ghost"
          onClick={() => setShowFilters((s) => !s)}
        >
          Filters
        </button>
      </div>

      {showFilters && (
        <div className="filters">
          <span className="label label--first">Gender</span>
          <ChipMulti options={GENDERS} values={genders} onChange={setGenders} />
          <span className="label">Relationship style</span>
          <ChipMulti options={RELATIONSHIPS} values={relationships} onChange={setRelationships} />
          <span className="label">Wants kids</span>
          <ChipMulti options={WANT_KIDS} values={wantKids} onChange={setWantKids} />
          <span className="label">Has kids</span>
          <ChipSelect options={HAVE_KIDS} value={haveKids} onChange={setHaveKids} allowDeselect />
          <span className="label">Age range</span>
          <div className="row" style={{ gap: 10 }}>
            <input className="input" inputMode="numeric" placeholder="Min" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
            <span className="muted">to</span>
            <input className="input" inputMode="numeric" placeholder="Max" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
          </div>
          <div className="chips" style={{ marginTop: 16 }}>
            <button className={"chip" + (hasPhoto ? " chip--on" : "")} onClick={() => setHasPhoto((v) => !v)}>
              Has photo
            </button>
            {view === "romantic" && (
              <button className={"chip" + (onlyCompatible ? " chip--on" : "")} onClick={() => setOnlyCompatible((v) => !v)}>
                Matches my deal-breakers
              </button>
            )}
            <button className="chip" onClick={reset}>Reset</button>
          </div>
        </div>
      )}

      {people === undefined ? (
        <div className="empty">Loading…</div>
      ) : people.length === 0 ? (
        <div className="empty">No members match these filters yet.</div>
      ) : (
        <div className="grid">
          {people.map((p) => (
            <div className="pcard" key={p.id} onClick={() => onOpen(p.id)}>
              {p.photoUrls[0] ? (
                <img className="pcard__photo" src={p.photoUrls[0]} alt={p.name} />
              ) : (
                <div className="pcard__noimg">♥</div>
              )}
              <div className="pcard__body">
                <div className="pcard__name">
                  {p.name}
                  {p.age ? <span className="muted">, {p.age}</span> : null}
                </div>
                {p.locations && p.locations.length > 0 && (
                  <div className="small muted">{p.locations.join(" · ")}</div>
                )}
                <div className="tags">
                  {view === "romantic" && p.compatible && <span className="tag tag--ok">✓ matches you</span>}
                  {p.relationship && <span className="tag">{labelFor(RELATIONSHIPS, p.relationship)}</span>}
                  {p.wantKids && <span className="tag">{labelFor(WANT_KIDS, p.wantKids)}</span>}
                </div>
                <button
                  type="button"
                  className="linklike small"
                  style={{ marginTop: 10 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    hide({ token, userId: p.id });
                    setToast(`Hid ${p.name} from matches. Undo in your profile.`);
                  }}
                >
                  Hide from matches
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
