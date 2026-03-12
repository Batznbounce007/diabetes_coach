"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import {
  coachProfileStorageKey,
  emptyCoachProfile,
  type CoachProfile
} from "@/lib/coachProfile";
import type { RankedKnowledge } from "@/lib/systemQa";
import type { QaChatMessage } from "@/lib/systemQaAi";
import { systemSourceCatalog } from "@/lib/systemKnowledge";

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly 0: {
    readonly transcript: string;
  };
};

type SpeechRecognitionEventLike = Event & {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ label: string; url: string }>;
};
type QaPair = {
  question: string;
  answer?: string;
  sources?: Array<{ label: string; url: string }>;
};

type SystemQaPanelProps = {
  lang: "de" | "en";
};
type SubmitQueryOptions = {
  clearInputOnSubmit?: boolean;
  clearInputOnFinish?: boolean;
};

const starterQuestionsDe = [
  "Hohe Werte nach Abendessen im Closed Loop senken",
  "Was tun bei CGM-Signalabbrüchen?",
  "Warum nachts wiederholt niedrige Werte?",
  "Erster Schritt bei unerklärlich hohen Werten trotz Bolus",
  "Ist Katheter/Infusionsset die Ursache?",
  "TIR erhöhen ohne mehr Hypoglykämien",
  "Welche Closed-Loop-Einstellungen vor Sport prüfen?",
  "Starke Schwankungen an stressigen Arbeitstagen: was tun?",
  "CGM-Werte verspätet oder sprunghaft: was tun?",
  "Frühstück besser abdecken bei Anstiegen danach",
  "Welche 3 Kennzahlen täglich tracken?",
  "Wann Alarme für hohe/niedrige Werte anpassen?"
];

const starterQuestionsEn = [
  "Reduce high post-dinner values in closed loop",
  "What to do with CGM signal dropouts?",
  "Why repeated lows during the night?",
  "First step for unexplained highs despite bolus",
  "Could catheter/infusion set be the cause?",
  "Increase TIR without more hypoglycemia",
  "Which closed-loop settings to check before exercise?",
  "How to handle strong swings on stressful workdays?",
  "What if CGM values are delayed or jumpy?",
  "How to better cover breakfast rises?",
  "Which 3 metrics should I track daily?",
  "When should I adjust high/low alarms?"
];

function normalizeAssistantText(raw: string): string {
  return raw
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();
}

function buildQaPairs(messages: ChatMessage[]): QaPair[] {
  const pairs: QaPair[] = [];
  let current: QaPair | null = null;

  for (const message of messages) {
    if (message.role === "user") {
      if (current) pairs.push(current);
      current = { question: message.content };
      continue;
    }

    if (!current) {
      current = { question: "Question", answer: message.content, sources: message.sources };
      continue;
    }

    current.answer = message.content;
    current.sources = message.sources;
    pairs.push(current);
    current = null;
  }

  if (current) pairs.push(current);
  return pairs;
}

function loadProfileFromStorage(): CoachProfile {
  if (typeof window === "undefined") return emptyCoachProfile;
  const raw = window.localStorage.getItem(coachProfileStorageKey);
  if (!raw) return emptyCoachProfile;
  try {
    return { ...emptyCoachProfile, ...(JSON.parse(raw) as CoachProfile) };
  } catch {
    return emptyCoachProfile;
  }
}

