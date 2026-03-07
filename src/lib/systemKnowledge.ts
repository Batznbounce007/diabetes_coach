export type KnowledgeEntry = {
  id: string;
  title: string;
  systems: string[];
  keywords: string[];
  answer: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceType: "manual" | "forum";
  sourceDatabase?: "core" | "rag";
};

export type RagSource = {
  id: string;
  vendor: string;
  product: string;
  category: "pump" | "cgm" | "aid";
  sourceLabel: string;
  sourceUrl: string;
  systems: string[];
  keywords: string[];
};

const coreKnowledgeBase: KnowledgeEntry[] = [
  {
    id: "camaps-high-after-meal",
    title: "Post-Meal Peaks im Closed-Loop reduzieren",
    systems: ["camaps", "closed loop", "insulin pump", "libre 3"],
    keywords: ["hoch", "peak", "post meal", "essen", "bolus", "timing", "anstieg"],
    answer:
      "Bei wiederholten Spitzen nach Mahlzeiten zuerst Bolus-Timing und Kohlenhydrat-Schätzung prüfen. In Hybrid-Closed-Loop-Systemen hilft häufig ein früherer Mahlzeitenbolus und eine saubere Mahlzeitenankündigung.",
    sourceLabel: "CamAPS FX Support / Meal Handling",
    sourceUrl: "https://www.camdiab.com/support/",
    sourceType: "manual",
    sourceDatabase: "core"
  },
  {
    id: "libre3-signal-loss",
    title: "CGM Signalabbrüche und Datenlücken",
    systems: ["libre 3", "freestyle libre", "cgm"],
    keywords: ["signal", "verbindung", "lücke", "daten", "sensor", "bluetooth"],
    answer:
      "Bei Signalabbrüchen sind Abstand zum Smartphone, Bluetooth-Einstellungen und Sensorlaufzeit die häufigsten Ursachen. Prüfe zuerst App-Berechtigungen und ob der Sensor innerhalb der unterstützten Tragezeit liegt.",
    sourceLabel: "FreeStyle Libre 3 Hilfe",
    sourceUrl: "https://www.freestyle.abbott/",
    sourceType: "manual",
    sourceDatabase: "core"
  },
  {
    id: "closed-loop-night-lows",
    title: "Niedrige Werte nachts im Closed Loop",
    systems: ["closed loop", "pump", "cgm"],
    keywords: ["niedrig", "hypo", "nacht", "basal", "alarm"],
    answer:
      "Wenn nächtliche Hypos auftreten, sind Basalprofil, Aktivitätsfaktoren am Abend und Alarmgrenzen zentrale Prüfpunkte. Änderungen sollten schrittweise und mit Rückblick auf mehrere Nächte erfolgen.",
    sourceLabel: "Community-Erfahrungen (Loop and Learn)",
    sourceUrl: "https://www.loopandlearn.org/",
    sourceType: "forum",
    sourceDatabase: "core"
  },
  {
    id: "pump-infusion-site",
    title: "Katheter- und Infusionsstellen prüfen",
    systems: ["insulin pump", "pump", "closed loop"],
    keywords: ["katheter", "infusionsset", "okklusion", "unerklärlich hoch", "wechsel"],
    answer:
      "Bei unerklärlich hohen Werten zuerst Infusionsset/Katheter, Reservoir und Ablaufdatum des Insulins prüfen. Ein rechtzeitiger Set-Wechsel ist ein häufiger Quick-Win bei Persistenz-Hyperglykämien.",
    sourceLabel: "Insulin Pump Troubleshooting Guides",
    sourceUrl: "https://www.diabetes.org.uk/guide-to-diabetes/diabetes-technology/insulin-pumps",
    sourceType: "manual",
    sourceDatabase: "core"
  },
  {
    id: "meal-strategy-for-shifts",
    title: "Schichtarbeit und schwankende Werte",
    systems: ["cgm", "pump", "closed loop"],
    keywords: ["schicht", "arbeit", "unregelmäßig", "beruf", "routine"],
    answer:
      "Bei unregelmäßigen Tagesabläufen helfen feste Decision-Points statt fester Uhrzeiten: pre-meal check, post-meal check und ein kurzer Abend-Review. Das verbessert die Konsistenz trotz wechselndem Tagesrhythmus.",
    sourceLabel: "Diabetes Daily Forum",
    sourceUrl: "https://www.diabetesdaily.com/forum/",
    sourceType: "forum",
    sourceDatabase: "core"
  }
];

