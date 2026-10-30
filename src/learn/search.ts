import { GLOSSARY } from "./curriculum";
import type { Locale } from "./curriculum";
import type { CourseCopy } from "./types";

export interface GlossaryHit {
  id: string;
  en: string;
  bg: string;
  definition: string;
}

export function searchGlossary(copy: CourseCopy, locale: Locale, query: string): GlossaryHit[] {
  const needle = normalize(query);
  const hits = GLOSSARY.filter((entry) => {
    if (!needle) return true;
    const definition = copy.glossary[entry.id] ?? "";
    return [entry.en, entry.bg, definition].some((value) => normalize(value).includes(needle));
  }).map((entry) => ({
    id: entry.id,
    en: entry.en,
    bg: entry.bg,
    definition: copy.glossary[entry.id] ?? "",
  }));
  const label = (hit: GlossaryHit) => (locale === "bg" ? hit.bg : hit.en);
  return hits.sort((a, b) => label(a).localeCompare(label(b), locale === "bg" ? "bg" : "en"));
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}