export function SystemQaPanel({ lang }: SystemQaPanelProps) {
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechStatus, setSpeechStatus] = useState<string>("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const qaHistoryRef = useRef<HTMLDivElement | null>(null);
  const latestEntryRef = useRef<HTMLDivElement | null>(null);

  const t =
    lang === "de"
      ? {
          title: "Ask anything!",
          subtitle:
            "Stelle gezielte Fragen zu Pumpe, CGM und Closed Loop. Antworten basieren auf Handbüchern und Dokumentationen.",
          placeholder:
            "z. B. Was ist der beste erste Schritt bei häufigen hohen Werten nach dem Essen?",
          stopRecording: "Aufnahme stoppen",
          startRecording: "Frage einsprechen",
          loading: "Lade fachgerechte Antworten...",
          submit: "Erhalte fachgerechte Antworten",
          micUnsupported: "Spracherkennung wird in diesem Browser nicht unterstützt.",
          speechRecognized: "Sprache erkannt...",
          speechError: "Spracherkennung fehlgeschlagen. Bitte erneut versuchen.",
          speechStopped: "Aufnahme beendet.",
          speechActive: "Ich höre zu... sprich jetzt deine Frage.",
          speechStartError: "Mikrofon konnte nicht gestartet werden.",
          qaHistory: "Antworten & Rückfragen",
          answerIncoming: "Antwort wird erstellt…",
          you: "Du",
          coach: "Diabetes Coach",
          sources: "Quellen",
          requestError:
            "Gerade konnte keine Antwort geladen werden. Bitte erneut versuchen oder die Frage etwas konkreter formulieren.",
          noAnswer:
            "Aktuell kann ich keine Antwort laden. Bitte versuche es erneut oder stelle die Frage genauer mit System, Zeitpunkt und Situation.",
          sourceCatalog: "Quellenkatalog",
          sourceCatalogSubtitle:
            "Grundlage für fachgerechte Antworten mit Handbüchern und Dokumentationen.",
        }
      : {
          title: "Ask anything!",
          subtitle:
            "Ask focused questions about pump, CGM, and closed loop. Answers are grounded in manuals, documentation, and practical sources.",
          placeholder: "e.g. What is the best first step for frequent post-meal highs?",
          stopRecording: "Stop recording",
          startRecording: "Speak question",
          loading: "Loading expert answers...",
          submit: "Get expert answers",
          micUnsupported: "Speech recognition is not supported in this browser.",
          speechRecognized: "Speech recognized...",
          speechError: "Speech recognition failed. Please try again.",
          speechStopped: "Recording stopped.",
          speechActive: "Listening... ask your question now.",
          speechStartError: "Could not start microphone.",
          qaHistory: "Answers & follow-ups",
          answerIncoming: "Generating answer…",
          you: "You",
          coach: "Diabetes Coach",
          sources: "Sources",
          requestError:
            "Could not load an answer right now. Please try again or ask a more specific question.",
          noAnswer:
            "I cannot load an answer right now. Please try again and include your system, timing, and context.",
          sourceCatalog: "Source catalog",
          sourceCatalogSubtitle:
            "Evidence base for expert answers with manuals, documentation, and practical references.",
        };

  const starterQuestions = useMemo(
    () => (lang === "de" ? starterQuestionsDe : starterQuestionsEn),
    [lang]
  );
  const qaPairs = useMemo(() => buildQaPairs(chat).reverse(), [chat]);

  useEffect(() => {
    if (chat.length === 0 && !isLoading) return;
    qaHistoryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    latestEntryRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chat, isLoading]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const win = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!Ctor) {
      recognitionRef.current = null;
      setSpeechSupported(false);
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang === "de" ? "de-DE" : "en-US";

    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setQuestion(transcript.trim());
      setSpeechStatus(t.speechRecognized);
    };

    recognition.onerror = () => {
      setSpeechStatus(t.speechError);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    setSpeechSupported(true);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [lang, t.speechError, t.speechRecognized]);

  async function submitQuery(nextQuestion: string, options: SubmitQueryOptions = {}) {
    const cleaned = nextQuestion.trim();
    if (cleaned.length < 3) return;
    const { clearInputOnSubmit = true, clearInputOnFinish = false } = options;

    const nextProfile = loadProfileFromStorage();
    setIsLoading(true);
    setRequestError("");
    const nextHistory = [...chat, { role: "user", content: cleaned } satisfies ChatMessage];
    setChat(nextHistory);
    if (clearInputOnSubmit) {
      setQuestion("");
    }

    try {
      const response = await fetch("/api/system-qa", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          question: cleaned,
          lang,
          profile: nextProfile,
          history: chat.map((message) => ({
            role: message.role,
            content: message.content
          })) as QaChatMessage[]
        })
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const payload = (await response.json()) as {
        answer?: string;
        matches?: RankedKnowledge[];
      };

      const assistantAnswer = normalizeAssistantText(payload.answer?.trim() || t.noAnswer);
      const nextMatches = payload.matches ?? [];
      const sources = nextMatches.slice(0, 3).map((entry) => ({
        label: entry.sourceLabel,
        url: entry.sourceUrl
      }));

      setChat((prev) => [...prev, { role: "assistant", content: assistantAnswer, sources }]);
    } catch {
      setRequestError(t.requestError);
      setChat((prev) => [
        ...prev,
        {
          role: "assistant",
          content: t.noAnswer
        }
      ]);
    } finally {
      if (clearInputOnFinish) {
        setQuestion("");
      }
      setIsLoading(false);
    }
  }

  function toggleRecording() {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      setSpeechStatus(t.speechStopped);
      return;
    }

    try {
      recognition.start();
      setIsRecording(true);
      setSpeechStatus(t.speechActive);
    } catch {
      setSpeechStatus(t.speechStartError);
      setIsRecording(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">{t.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>

        <div className="mt-4 grid gap-3">
          <div className="relative">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  void submitQuery(question);
                }
              }}
              className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 pr-12"
              placeholder={t.placeholder}
            />
            <button
              type="button"
              onClick={toggleRecording}
              disabled={!speechSupported}
              aria-label={isRecording ? t.stopRecording : t.startRecording}
              title={isRecording ? t.stopRecording : t.startRecording}
              className={`absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background disabled:opacity-50 ${
                isRecording ? "text-danger" : "text-foreground"
              }`}
            >
              {isRecording ? <Square size={16} /> : <Mic size={16} />}
            </button>
          </div>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => void submitQuery(question)}
              disabled={isLoading || question.trim().length < 8}
              className="h-10 rounded-lg bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {isLoading ? t.loading : t.submit}
            </button>
          </div>
          {speechStatus ? (
            <p className="text-xs text-muted-foreground">{speechStatus}</p>
          ) : !speechSupported ? (
            <p className="text-xs text-muted-foreground">{t.micUnsupported}</p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {starterQuestions.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setQuestion(preset);
                window.setTimeout(() => {
                  void submitQuery(preset, {
                    clearInputOnSubmit: false,
                    clearInputOnFinish: true
                  });
                }, 120);
              }}
              className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-left"
            >
              {preset}
            </button>
          ))}
        </div>

        {chat.length > 0 || isLoading ? (
          <div ref={qaHistoryRef} className="mt-6 space-y-3">
            <h3 className="text-lg font-semibold">{t.qaHistory}</h3>
            <div className="rounded-xl border border-border/70 bg-secondary/10 p-3">
              {isLoading ? (
                <p className="text-xs font-semibold text-primary">{t.answerIncoming}</p>
              ) : null}
              <div className="mt-2 max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {qaPairs.map((pair, index) => (
                  <div
                    key={`${pair.question.slice(0, 24)}-${index}`}
                    ref={index === 0 ? latestEntryRef : undefined}
                    className="rounded-lg border border-border bg-secondary/20 p-3 text-sm"
                  >
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">{t.you}</p>
                    <p className="whitespace-pre-line text-foreground">{pair.question}</p>

                    {pair.answer ? (
                      <>
                        <div className="my-2 border-t border-border/60" />
                        <p className="mb-1 text-xs font-semibold text-muted-foreground">
                          {t.coach}
                        </p>
                        <p className="whitespace-pre-line text-foreground">{pair.answer}</p>
                      </>
                    ) : null}

                    {pair.sources && pair.sources.length > 0 ? (
                      <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
                        <p className="text-xs font-semibold text-muted-foreground">{t.sources}</p>
                        {pair.sources.map((source) => (
                          <a
                            key={`${source.url}-${source.label}`}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-xs text-primary underline"
                          >
                            {source.label}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            {requestError ? (
              <div className="rounded-lg border border-danger/40 bg-danger/5 p-4 text-sm text-danger">
                {requestError}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <aside className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-lg font-semibold">{t.sourceCatalog}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{t.sourceCatalogSubtitle}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {systemSourceCatalog.map((source) => (
            <li key={source.id} className="rounded-lg border border-border/70 p-2">
              <p className="font-medium">{source.sourceLabel}</p>
              <a
                href={source.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary underline"
              >
                {source.sourceUrl}
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