export const ragKnowledgeSources: RagSource[] = [
  {
    id: "rec-medtronic-780g",
    vendor: "Medtronic",
    product: "MiniMed 780G",
    category: "pump",
    sourceLabel: "Medtronic MiniMed 780G User Guides",
    sourceUrl: "https://www.medtronicdiabetes.com/download-library",
    systems: ["medtronic", "780g", "minimed", "smartguard", "pump", "aid"],
    keywords: ["auto mode", "smartguard", "set change", "alarm", "hyper", "hypo"]
  },
  {
    id: "rec-tandem-control-iq",
    vendor: "Tandem",
    product: "t:slim X2 / Control-IQ",
    category: "pump",
    sourceLabel: "Tandem Diabetes Care User Guides",
    sourceUrl: "https://www.tandemdiabetes.com/support",
    systems: ["tandem", "tslim", "control iq", "pump", "aid"],
    keywords: ["control iq", "sleep activity", "exercise activity", "cartridge", "infusion set"]
  },
  {
    id: "rec-omnipod-5",
    vendor: "Insulet",
    product: "Omnipod 5",
    category: "pump",
    sourceLabel: "Omnipod 5 User Resources",
    sourceUrl: "https://www.omnipod.com/current-podders/resources",
    systems: ["omnipod", "omnipod 5", "pod", "pump", "aid"],
    keywords: ["pod change", "automated mode", "target glucose", "connectivity"]
  },
  {
    id: "rec-ypsopump-camaps",
    vendor: "Ypsomed / CamDiab",
    product: "mylife YpsoPump + CamAPS FX",
    category: "aid",
    sourceLabel: "mylife Loop + CamAPS Documentation",
    sourceUrl: "https://www.mylife-diabetescare.com/en/services/downloads.html",
    systems: ["ypsopump", "camaps", "loop", "aid", "pump"],
    keywords: ["meal boost", "auto mode", "target", "connectivity"]
  },
  {
    id: "rec-dana-i",
    vendor: "SOOIL",
    product: "Dana-i",
    category: "pump",
    sourceLabel: "Dana-i Manuals and Support",
    sourceUrl: "https://www.dana-diabetes.com/",
    systems: ["dana i", "dana", "pump", "loop"],
    keywords: ["basal profile", "bolus", "pairing", "troubleshooting"]
  },
  {
    id: "rec-dexcom-g7",
    vendor: "Dexcom",
    product: "Dexcom G7",
    category: "cgm",
    sourceLabel: "Dexcom G7 User Guides",
    sourceUrl: "https://www.dexcom.com/en-us/faqs",
    systems: ["dexcom", "g7", "cgm"],
    keywords: ["sensor warmup", "signal loss", "calibration", "alerts"]
  },
  {
    id: "rec-dexcom-g6",
    vendor: "Dexcom",
    product: "Dexcom G6",
    category: "cgm",
    sourceLabel: "Dexcom G6 Help Center",
    sourceUrl: "https://www.dexcom.com/en-us/faqs",
    systems: ["dexcom", "g6", "cgm"],
    keywords: ["transmitter", "sensor errors", "compression low", "alerts"]
  },
  {
    id: "rec-libre-3",
    vendor: "Abbott",
    product: "FreeStyle Libre 3",
    category: "cgm",
    sourceLabel: "FreeStyle Libre 3 Support",
    sourceUrl: "https://www.freestyle.abbott/",
    systems: ["libre 3", "freestyle libre", "cgm"],
    keywords: ["signal", "bluetooth", "sensor", "alarm", "app"]
  },
  {
    id: "rec-libre-2",
    vendor: "Abbott",
    product: "FreeStyle Libre 2",
    category: "cgm",
    sourceLabel: "FreeStyle Libre 2 Support",
    sourceUrl: "https://www.freestyle.abbott/",
    systems: ["libre 2", "freestyle libre", "cgm"],
    keywords: ["alarms", "scan", "sensor replacement", "accuracy"]
  },
  {
    id: "rec-guardian-4",
    vendor: "Medtronic",
    product: "Guardian 4",
    category: "cgm",
    sourceLabel: "Guardian Sensor Resources",
    sourceUrl: "https://www.medtronicdiabetes.com/support",
    systems: ["guardian 4", "guardian sensor", "medtronic", "cgm"],
    keywords: ["calibration", "sensor updating", "warmup", "transmitter"]
  },
  {
    id: "rec-eversense",
    vendor: "Ascensia / Senseonics",
    product: "Eversense",
    category: "cgm",
    sourceLabel: "Eversense CGM User Resources",
    sourceUrl: "https://global.eversensediabetes.com/",
    systems: ["eversense", "implantable cgm", "cgm"],
    keywords: ["transmitter", "calibration", "alert", "adhesive"]
  },
  {
    id: "rec-androidaps",
    vendor: "Open Source",
    product: "AndroidAPS",
    category: "aid",
    sourceLabel: "AndroidAPS Documentation",
    sourceUrl: "https://androidaps.readthedocs.io/",
    systems: ["androidaps", "loop", "closed loop", "aid"],
    keywords: ["profile", "autosens", "basal", "objectives", "smb"]
  },
  {
    id: "rec-loopdocs",
    vendor: "Open Source",
    product: "Loop (iOS)",
    category: "aid",
    sourceLabel: "LoopDocs",
    sourceUrl: "https://loopkit.github.io/loopdocs/",
    systems: ["loop", "loopkit", "ios loop", "closed loop", "aid"],
    keywords: ["settings", "override", "insulin model", "carbs", "troubleshooting"]
  },
  {
    id: "rec-openaps",
    vendor: "Open Source",
    product: "OpenAPS",
    category: "aid",
    sourceLabel: "OpenAPS Documentation",
    sourceUrl: "https://openaps.readthedocs.io/",
    systems: ["openaps", "loop", "closed loop", "aid"],
    keywords: ["autosens", "meal assist", "temp basal", "safety"]
  },
  {
    id: "rec-tidepool-loop",
    vendor: "Tidepool",
    product: "Tidepool Loop",
    category: "aid",
    sourceLabel: "Tidepool Loop Resources",
    sourceUrl: "https://www.tidepool.org/loop",
    systems: ["tidepool loop", "loop", "aid", "closed loop"],
    keywords: ["eligibility", "setup", "compatibility", "safety"]
  },
  {
    id: "rec-diabettech",
    vendor: "Community",
    product: "Diabettech Reviews",
    category: "aid",
    sourceLabel: "Diabettech Technology Reviews",
    sourceUrl: "https://www.diabettech.com/",
    systems: ["pump", "cgm", "closed loop"],
    keywords: ["review", "comparison", "practical tips", "workflow"]
  },
  {
    id: "rec-children-diabetes",
    vendor: "Community",
    product: "Children with Diabetes Forum",
    category: "aid",
    sourceLabel: "Children with Diabetes Forum",
    sourceUrl: "https://forum.childrenwithdiabetes.com/",
    systems: ["pump", "cgm", "closed loop"],
    keywords: ["community", "troubleshooting", "real life", "tips"]
  },
  {
    id: "rec-jdrf-tech",
    vendor: "JDRF",
    product: "Diabetes Technology Guides",
    category: "aid",
    sourceLabel: "JDRF Technology Resources",
    sourceUrl: "https://www.jdrf.org/t1d-resources/",
    systems: ["pump", "cgm", "closed loop", "technology"],
    keywords: ["education", "technology guide", "decision support"]
  },
  {
    id: "rec-ada-tech",
    vendor: "ADA",
    product: "Diabetes Technology Overview",
    category: "aid",
    sourceLabel: "American Diabetes Association Technology",
    sourceUrl: "https://diabetes.org/",
    systems: ["pump", "cgm", "closed loop", "diabetes technology"],
    keywords: ["guidance", "safety", "standards", "education"]
  }
];

