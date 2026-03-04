import type { CoachProfile } from "@/lib/coachProfile";
import { systemKnowledgeBase, type KnowledgeEntry } from "@/lib/systemKnowledge";

export type RankedKnowledge = KnowledgeEntry & {
  score: number;
  matchReasons: string[];
};

export type QaResolution = {
  answer: string;
  matches: RankedKnowledge[];
  confidence: "high" | "medium" | "low";
};

const tokenSynonyms: Record<string, string[]> = {
  high: ["hoch", "hyper", "spike", "anstieg"],
  highs: ["hoch", "hyper", "spike", "anstieg"],
  low: ["niedrig", "hypo", "unterzucker"],
  lows: ["niedrig", "hypo", "unterzucker"],
  meal: ["essen", "mahlzeit", "post", "meal"],
  sensor: ["cgm", "libre", "sensor"],
  signal: ["verbindung", "bluetooth", "abbruch", "datenluecke"],
  night: ["nacht", "nachts"],
  pump: ["pumpe", "pump", "insulinpump"],
  katheter: ["infusionsset", "set", "okklusion", "kanuele"],
  closed: ["loop", "closed-loop", "closedloop"]
};

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9äöüß\s-]/gi, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function uniqueTokens(tokens: string[]): string[] {
  return Array.from(new Set(tokens));
}

function expandTokens(tokens: string[]): string[] {
  const expanded = [...tokens];
  for (const token of tokens) {
    const synonyms = tokenSynonyms[token];
    if (synonyms) {
      expanded.push(...synonyms);
    }
  }
  return uniqueTokens(expanded);
}

function hasSoftMatch(queryToken: string, candidateToken: string): boolean {
  if (queryToken === candidateToken) return true;
  if (queryToken.length >= 4 && candidateToken.includes(queryToken)) return true;
  if (candidateToken.length >= 4 && queryToken.includes(candidateToken)) return true;
  return false;
}

export function rankKnowledgeEntries(
  question: string,
  profile: CoachProfile,
  limit = 3
): RankedKnowledge[] {
  const questionTokens = expandTokens(tokenize(question));
  const systemContext =
    `${profile.pumpModel} ${profile.cgmSystem} ${profile.insulinTherapy} ` +
    `${profile.usesClosedLoop} ${profile.closedLoopSystem}`;
  const contextTokens = expandTokens(tokenize(systemContext));

  const ranked = systemKnowledgeBase
    .map((entry) => {
      let score = 0;
      const reasons: string[] = [];
      const entryKeywords = uniqueTokens(entry.keywords.flatMap(tokenize));
      const entrySystems = uniqueTokens(entry.systems.flatMap(tokenize));
      const entryTextTokens = uniqueTokens(tokenize(`${entry.title} ${entry.answer}`));

      const keywordMatches = questionTokens.filter((token) =>
        entryKeywords.some((candidate) => hasSoftMatch(token, candidate))
      );
      const textMatches = questionTokens.filter((token) =>
        entryTextTokens.some((candidate) => hasSoftMatch(token, candidate))
      );
      const systemMatches = contextTokens.filter((token) =>
        entrySystems.some((candidate) => hasSoftMatch(token, candidate))
      );

      if (keywordMatches.length > 0) {
        score += keywordMatches.length * 3;
        reasons.push(`Keyword match: ${uniqueTokens(keywordMatches).slice(0, 3).join(", ")}`);
      }

      if (textMatches.length > 0) {
        score += textMatches.length;
        reasons.push(`Text match: ${uniqueTokens(textMatches).slice(0, 2).join(", ")}`);
      }

      if (systemMatches.length > 0) {
        score += systemMatches.length * 4;
        reasons.push(`System match: ${uniqueTokens(systemMatches).slice(0, 2).join(", ")}`);
      }

      if (questionTokens.some((token) => entry.title.toLowerCase().includes(token))) {
        score += 2;
      }

      return {
        ...entry,
        score,
        matchReasons: reasons
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked;
}

export function resolveSystemQa(
  question: string,
  profile: CoachProfile,
  limit = 3
): QaResolution {
  const ranked = rankKnowledgeEntries(question, profile, limit);

  if (ranked.length > 0) {
    const top = ranked[0];
    const followUp = ranked[1];
    const answer = followUp
      ? `${top.answer}\n\nNächster sinnvoller Check: ${followUp.answer}`
      : top.answer;

    return {
      answer,
      matches: ranked,
      confidence: top.score >= 10 ? "high" : "medium"
    };
  }

  const fallbackMatches = systemKnowledgeBase.slice(0, Math.min(limit, 2)).map((entry, index) => ({
    ...entry,
    score: Math.max(1, 2 - index),
    matchReasons: ["Fallback guidance: no direct keyword hit"]
  }));

  return {
    answer:
      "Ich finde keine eindeutige Übereinstimmung in den Quellen. Starte mit drei Checks: 1) Sensor-/Signalstatus prüfen, 2) Pumpen-/Katheterstatus prüfen, 3) Muster rund um Mahlzeiten und Nacht getrennt bewerten. Danach Frage bitte mit Gerät + Zeitpunkt + Symptom präzisieren.",
    matches: fallbackMatches,
    confidence: "low"
  };
}
