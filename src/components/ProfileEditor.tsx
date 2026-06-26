import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSession } from "../session";
import { ChipSelect, ChipMulti } from "./Chips";
import { CropModal } from "./CropModal";
import { getErr } from "../err";
import {
  GENDERS,
  ORIENTATIONS,
  RELATIONSHIPS,
  HAVE_KIDS,
  WANT_KIDS,
  SEEKING,
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
  const [locations, setLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  const [bio, setBio] = useState("");
  const [seeking, setSeeking] = useState<string[]>(["romantic"]);
  const [hiddenCanMessage, setHiddenCanMessage] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropQueue, setCropQueue] = useState<File[]>([]);

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
      setLocations(me.locations ?? (me.location ? [me.location] : []));
      setBio(me.bio ?? "");
      setSeeking(me.seeking ?? ["romantic"]);
      setHiddenCanMessage(me.hiddenCanMessage ?? false);
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

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  // Selecting files opens the cropper for each, one at a time.
  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError("");
    const arr = Array.from(files);
    setCropSrc(await readAsDataUrl(arr[0]));
    setCropQueue(arr.slice(1));
  };

  const advanceQueue = async () => {
    if (cropQueue.length > 0) {
      const [next, ...rest] = cropQueue;
      setCropQueue(rest);
      setCropSrc(await readAsDataUrl(next));
    } else {
      setCropSrc(null);
    }
  };

  const onCropDone = async (blob: Blob) => {
    setUploading(true);
    try {
      const url = await genUrl({ token });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      const json = await res.json();
      await addPhoto({ token, storageId: json.storageId });
    } catch (err) {
      setError(getErr(err, "Upload failed."));
    } finally {
      setUploading(false);
      await advanceQueue();
    }
  };

  const onCropCancel = () => {
    setCropSrc(null);
    setCropQueue([]);
  };

  const addLocation = () => {
    const v = locationInput.trim();
    if (v && !locations.includes(v)) setLocations([...locations, v]);
    setLocationInput("");
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
        locations,
        bio: bio.trim(),
        seeking: (seeking.length ? seeking : ["romantic"]) as any,
        hiddenCanMessage,
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
      setError(getErr(err, "Could not save."));
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

      <label className="label">Birth year</label>
      <input
        className="input"
        inputMode="numeric"
        placeholder="1990"
        value={birthYear}
        onChange={(e) => setBirthYear(e.target.value)}
      />

      <label className="label">Locations</label>
      <div className="chips" style={{ marginBottom: locations.length ? 10 : 0 }}>
        {locations.map((loc) => (
          <span className="chip chip--on" key={loc}>
            {loc}
            <button
              type="button"
              aria-label={`Remove ${loc}`}
              onClick={() => setLocations(locations.filter((l) => l !== loc))}
              style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", marginLeft: 6 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="row" style={{ gap: 8 }}>
        <input
          className="input"
          placeholder="Add a city (e.g. San Francisco)"
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addLocation();
            }
          }}
        />
        <button type="button" className="btn btn--ghost" onClick={addLocation}>
          Add
        </button>
      </div>
      <p className="hint">Add as many as you like (where you live or spend time).</p>

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

      <label className="label">Open to</label>
      <ChipMulti options={SEEKING} values={seeking} onChange={setSeeking} />
      <p className="hint">
        Choose romantic, friendship, or both. Deal-breakers only apply to
        romantic connections.
      </p>

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

      <hr style={{ border: "none", borderTop: "1px solid var(--card-border)", margin: "26px 0" }} />
      <h3 style={{ margin: "0 0 4px" }}>Privacy</h3>
      <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
        <span className="label" style={{ margin: 0, maxWidth: "70%" }}>
          Let people I've hidden from matches still message me
        </span>
        <button
          type="button"
          className={"chip" + (hiddenCanMessage ? " chip--on" : "")}
          onClick={() => setHiddenCanMessage(!hiddenCanMessage)}
        >
          {hiddenCanMessage ? "On" : "Off"}
        </button>
      </div>
      <p className="hint" style={{ marginTop: 6 }}>
        Hiding someone removes them from your matches. When this is off, they also
        can't message you.
      </p>

      {error && <p className="error" style={{ marginTop: 16 }}>{error}</p>}
      {saved && !onboarding && <p className="ok" style={{ marginTop: 16 }}>Saved.</p>}
      <button className="btn btn--primary btn--full" style={{ marginTop: 18 }} onClick={save} disabled={busy}>
        {busy ? "Saving…" : onboarding ? "Enter toward.love" : "Save changes"}
      </button>

      {cropSrc && (
        <CropModal src={cropSrc} onCancel={onCropCancel} onDone={onCropDone} />
      )}
    </div>
  );
}
