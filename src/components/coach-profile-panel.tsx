"use client";

import { useEffect, useMemo, useState } from "react";
import { Mic, Square } from "lucide-react";
import {
  coachProfileStorageKey as storageKey,
  emptyCoachProfile as emptyProfile,
  type CoachProfile
} from "@/lib/coachProfile";

type CoachProfilePanelProps = {
  recommendation: string;
  motivationalMessage: string;
  lows: number;
  highs: number;
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
  motivationalMessage,
  lows,
  highs,
  lang
}: CoachProfilePanelProps) {
  const [profile, setProfile] = useState<CoachProfile>(emptyProfile);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isRecordingChallenge, setIsRecordingChallenge] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("");
  const [recognition, setRecognition] = useState<SpeechRecognitionLike | null>(null);
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
          focusFromData: "Fokus auf Basis deiner Daten",
          linkedGoal: "Verknüpftes Ziel",
          noPrimaryGoal: "Noch kein primäres Ziel ausgewählt.",
          motivation: "Motivation",
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
          goalPrioritized: (goal: string) => `Coach priorisiert dein Ziel: ${goal}.`,
          focusHigh:
            "Fokus auf hohe Werte: Mahlzeiten mit den stärksten Anstiegen zuerst optimieren.",
          focusLow:
            "Fokus auf Hypo-Prävention: Nacht- und Vormittagsfenster besonders beobachten.",
          focusStable:
            "Fokus auf Stabilität: das aktuelle Muster beibehalten und kleine Anpassungen testen."
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
          focusFromData: "Data-based focus",
          linkedGoal: "Linked goal",
          noPrimaryGoal: "No primary goal selected yet.",
          motivation: "Motivation",
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
          goalPrioritized: (goal: string) => `Coach prioritizes your goal: ${goal}.`,
          focusHigh: "Focus on highs: optimize meals with the strongest rises first.",
          focusLow: "Focus on hypo prevention: monitor night and morning windows closely.",
          focusStable: "Focus on stability: keep the current pattern and test small adjustments."
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

  const personalizedFocus = useMemo(() => {
    if (highs > lows) {
      return t.focusHigh;
    }
    if (lows > 0) {
      return t.focusLow;
    }
    return t.focusStable;
  }, [highs, lows, t.focusHigh, t.focusLow, t.focusStable]);

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
              <p className="mt-1 text-muted-foreground">{t.goalLabel}: {goalLabel}</p>
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
        <p className="mt-2 text-sm text-muted-foreground">{recommendation}</p>

        <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm">
          <p className="font-semibold">{t.focusFromData}</p>
          <p className="mt-1 text-muted-foreground">{personalizedFocus}</p>
        </div>

        {saved ? (
          <div className="mt-3 rounded-lg border border-border p-3 text-sm">
            <p className="font-semibold">{t.linkedGoal}</p>
              <p className="mt-1 text-muted-foreground">
              {profile.primaryGoal ? t.goalPrioritized(goalLabel) : t.noPrimaryGoal}
              </p>
          </div>
        ) : null}

        <div className="mt-3 rounded-lg border border-border p-3 text-sm">
          <p className="font-semibold">{t.motivation}</p>
          <p className="mt-1 text-muted-foreground">{motivationalMessage}</p>
        </div>
      </section>
    </div>
  );
}
