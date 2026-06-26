import { Doc } from "./_generated/dataModel";

export type Intent = "romantic" | "friend";

export function ageOf(u: Doc<"users">): number | null {
  if (!u.birthYear) return null;
  return new Date().getFullYear() - u.birthYear;
}

export function seekingOf(u: Doc<"users">): Intent[] {
  return (u.seeking ?? ["romantic"]) as Intent[];
}

export function openTo(u: Doc<"users">, intent: Intent): boolean {
  return seekingOf(u).includes(intent);
}

// Does `candidate` satisfy `viewer`'s hard requirements (deal-breakers)?
// Only preferences the viewer marked as a deal-breaker are enforced.
export function candidatePassesViewer(
  viewer: Doc<"users">,
  candidate: Doc<"users">,
): boolean {
  const db = viewer.dealBreakers;
  const p = viewer.prefs;

  if (db.gender && p.interestedInGenders.length > 0) {
    if (!candidate.gender || !p.interestedInGenders.includes(candidate.gender))
      return false;
  }
  if (db.relationship && p.relationshipTypes.length > 0) {
    if (
      !candidate.relationship ||
      !p.relationshipTypes.includes(candidate.relationship)
    )
      return false;
  }
  if (db.wantKids && p.wantKids.length > 0) {
    if (!candidate.wantKids || !p.wantKids.includes(candidate.wantKids))
      return false;
  }
  if (db.age && (p.ageMin !== undefined || p.ageMax !== undefined)) {
    const age = ageOf(candidate);
    if (age === null) return false;
    if (p.ageMin !== undefined && age < p.ageMin) return false;
    if (p.ageMax !== undefined && age > p.ageMax) return false;
  }
  return true;
}

// Two members can message only if each satisfies the other's deal-breakers.
export function mutuallyCompatible(
  a: Doc<"users">,
  b: Doc<"users">,
): boolean {
  return candidatePassesViewer(a, b) && candidatePassesViewer(b, a);
}