function buildRagKnowledgeEntries(sources: RagSource[]): KnowledgeEntry[] {
  return sources.map((source) => ({
    id: source.id,
    title: `${source.product}: Handbuch & Dokumentation`,
    systems: source.systems,
    keywords: source.keywords,
    answer:
      `Nutze die offizielle ${source.product}-Dokumentation für Setup, Alarme, Fehlersuche und Sicherheitsgrenzen. Starte bei den Hersteller-Guides, gleiche dann mit deinem individuellen Profil und Verlaufsmustern ab.`,
    sourceLabel: source.sourceLabel,
    sourceUrl: source.sourceUrl,
    sourceType: source.category === "aid" ? "forum" : "manual",
    sourceDatabase: "rag"
  }));
}

export const ragKnowledgeBase = buildRagKnowledgeEntries(ragKnowledgeSources);

export const systemKnowledgeBase: KnowledgeEntry[] = [...coreKnowledgeBase, ...ragKnowledgeBase];

export const systemSourceCatalog = Array.from(
  new Map(systemKnowledgeBase.map((entry) => [entry.sourceUrl, entry])).values()
).sort((a, b) => a.sourceLabel.localeCompare(b.sourceLabel));

export const ragSourceCatalog = systemSourceCatalog.filter(
  (entry) => entry.sourceDatabase === "rag"
);

export const coreSourceCatalog = systemSourceCatalog.filter(
  (entry) => entry.sourceDatabase !== "rag"
);
