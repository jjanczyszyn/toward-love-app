import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../session";
import { ChipSelect, ChipMulti } from "./Chips";
import {
  GENDERS,
  ORIENTATIONS,
  RELATIONSHIPS,
  HAVE_KIDS,
  WANT_KIDS,
} from "../labels";
import { Id } from "../../convex/_generated/dataModel";

const MAX_YEAR = new Date().getFullYear() - 18;

export function ProfileEditor({
  onboarding,
  onDone,
}: {
  onboarding: boolean;
  onDone?: () => void;
}) {
  const { token } = useSession();
  const me = useQuery(api.users.myProfile, { token });
  const update = useMutation(api.users.updateProfile);
  const genUrl = useMutation(api.files.generateUploadUrl);
  const addPhoto = useMutation(api.files.addPhoto);
  const removePhoto = useMutation(api.files.removePhoto);

  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState<string>("");
  const [orientation, setOrientation] = useState<string>("");
  const [relationship, setRelationship] = useState<string>("");
  const [haveKids, setHaveKids] = useState<string>("");
  const [wantKids, setWantKids] = useState<string>("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");

  const [interestedInGenders, setIIG] = useState<string[]>([]);
  const [relationshipTypes, setRT] = useState<string[]>([]);
  const [wantKidsPref, setWKP] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [db, setDb] = useState({
    gender: false,
    relationship: false,
    wantKids: false,
    age: false,
  });

  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (me && !loaded) {
      setName(me.name ?? "");
      setBirthYear(me.birthYear ? String(me.birthYear) : "");
      setGender(me.gender ?? "");
      setOrientation(me.orientation ?? "");
      setRelationship(me.relationship ?? "");
      setHaveKids(me.haveKids ?? "");
      setWantKids(me.wantKids ?? "");
      setLocation(me.location ?? "");
      setBio(me.bio ?? "");
      setIIG(me.prefs.interestedInGenders);
      setRT(me.prefs.relationshipTypes);
      setWKP(me.prefs.wantKids);
      setAgeMin(me.prefs.ageMin ? String(me.prefs.ageMin) : "");
      setAgeMax(me.prefs.ageMax ? String(me.prefs.ageMax) : "");
      setDb(me.dealBreakers);
      setLoaded(true);
    }
  }, [me, loaded]);

  if (!me) return <div className="empty">Loading…</div>;

  const photos: { id: Id<"_storage">; url: string }[] = me.photos
    .map((id, i) => ({ id, url: me.photoUrls[i] }))
    .filter((p) => !!p.url) as any;

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    setError("");
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await genUrl({ token });
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const json = await res.json();
        await addPhoto({ token, storageId: json.storageId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setError("");
    setSaved(false);
    if (!name.trim()) return setError("Please add your name.");
    const yr = Number(birthYear);
    if (!birthYear || !Number.isInteger(yr) || yr < 1900 || yr > MAX_YEAR)
      return setError("Enter a valid birth year (you must be 18+).");
    if (onboarding && !gender) return setError("Please choose your gender.");

    setBusy(true);
    try {
      await update({
        token,
        name: name.trim(),
        birthYear: yr,
        gender: (gender || undefined) as any,
        orientation: (orientation || undefined) as any,
        relationship: (relationship || undefined) as any,
        haveKids: (haveKids || undefined) as any,
        wantKids: (wantKids || undefined) as any,
        location: location.trim(),
        bio: bio.trim(),
        prefs: {
          interestedInGenders: interestedInGenders as any,
          relationshipTypes: relationshipTypes as any,
          wantKids: wantKidsPref as any,
          ageMin: ageMin ? Number(ageMin) : undefined,
          ageMax: ageMax ? Number(ageMax) : undefined,
        },
        dealBreakers: db,
        markOnboarded: onboarding ? true : undefined,
      });
      setSaved(true);
      onDone?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const DbToggle = ({ k }: { k: keyof typeof db }) => (
    <button
      type="button"
      className={"chip" + (db[k] ? " chip--on" : "")}
      onClick={() => setDb({ ...db, [k]: !db[k] })}
      title="If on, only people matching this can message you"
    >
      {db[k] ? "★ Deal-breaker" : "☆ Deal-breaker"}
    </button>
  );

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>
        {onboarding ? "Welcome. Set up your profile" : "Your profile"}
      </h2>

      <label className="label label--first">Name</label>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="row" style={{ gap: 16, marginTop: 4 }}>
        <div style={{ flex: 1 }}>
          <label className="label">Birth year</label>
          <input
            className="input"
            inputMode="numeric"
            placeholder="1990"
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label">Location</label>
          <input
            className="input"
            placeholder="San Francisco"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
      </div>

      <label className="label">Photos</label>
      <div className="photoedit">
        {photos.map((p) => (
          <div className="ph" key={p.id}>
            <img src={p.url} alt="" />
            <button
              type="button"
              className="x"
              onClick={() => removePhoto({ token, storageId: p.id })}
            >
              ×
            </button>
          </div>
        ))}
        <label className="btn btn--ghost btn--sm" style={{ alignSelf: "center" }}>
          {uploading ? "Uploading…" : "+ Add"}
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
      </div>

      <label className="label">About you</label>
      <textarea
        className="input"
        placeholder="A few words about who you are and what you're looking for…"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
      />

      <label className="label">Gender</label>
      <ChipSelect options={GENDERS} value={gender} onChange={setGender} allowDeselect />
      <label className="label">Sexual orientation</label>
      <ChipSelect options={ORIENTATIONS} value={orientation} onChange={setOrientation} allowDeselect />
      <label className="label">Relationship style</label>
      <ChipSelect options={RELATIONSHIPS} value={relationship} onChange={setRelationship} allowDeselect />
      <label className="label">Kids</label>
      <ChipSelect options={HAVE_KIDS} value={haveKids} onChange={setHaveKids} allowDeselect />
      <label className="label">Do you want (more) kids?</label>
      <ChipSelect options={WANT_KIDS} value={wantKids} onChange={setWantKids} allowDeselect />

      <hr style={{ border: "none", borderTop: "1px solid var(--card-border)", margin: "26px 0" }} />
      <h3 style={{ margin: "0 0 4px" }}>Who you're looking for</h3>
      <p className="hint" style={{ marginTop: 0 }}>
        Mark anything as a <b>deal-breaker</b> to only allow messages from people
        who match it. Everything else is just used to filter and sort.
      </p>

      <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
        <span className="label" style={{ margin: 0 }}>Interested in</span>
        <DbToggle k="gender" />
      </div>
      <ChipMulti options={GENDERS} values={interestedInGenders} onChange={setIIG} />

      <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
        <span className="label" style={{ margin: 0 }}>Relationship style</span>
        <DbToggle k="relationship" />
      </div>
      <ChipMulti options={RELATIONSHIPS} values={relationshipTypes} onChange={setRT} />

      <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
        <span className="label" style={{ margin: 0 }}>Their stance on kids</span>
        <DbToggle k="wantKids" />
      </div>
      <ChipMulti options={WANT_KIDS} values={wantKidsPref} onChange={setWKP} />

      <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
        <span className="label" style={{ margin: 0 }}>Age range</span>
        <DbToggle k="age" />
      </div>
      <div className="row" style={{ gap: 10 }}>
        <input className="input" inputMode="numeric" placeholder="Min" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} />
        <span className="muted">to</span>
        <input className="input" inputMode="numeric" placeholder="Max" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} />
      </div>

      {error && <p className="error" style={{ marginTop: 16 }}>{error}</p>}
      {saved && !onboarding && <p className="ok" style={{ marginTop: 16 }}>Saved.</p>}
      <button className="btn btn--primary btn--full" style={{ marginTop: 18 }} onClick={save} disabled={busy}>
        {busy ? "Saving…" : onboarding ? "Enter toward.love" : "Save changes"}
      </button>
    </div>
  );
}
