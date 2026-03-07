"use client";

import { useEffect, useState } from "react";
import { Mic, Square } from "lucide-react";
import {
  coachProfileStorageKey as storageKey,
  emptyCoachProfile as emptyProfile,
  type CoachProfile
} from "@/lib/coachProfile";

type CoachProfilePanelProps = {
  recommendation: string;
  focusMessage: string;
  goalGuidance: string;
  therapyActions: string[];
  motivationalMessage: string;
  podcastMetrics: {
    rangeLabel: string;
    tirPercent: number;
    avgGlucose: number;
    medianGlucose: number;
    stdDev: number;
    cv: number;
    lowPercent: number;
    inRangePercent: number;
    highPercent: number;
    streakDays: number;
  };
  lang: "de" | "en";
};

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

export function CoachProfilePanel({
  recommendation,
  focusMessage,
  goalGuidance,
  therapyActions,
  motivationalMessage,
  podcastMetrics,
  lang
}: CoachProfilePanelProps) {
  const [profile, setProfile] = useState<CoachProfile>(emptyProfile);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isRecordingChallenge, setIsRecordingChallenge] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("");
  const [recognition, setRecognition] = useState<SpeechRecognitionLike | null>(null);
  const [podcastMinutes, setPodcastMinutes] = useState<3 | 5 | 8 | 12>(5);
  const [isPodcastLoading, setIsPodcastLoading] = useState(false);
  const [podcastError, setPodcastError] = useState("");
  const [podcastResult, setPodcastResult] = useState<{
    title: string;
    summary: string;
    keyActions: string[];
    dialogue: Array<{ speaker: "coach" | "you"; line: string }>;
    sources: Array<{ label: string; url: string }>;
  } | null>(null);
  const [detailedPlan, setDetailedPlan] = useState<{
    summary: string;
    actions: string[];
    motivation: string;
    tone: "praise" | "push" | "balanced";
  } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");
  const [podcastAudioUrl, setPodcastAudioUrl] = useState<string>("");
  const [podcastAudioLoading, setPodcastAudioLoading] = useState(false);
  const [showPodcastDetails, setShowPodcastDetails] = useState(false);
  const t =
    lang === "de"
      ? {
          title: "Personalisiere deinen Diabetes Coach",
          subtitle:
            "Definiere deine Ausgangslage und Ziele. So erhältst du klarere, besser passende Hinweise für deinen Alltag.",
          gender: "Geschlecht",
          age: "Alter",
          profession: "Beruf",
          therapy: "Insulintherapie",
          usesClosedLoop: "Closed-Loop im Einsatz?",
          closedLoopSystem: "Closed-Loop-System (optional)",
          pumpModel: "Pumpenmodell (optional)",
          cgm: "CGM-System",
          goal: "Primäres Ziel",
          challenge: "Größte Herausforderung",
          choose: "Bitte wählen",
          female: "Weiblich",
          male: "Männlich",
          diverse: "Divers",
          jobPlaceholder: "z. B. Büro, Schichtdienst, Außendienst",
          closedLoopPlaceholder: "z. B. CamAPS FX, AndroidAPS, Loop",
          pumpPlaceholder: "z. B. YpsoPump, Omnipod 5, MiniMed 780G",
          cgmPlaceholder: "z. B. Libre 3, Dexcom G7",
          challengePlaceholder: "z. B. Abendessen-Spitzen, unregelmäßige Arbeitstage, Sport",
          save: "Zielprofil speichern",
          savedProfile: "Gespeichertes Profil",
          editProfile: "Profil bearbeiten",
          ageOpen: "Alter offen",
          genderOpen: "Geschlecht offen",
          professionOpen: "Beruf offen",
          open: "offen",
          coachImpulse: "Personalisierter Coach-Impuls",
          focusFromData: "Zusammenfassung",
          focusSubtitle: "Kurz einordnen, was in deinem Zeitraum passiert ist.",
          actionPlanTitle: "Konkrete Verbesserungsmaßnahmen",
          actionPlanSubtitle: "Direkt umsetzbare Schritte für den Alltag",
          linkedGoal: "Verknüpftes Ziel",
          noPrimaryGoal: "Noch kein primäres Ziel ausgewählt.",
          linkedGoalHint: "Hier wird dein Ziel aus deinem Profil abgeleitet.",
          motivation: "Motivation",
          noActionsYet:
            "Noch keine Maßnahmen verfügbar. Speichere dein Profil und synchronisiere neue Daten.",
          speechRecognized: "Sprache erkannt…",
          speechError: "Spracherkennung fehlgeschlagen. Bitte erneut versuchen.",
          recordingStopped: "Aufnahme beendet.",
          recordingActive: "Ich höre zu… sprich jetzt deine Herausforderung.",
          micStartError: "Mikrofon konnte nicht gestartet werden.",
          micHint: "Mikrofon aktivierbar: Klick auf das Mikrofon-Symbol.",
          micUnsupported: "Spracherkennung wird in diesem Browser nicht unterstützt.",
          startRecording: "Herausforderung einsprechen",
          stopRecording: "Aufnahme stoppen",
          years: "Jahre",
          therapyLabel: "Therapie",
          closedLoopLabel: "Closed Loop",
          goalLabel: "Ziel",
          therapyPump: "Insulinpumpe",
          therapyPen: "Pen / MDI",
          therapyOther: "Andere",
          closedLoopYes: "Ja",
          closedLoopNo: "Nein",
          goalTir: "TIR erhöhen",
          goalReduceHigh: "Hohe Werte reduzieren",
          goalReduceLow: "Hypoglykämien reduzieren",
          goalStability: "Werte stabilisieren",
          goalPrefix: "Ziel:",
          noGoalGuidance:
            "Sobald du ein primäres Ziel speicherst, bekommst du hier einen gezielten Ziel-Impuls."
          ,
          podcastTitle: "Coaching-Podcast",
          podcastSubtitle:
            "Erzeuge einen Dialog, der deine Werte, dein Profil und Best Practices aus relevanten Handbüchern zusammenführt.",
          podcastDuration: "Länge",
          podcastGenerate: "Podcast generieren",
          podcastLoading: "Podcast wird erstellt…",
          podcastError: "Podcast konnte gerade nicht erstellt werden. Bitte erneut versuchen.",
          podcastSummary: "Zusammenfassung",
          podcastActions: "Konkrete Maßnahmen",
          podcastDialogue: "Dialog",
          podcastSources: "Quellen",
          coachSpeaker: "Diabetes Coach",
          youSpeaker: "Du",
          podcastPlayer: "Player",
          podcastPlaying: "Wird abgespielt",
          podcastPaused: "Pausiert",
          podcastStopped: "Bereit",
          detailedPlanLoading: "Coach-Plan wird aktualisiert…",
          detailedPlanError: "Detail-Coaching konnte gerade nicht geladen werden.",
          autoPlanHint: "Automatische Aktualisierung bei neuen Werten aktiv.",
          podcastAudioLoading: "Audio wird generiert…",
          podcastAudioError: "Audio konnte gerade nicht erzeugt werden. Bitte später erneut versuchen.",
          podcastDetailsToggle: "Podcast-Details anzeigen"
          ,
          setupHintTitle: "So startest du richtig",
          setupStep1: "1. Links Profil ausfüllen und auf „Zielprofil speichern“ klicken.",
          setupStep2: "2. Danach hier auf „Coach-Plan aktualisieren“ klicken.",
          setupStep3: "3. Jetzt werden die Empfehlungen auf dein Profil zugeschnitten."
        }
      : {
          title: "Personalize your Diabetes Coach",
          subtitle:
            "Define your baseline and goals to get clearer, better-tailored guidance for daily life.",
          gender: "Gender",
          age: "Age",
          profession: "Profession",
          therapy: "Insulin therapy",
          usesClosedLoop: "Using closed loop?",
          closedLoopSystem: "Closed-loop system (optional)",
          pumpModel: "Pump model (optional)",
          cgm: "CGM system",
          goal: "Primary goal",
          challenge: "Main challenge",
          choose: "Please choose",
          female: "Female",
          male: "Male",
          diverse: "Diverse",
          jobPlaceholder: "e.g. office, shift work, field service",
          closedLoopPlaceholder: "e.g. CamAPS FX, AndroidAPS, Loop",
          pumpPlaceholder: "e.g. YpsoPump, Omnipod 5, MiniMed 780G",
          cgmPlaceholder: "e.g. Libre 3, Dexcom G7",
          challengePlaceholder: "e.g. post-dinner spikes, irregular workdays, sport",
          save: "Save goal profile",
          savedProfile: "Saved profile",
          editProfile: "Edit profile",
          ageOpen: "Age open",
          genderOpen: "Gender open",
          professionOpen: "Profession open",
          open: "open",
          coachImpulse: "Personalized coach guidance",
          focusFromData: "Summary",
          focusSubtitle: "Quick interpretation of your selected period.",
          actionPlanTitle: "Concrete improvement actions",
          actionPlanSubtitle: "Practical steps you can apply today",
          linkedGoal: "Linked goal",
          noPrimaryGoal: "No primary goal selected yet.",
          linkedGoalHint: "Your goal is derived from your profile here.",
          motivation: "Motivation",
          noActionsYet:
            "No actions available yet. Save your profile and sync fresh data.",
          speechRecognized: "Speech recognized...",
          speechError: "Speech recognition failed. Please try again.",
          recordingStopped: "Recording stopped.",
          recordingActive: "Listening... describe your challenge now.",
          micStartError: "Could not start microphone.",
          micHint: "Microphone available: click the microphone icon.",
          micUnsupported: "Speech recognition is not supported in this browser.",
          startRecording: "Dictate challenge",
          stopRecording: "Stop recording",
          years: "years",
          therapyLabel: "Therapy",
          closedLoopLabel: "Closed loop",
          goalLabel: "Goal",
          therapyPump: "Insulin pump",
          therapyPen: "Pen / MDI",
          therapyOther: "Other",
          closedLoopYes: "Yes",
          closedLoopNo: "No",
          goalTir: "Increase TIR",
          goalReduceHigh: "Reduce highs",
          goalReduceLow: "Reduce hypoglycemia",
          goalStability: "Improve stability",
          goalPrefix: "Goal:",
          noGoalGuidance:
            "As soon as you save a primary goal, you will see targeted goal coaching here."
          ,
          podcastTitle: "Coaching Podcast",
          podcastSubtitle:
            "Generate a dialogue based on your metrics, profile, and best-practice guidance from manuals.",
          podcastDuration: "Length",
          podcastGenerate: "Generate podcast",
          podcastLoading: "Generating podcast…",
          podcastError: "Podcast could not be generated right now. Please try again.",
          podcastSummary: "Summary",
          podcastActions: "Concrete actions",
          podcastDialogue: "Dialogue",
          podcastSources: "Sources",
          coachSpeaker: "Diabetes Coach",
          youSpeaker: "You",
          podcastPlayer: "Player",
          podcastPlaying: "Playing",
          podcastPaused: "Paused",
          podcastStopped: "Ready",
          detailedPlanLoading: "Updating coach plan…",
          detailedPlanError: "Detailed coaching could not be loaded right now.",
          autoPlanHint: "Auto-update is active when new glucose data arrives.",
          podcastAudioLoading: "Generating audio…",
          podcastAudioError: "Audio could not be generated right now. Please try again later.",
          podcastDetailsToggle: "Show podcast details",
          setupHintTitle: "How to start",
          setupStep1: "1. Fill out your profile on the left and click “Save goal profile”.",
          setupStep2: "2. Then click “Refresh coach plan” here.",
          setupStep3: "3. Recommendations will now be tailored to your profile."
        };

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as CoachProfile;
      setProfile({ ...emptyProfile, ...parsed });
      setSaved(true);
      setEditing(false);
    } catch {
      // ignore invalid local data
    }
  }, [lang]);

  const genderLabel =
    profile.gender === "female" ? t.female : profile.gender === "male" ? t.male : profile.gender === "diverse" ? t.diverse : t.genderOpen;
  const therapyLabel =
    profile.insulinTherapy === "pump"
      ? t.therapyPump
      : profile.insulinTherapy === "pen"
        ? t.therapyPen
        : profile.insulinTherapy === "other"
          ? t.therapyOther
          : t.open;
  const goalLabel =
    profile.primaryGoal === "tir"
      ? t.goalTir
      : profile.primaryGoal === "reduce-high"
        ? t.goalReduceHigh
        : profile.primaryGoal === "reduce-low"
          ? t.goalReduceLow
          : profile.primaryGoal === "stability"
            ? t.goalStability
            : t.open;
  const closedLoopUsedLabel =
    profile.usesClosedLoop === "yes"
      ? t.closedLoopYes
      : profile.usesClosedLoop === "no"
        ? t.closedLoopNo
        : t.open;
  const coachActions = Array.from(
    new Set(
      [focusMessage, ...therapyActions, goalGuidance]
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    )
  ).slice(0, 4);
  const actionEmoji = ["🎯", "🛠️", "⏱️", "📈"];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const win = window as Window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognitionInstance = new Ctor();
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = lang === "de" ? "de-DE" : "en-US";

    recognitionInstance.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setProfile((prev) => ({ ...prev, challenge: transcript.trim() }));
      setSpeechStatus(t.speechRecognized);
    };

    recognitionInstance.onerror = () => {
      setSpeechStatus(t.speechError);
      setIsRecordingChallenge(false);
    };

    recognitionInstance.onend = () => {
      setIsRecordingChallenge(false);
    };

    setRecognition(recognitionInstance);
    setSpeechSupported(true);

    return () => {
      recognitionInstance.stop();
      setRecognition(null);
    };
  }, []);

  function toggleChallengeRecording() {
    if (!recognition) return;

    if (isRecordingChallenge) {
      recognition.stop();
      setIsRecordingChallenge(false);
      setSpeechStatus(t.recordingStopped);
      return;
    }

    try {
      recognition.start();
      setIsRecordingChallenge(true);
      setSpeechStatus(t.recordingActive);
    } catch {
      setIsRecordingChallenge(false);
      setSpeechStatus(t.micStartError);
    }
  }

  function saveProfile() {
    window.localStorage.setItem(storageKey, JSON.stringify(profile));
    setSaved(true);
    setEditing(false);
  }

  async function generatePodcast() {
    if (podcastAudioUrl) {
      URL.revokeObjectURL(podcastAudioUrl);
      setPodcastAudioUrl("");
    }
    setPodcastAudioLoading(false);
    setIsPodcastLoading(true);
    setPodcastError("");
    setPodcastResult(null);
    try {
      const response = await fetch("/api/coach-podcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lang,
          durationMinutes: podcastMinutes,
          profile,
          metrics: podcastMetrics,
          coaching: {
            assessment: recommendation,
            actions: coachActions,
            motivation: motivationalMessage
          }
        })
      });
      if (!response.ok) throw new Error("request failed");
      const payload = (await response.json()) as {
        podcast?: {
          title: string;
          summary: string;
          keyActions: string[];
          dialogue: Array<{ speaker: "coach" | "you"; line: string }>;
          sources: Array<{ label: string; url: string }>;
        };
      };
      if (!payload.podcast) throw new Error("missing payload");
      setPodcastResult(payload.podcast);

      setPodcastAudioLoading(true);
      const audioResponse = await fetch("/api/coach-podcast-audio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lang,
          title: payload.podcast.title,
          dialogue: payload.podcast.dialogue
        })
      });
      if (!audioResponse.ok) throw new Error("audio failed");
      const blob = await audioResponse.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPodcastAudioUrl(objectUrl);
    } catch {
      setPodcastError(t.podcastAudioError || t.podcastError);
    } finally {
      setPodcastAudioLoading(false);
      setIsPodcastLoading(false);
    }
  }

  async function loadDetailedPlan(nextProfile: CoachProfile = profile) {
    setPlanLoading(true);
    setPlanError("");
    try {
      const response = await fetch("/api/coach-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lang,
          profile: nextProfile,
          metrics: podcastMetrics
        })
      });
      if (!response.ok) throw new Error("request failed");
      const payload = (await response.json()) as {
        plan?: {
          summary: string;
          actions: string[];
          motivation: string;
          tone: "praise" | "push" | "balanced";
        };
      };
      if (!payload.plan) throw new Error("missing plan");
      setDetailedPlan(payload.plan);
    } catch {
      setPlanError(t.detailedPlanError);
      setDetailedPlan(null);
    } finally {
      setPlanLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (podcastAudioUrl) {
        URL.revokeObjectURL(podcastAudioUrl);
      }
    };
  }, [podcastAudioUrl]);

  useEffect(() => {
    if (editing) return;
    void loadDetailedPlan();
  }, [
    editing,
    lang,
    podcastMetrics.rangeLabel,
    podcastMetrics.tirPercent,
    podcastMetrics.avgGlucose,
    podcastMetrics.medianGlucose,
    podcastMetrics.stdDev,
    podcastMetrics.cv,
    podcastMetrics.lowPercent,
    podcastMetrics.inRangePercent,
    podcastMetrics.highPercent,
    podcastMetrics.streakDays
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">{t.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>

        {editing ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="text-muted-foreground">{t.gender}</span>
              <select
                value={profile.gender}
                onChange={(event) => setProfile({ ...profile, gender: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
              >
                <option value="">{t.choose}</option>
                <option value="female">{t.female}</option>
                <option value="male">{t.male}</option>
                <option value="diverse">{t.diverse}</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="text-muted-foreground">{t.age}</span>
              <input
                type="number"
                min={1}
                max={120}
                value={profile.age}
                onChange={(event) => setProfile({ ...profile, age: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
              />
            </label>

            <label className="text-sm md:col-span-2">
              <span className="text-muted-foreground">{t.profession}</span>
              <input
                type="text"
                value={profile.profession}
                onChange={(event) => setProfile({ ...profile, profession: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
                placeholder={t.jobPlaceholder}
              />
            </label>

            <label className="text-sm">
              <span className="text-muted-foreground">{t.therapy}</span>
              <select
                value={profile.insulinTherapy}
                onChange={(event) => setProfile({ ...profile, insulinTherapy: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
              >
                <option value="">{t.choose}</option>
                <option value="pump">{t.therapyPump}</option>
                <option value="pen">{t.therapyPen}</option>
                <option value="other">{t.therapyOther}</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="text-muted-foreground">{t.usesClosedLoop}</span>
              <select
                value={profile.usesClosedLoop}
                onChange={(event) => setProfile({ ...profile, usesClosedLoop: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
              >
                <option value="">{t.choose}</option>
                <option value="yes">{t.closedLoopYes}</option>
                <option value="no">{t.closedLoopNo}</option>
              </select>
            </label>

            <label className="text-sm">
              <span className="text-muted-foreground">{t.closedLoopSystem}</span>
              <input
                type="text"
                value={profile.closedLoopSystem}
                onChange={(event) => setProfile({ ...profile, closedLoopSystem: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
                placeholder={t.closedLoopPlaceholder}
              />
            </label>

            <label className="text-sm">
              <span className="text-muted-foreground">{t.pumpModel}</span>
              <input
                type="text"
                value={profile.pumpModel}
                onChange={(event) => setProfile({ ...profile, pumpModel: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
                placeholder={t.pumpPlaceholder}
              />
            </label>

            <label className="text-sm">
              <span className="text-muted-foreground">{t.cgm}</span>
              <input
                type="text"
                value={profile.cgmSystem}
                onChange={(event) => setProfile({ ...profile, cgmSystem: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
                placeholder={t.cgmPlaceholder}
              />
            </label>

            <label className="text-sm">
              <span className="text-muted-foreground">{t.goal}</span>
              <select
                value={profile.primaryGoal}
                onChange={(event) => setProfile({ ...profile, primaryGoal: event.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3"
              >
                <option value="">{t.choose}</option>
                <option value="tir">{t.goalTir}</option>
                <option value="reduce-high">{t.goalReduceHigh}</option>
                <option value="reduce-low">{t.goalReduceLow}</option>
                <option value="stability">{t.goalStability}</option>
              </select>
            </label>

            <label className="text-sm md:col-span-2">
              <span className="text-muted-foreground">{t.challenge}</span>
              <div className="relative mt-1">
                <textarea
                  value={profile.challenge}
                  onChange={(event) => setProfile({ ...profile, challenge: event.target.value })}
                  className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 pr-12"
                  placeholder={t.challengePlaceholder}
                />
                <button
                  type="button"
                  onClick={toggleChallengeRecording}
                  disabled={!speechSupported}
                  aria-label={isRecordingChallenge ? t.stopRecording : t.startRecording}
                  title={isRecordingChallenge ? t.stopRecording : t.startRecording}
                  className={`absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background disabled:opacity-50 ${
                    isRecordingChallenge ? "text-danger" : "text-foreground"
                  }`}
                >
                  {isRecordingChallenge ? <Square size={16} /> : <Mic size={16} />}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {speechSupported
                  ? speechStatus || t.micHint
                  : t.micUnsupported}
              </p>
            </label>

            <button
              type="button"
              onClick={saveProfile}
              className="h-10 rounded-lg bg-primary px-4 font-semibold text-primary-foreground md:col-span-2"
            >
              {t.save}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-lg bg-secondary/60 p-3">
              <p className="font-semibold">{t.savedProfile}</p>
              <p className="mt-1 text-muted-foreground">
                {profile.age ? `${profile.age} ${t.years}` : t.ageOpen}, {genderLabel},{" "}
                {profile.profession || t.professionOpen}
              </p>
              <p className="mt-1 text-muted-foreground">
                {t.therapyLabel}: {therapyLabel}
                {profile.pumpModel ? ` (${profile.pumpModel})` : ""}, CGM: {profile.cgmSystem || t.open}
              </p>
              <p className="mt-1 text-muted-foreground">
                {t.closedLoopLabel}: {closedLoopUsedLabel}
                {profile.closedLoopSystem ? ` (${profile.closedLoopSystem})` : ""}
              </p>
              <p className="mt-4 font-semibold">{t.linkedGoal}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.linkedGoalHint}</p>
              <p className="mt-2 text-muted-foreground">
                {profile.primaryGoal
                  ? `${t.goalPrefix} ${goalLabel}. ${goalGuidance}`
                  : t.noGoalGuidance}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="h-10 rounded-lg border border-border px-4 font-semibold"
            >
              {t.editProfile}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-lg font-semibold">{t.coachImpulse}</h3>
        {!saved ? (
          <div className="mt-3 rounded-lg border border-primary/40 bg-primary/5 p-3 text-sm">
            <p className="font-semibold text-primary">{t.setupHintTitle}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>{t.setupStep1}</li>
              <li>{t.setupStep2}</li>
              <li>{t.setupStep3}</li>
            </ul>
          </div>
        ) : null}

        <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm">
          <p className="font-semibold">{t.focusFromData}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.focusSubtitle}</p>
          <p className="mt-2 text-muted-foreground">
            {detailedPlan?.summary ?? recommendation}
          </p>
        </div>

        <div className="mt-3 rounded-lg border border-border p-3 text-sm">
          <p className="font-semibold">{t.actionPlanTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.actionPlanSubtitle}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {planLoading ? t.detailedPlanLoading : t.autoPlanHint}
          </p>
          {planError ? <p className="mt-1 text-xs text-danger">{planError}</p> : null}
          {(detailedPlan?.actions ?? coachActions).length > 0 ? (
            <ul className="mt-2 list-disc space-y-2 pl-5 text-muted-foreground">
              {(detailedPlan?.actions ?? coachActions).map((action, index) => (
                <li key={action}>
                  {actionEmoji[index] ? `${actionEmoji[index]} ` : ""}
                  {action}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted-foreground">{t.noActionsYet}</p>
          )}
        </div>

        <div className="mt-3 rounded-lg border border-border p-3 text-sm">
          <p className="font-semibold">{t.motivation}</p>
          <p className="mt-1 text-muted-foreground">
            {detailedPlan?.motivation ?? motivationalMessage}
          </p>
        </div>

        <div className="mt-3 rounded-lg border border-border p-3 text-sm">
          <p className="font-semibold">{t.podcastTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t.podcastSubtitle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted-foreground">{t.podcastDuration}</label>
            <select
              value={podcastMinutes}
              onChange={(event) => setPodcastMinutes(Number(event.target.value) as 3 | 5 | 8 | 12)}
              className="h-9 rounded-lg border border-border bg-background px-3"
            >
              <option value={3}>3 min</option>
              <option value={5}>5 min</option>
              <option value={8}>8 min</option>
              <option value={12}>12 min</option>
            </select>
            <button
              type="button"
              onClick={() => void generatePodcast()}
              disabled={isPodcastLoading}
              className="h-9 rounded-lg bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
            >
              {isPodcastLoading ? t.podcastLoading : t.podcastGenerate}
            </button>
          </div>

          {podcastError ? (
            <div className="mt-3 rounded-lg border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
              {podcastError}
            </div>
          ) : null}

          {podcastResult ? (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-border/70 bg-background p-3">
                <p className="text-sm font-semibold">{podcastResult.title}</p>
                {podcastAudioLoading ? (
                  <p className="mt-2 text-xs text-muted-foreground">{t.podcastAudioLoading}</p>
                ) : podcastAudioUrl ? (
                  <audio className="mt-2 w-full" controls autoPlay src={podcastAudioUrl} />
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setShowPodcastDetails((prev) => !prev)}
                className="text-xs font-semibold text-muted-foreground underline"
              >
                {t.podcastDetailsToggle}
              </button>
              {showPodcastDetails ? (
                <div className="rounded-lg border border-border/70 bg-secondary/20 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{t.podcastSummary}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{podcastResult.summary}</p>
                </div>
              ) : null}
              {showPodcastDetails ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{t.podcastSources}</p>
                  <div className="mt-1 space-y-1">
                    {podcastResult.sources.map((source) => (
                      <a
                        key={`${source.label}-${source.url}`}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-xs text-primary underline"
                      >
                        {source.label}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
