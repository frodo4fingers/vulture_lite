export const REMINDER_ORDER = [
  "eyes",
  "movement",
  "hydration",
  "reset",
];

export const REMINDER_DEFINITIONS = {
  eyes: {
    label: "Eye comfort",
    shortLabel: "Eyes",
    description: "Look beyond the screen and blink fully.",
    icon: "eye",
    tone: "eye",
    defaultIntervalMinutes: 20,
    defaultDurationSeconds: 20,
    minIntervalMinutes: 10,
    maxIntervalMinutes: 90,
    minDurationSeconds: 10,
    maxDurationSeconds: 180,
    defaultActivities: ["distance", "nature", "blink", "eyes-closed"],
    legacyDefaultActivities: ["distance", "blink"],
    validActivities: ["distance", "nature", "blink", "eyes-closed"],
  },
  movement: {
    label: "Move",
    shortLabel: "Move",
    description: "Vary position, stand, walk, or use a guided movement.",
    icon: "move",
    tone: "move",
    defaultIntervalMinutes: 30,
    defaultDurationSeconds: 120,
    minIntervalMinutes: 15,
    maxIntervalMinutes: 180,
    minDurationSeconds: 30,
    maxDurationSeconds: 600,
    defaultActivities: ["position", "stand", "walk", "exercise"],
    validActivities: ["position", "stand", "walk", "exercise"],
  },
  hydration: {
    label: "Water",
    shortLabel: "Water",
    description: "Drink if you would like; no fixed intake target.",
    icon: "water",
    tone: "water",
    defaultIntervalMinutes: 60,
    defaultDurationSeconds: 30,
    minIntervalMinutes: 20,
    maxIntervalMinutes: 240,
    minDurationSeconds: 15,
    maxDurationSeconds: 180,
    defaultActivities: ["water"],
    validActivities: ["water"],
  },
  reset: {
    label: "Longer reset",
    shortLabel: "Reset",
    description:
      "Step away for a walk, drink, breathing pause, off-screen rest, or guided movement.",
    icon: "cup",
    tone: "reset",
    defaultIntervalMinutes: 90,
    defaultDurationSeconds: 300,
    minIntervalMinutes: 30,
    maxIntervalMinutes: 240,
    minDurationSeconds: 60,
    maxDurationSeconds: 900,
    defaultActivities: ["coffee", "walk", "breathe", "offscreen", "exercise"],
    legacyDefaultActivities: ["coffee", "walk", "exercise"],
    validActivities: ["coffee", "walk", "breathe", "offscreen", "exercise"],
  },
};

export const ACTIVITY_LIBRARY = {
  distance: {
    title: "Look beyond the room",
    detail: "Rest your focus on something roughly 6 m / 20 ft away.",
    icon: "eye",
    steps: [
      "Let your hands rest and release the screen.",
      "Choose a distant object or view through a window.",
      "Let your focus soften; blink normally.",
    ],
    library: {
      channelId: "eyes",
      durationSeconds: 20,
      tags: ["eyes", "restore"],
    },
  },
  nature: {
    title: "Look toward greenery",
    detail: "Use a distant green view for this eye-comfort moment if one is available.",
    icon: "leaf",
    steps: [
      "Let your hands rest and release the screen.",
      "Look through a window or toward a plant, tree, or other greenery.",
      "Let the view hold your attention without searching for detail.",
    ],
    source: "Green-view micro-break trial",
    sourceUrl: "https://doi.org/10.1016/j.jenvp.2015.04.003",
    library: {
      channelId: "eyes",
      durationSeconds: 40,
      tags: ["eyes", "restore"],
    },
  },
  blink: {
    title: "Five slow blinks",
    detail: "Close the eyelids completely and reopen without squeezing.",
    icon: "eye",
    steps: [
      "Look away from the screen.",
      "Make five slow, complete blinks.",
      "Let your forehead and jaw stay easy.",
    ],
    library: {
      channelId: "eyes",
      durationSeconds: 20,
      tags: ["eyes", "restore"],
    },
  },
  "eyes-closed": {
    title: "A gentle closed-eye rest",
    detail: "Close your eyes lightly if that feels comfortable.",
    icon: "eye",
    steps: [
      "Look away from the screen first.",
      "Close your eyes without pressing or rubbing them.",
      "Open them whenever you are ready.",
    ],
    library: {
      channelId: "eyes",
      durationSeconds: 30,
      tags: ["eyes", "restore"],
    },
  },
  position: {
    title: "Change your support",
    detail: "A different comfortable position is enough.",
    icon: "move",
    steps: [
      "Move your feet or change where they are supported.",
      "Shift your weight in the chair.",
      "Let your shoulders drop rather than holding a pose.",
    ],
    library: {
      channelId: "movement",
      durationSeconds: 120,
      tags: ["seated"],
    },
  },
  stand: {
    title: "Stand and shift",
    detail: "Stand only if it is safe and comfortable for you.",
    icon: "stand",
    steps: [
      "Place both feet securely before standing.",
      "Stand tall without locking the knees.",
      "Shift your weight or take a few easy steps.",
    ],
    safety: "Choose a seated option if standing is unsafe or unsteady.",
    library: {
      channelId: "movement",
      durationSeconds: 120,
      tags: ["standing"],
    },
  },
  walk: {
    title: "Take an easy walk",
    detail: "Leave the screen and walk at a comfortable pace.",
    icon: "walk",
    steps: [
      "Stand only if it is safe for you to do so.",
      "Use a clear route and your usual walking aid if needed.",
      "Breathe normally and return when the time feels useful.",
    ],
    safety:
      "Stop for pain, dizziness, chest discomfort, unusual breathlessness, or loss of balance.",
    library: {
      channelId: "reset",
      durationSeconds: 300,
      tags: ["standing", "restore"],
    },
  },
  water: {
    title: "A water moment",
    detail: "Drink some water if you would like.",
    icon: "water",
    steps: [
      "Step away from the screen if possible.",
      "Refill a glass or bottle.",
      "Follow your own thirst and any medical guidance.",
    ],
    library: {
      channelId: "hydration",
      durationSeconds: 30,
      tags: ["restore"],
    },
  },
  coffee: {
    title: "Make tea or coffee",
    detail: "The useful part is stepping away; caffeine is optional.",
    icon: "cup",
    steps: [
      "Leave the screen for a few minutes.",
      "Make any drink you enjoy, caffeinated or not.",
      "Take a few unhurried steps on the way.",
    ],
    library: {
      channelId: "reset",
      durationSeconds: 300,
      tags: ["standing", "restore"],
    },
  },
  breathe: {
    title: "A slower breathing reset",
    detail: "Breathe comfortably for a few minutes with an easy, slightly longer exhale.",
    icon: "breathe",
    steps: [
      "Sit or stand in a comfortable position and let your shoulders soften.",
      "Breathe in gently, without trying to fill the lungs completely.",
      "Let each exhale last a little longer than the inhale; do not hold or force the breath.",
      "Return to your usual breathing whenever you want.",
    ],
    safety:
      "Return to your usual breathing if you feel lightheaded, short of breath, or uncomfortable.",
    source: "Brief structured respiration trial",
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/36630953/",
    library: {
      channelId: "reset",
      durationSeconds: 300,
      tags: ["seated", "restore"],
    },
  },
  offscreen: {
    title: "A full off-screen reset",
    detail: "Give demanding work a longer pause without replacing it with another screen.",
    icon: "pause",
    steps: [
      "Leave the computer and put the phone down if that is practical.",
      "Choose a quiet pause, a short conversation, or a few unhurried steps.",
      "Return when the break feels useful rather than trying to earn a result.",
    ],
    source: "Micro-break systematic review and meta-analysis",
    sourceUrl: "https://doi.org/10.1371/journal.pone.0272460",
    library: {
      channelId: "reset",
      durationSeconds: 600,
      tags: ["restore"],
    },
  },
};

export const EXERCISES = [
  {
    id: "chest-opening",
    title: "Seated chest opening",
    prompt: "Open the chest gently while seated.",
    dose: "Hold 5–10 seconds; repeat up to 5 times",
    icon: "seated",
    tags: ["seated", "mobility"],
    steps: [
      "Sit upright and away from the chair back.",
      "Draw your shoulders back and down, then extend your arms to the sides.",
      "Move your chest gently forward and up, hold, and release.",
    ],
    safety:
      "Move only to gentle tension. Do not force the shoulders. Stop if it causes pain.",
    source: "NHS sitting exercises",
    sourceUrl: "https://www.nhs.uk/live-well/exercise/sitting-exercises/",
  },
  {
    id: "shoulder-release",
    title: "Shoulder shrug and release",
    prompt: "Raise your shoulders gently, then let them relax.",
    dose: "Hold 3–5 seconds; repeat 2–3 times",
    icon: "seated",
    tags: ["seated", "mobility"],
    steps: [
      "Keep your head facing forward and breathe normally.",
      "Raise both shoulders toward your ears until you feel slight tension.",
      "Hold briefly, then let the shoulders relax fully downward.",
    ],
    safety:
      "Keep the movement slow. Do not force it or hold your breath. Stop for pain.",
    source: "CCOHS workstation stretching",
    sourceUrl:
      "https://www.ccohs.ca/oshanswers/ergonomics/office/stretching.html",
  },
  {
    id: "head-glide",
    title: "Head glide",
    prompt: "Draw your head gently back without lifting the chin.",
    dose: "Hold briefly; repeat up to 5 times",
    icon: "seated",
    tags: ["seated", "standing", "mobility"],
    steps: [
      "Sit or stand upright with your gaze level.",
      "Keep the chin level and glide the head straight back, as if making a small double chin.",
      "Pause without forcing the range, then release fully.",
    ],
    safety:
      "Keep the movement small and slow. Stop for pain, dizziness, tingling, or unusual symptoms.",
    source: "CCOHS workstation stretching",
    sourceUrl:
      "https://www.ccohs.ca/oshanswers/ergonomics/office/stretching.html",
  },
  {
    id: "shoulder-blade-squeeze",
    title: "Shoulder-blade squeeze",
    prompt: "Bring the shoulder blades gently toward one another.",
    dose: "Hold up to 5 seconds; repeat up to 5 times",
    icon: "seated",
    tags: ["seated", "standing", "mobility"],
    steps: [
      "Sit or stand tall with your arms relaxed.",
      "Let the shoulders stay low as you draw the shoulder blades gently together.",
      "Hold briefly, breathe normally, and release.",
    ],
    safety:
      "Use only a comfortable range. Stop if the neck or shoulders become painful.",
    source: "CCOHS workstation stretching",
    sourceUrl:
      "https://www.ccohs.ca/oshanswers/ergonomics/office/stretching.html",
  },
  {
    id: "shoulder-roll",
    title: "Slow shoulder rolls",
    prompt: "Circle the shoulders slowly in both directions.",
    dose: "5 backward rolls, then 5 forward",
    icon: "seated",
    tags: ["seated", "standing", "mobility"],
    steps: [
      "Let your arms hang easily and keep your head facing forward.",
      "Roll both shoulders slowly backward five times.",
      "Pause, then roll them slowly forward five times.",
    ],
    safety:
      "Keep the circles comfortable and unforced. Stop if the movement causes pain.",
    source: "CCOHS workstation stretching",
    sourceUrl:
      "https://www.ccohs.ca/oshanswers/ergonomics/office/stretching.html",
  },
  {
    id: "finger-opening",
    title: "Finger opening sequence",
    prompt: "Move slowly from an open hand into a gentle fist and back.",
    dose: "3 slow rounds per hand",
    icon: "seated",
    tags: ["seated", "mobility"],
    steps: [
      "Open one hand and spread the fingers without straining.",
      "Make a gentle fist with the thumb resting outside the fingers.",
      "Slide the fingertips toward the base of the fingers, then open the hand again.",
      "Repeat with the other hand.",
    ],
    safety:
      "Do not force the fingers with the other hand. Stop for pain, tingling, or numbness.",
    source: "CCOHS workstation stretching",
    sourceUrl:
      "https://www.ccohs.ca/oshanswers/ergonomics/office/stretching.html",
  },
  {
    id: "wrist-side-bend",
    title: "Gentle wrist side-bend",
    prompt: "Move each wrist gently from side to side.",
    dose: "Hold each side 3–5 seconds; 3 cycles per wrist",
    icon: "seated",
    tags: ["seated", "mobility"],
    steps: [
      "Open one hand with the palm facing down.",
      "Move the wrist gently from side to side within a comfortable range.",
      "Pause at each end, then repeat with the other wrist.",
    ],
    safety:
      "Do not push with the other hand. Stop if pain, tingling, or numbness appears.",
    source: "CCOHS workstation stretching",
    sourceUrl:
      "https://www.ccohs.ca/oshanswers/ergonomics/office/stretching.html",
  },
  {
    id: "hip-march",
    title: "Seated hip march",
    prompt: "Lift one bent knee at a time while seated.",
    dose: "5 lifts per leg",
    icon: "seated",
    tags: ["seated", "mobility"],
    steps: [
      "Sit upright on a stable, non-wheeled chair.",
      "Hold the sides of the chair.",
      "Lift one bent knee as far as comfortable, lower it, and alternate.",
    ],
    safety:
      "Keep the range comfortable and do not force the hip. Stop if it causes pain.",
    source: "NHS sitting exercises",
    sourceUrl: "https://www.nhs.uk/live-well/exercise/sitting-exercises/",
  },
  {
    id: "ankle-point-flex",
    title: "Ankle point and flex",
    prompt: "Point and flex one foot at a time.",
    dose: "2 sets of 5 per foot",
    icon: "seated",
    tags: ["seated", "mobility"],
    steps: [
      "Sit upright and hold the sides of a stable chair.",
      "Straighten one leg so the foot is off the floor.",
      "Point the toes away, then draw them back; switch sides.",
    ],
    safety:
      "Move slowly. New one-sided calf pain or swelling needs assessment, not exercise.",
    source: "NHS sitting exercises",
    sourceUrl: "https://www.nhs.uk/live-well/exercise/sitting-exercises/",
  },
  {
    id: "sit-to-stand",
    title: "Sit-to-stand",
    prompt: "Stand up and sit down slowly.",
    dose: "Up to 5 slow repetitions",
    icon: "stand",
    tags: ["standing", "strength", "balance"],
    steps: [
      "Use a stable chair that cannot roll or slip.",
      "Place your feet securely, lean slightly forward, and stand slowly.",
      "Stand upright, then sit down with control; use your hands as needed.",
    ],
    safety:
      "Choose a seated movement if standing is unsafe or you have significant balance problems.",
    source: "NHS strength exercises",
    sourceUrl: "https://www.nhs.uk/live-well/exercise/strength-exercises/",
  },
  {
    id: "simple-resistance-circuit",
    title: "Simple resistance circuit",
    prompt: "Combine a few supported lower-body movements in one calm round.",
    dose: "One slow round; about 2–3 minutes",
    icon: "stand",
    tags: ["standing", "strength", "balance"],
    steps: [
      "Stand behind a stable chair with a clear floor around you.",
      "Complete up to 5 shallow supported mini-squats.",
      "Complete up to 5 supported calf raises.",
      "Lift one knee at a time for up to 5 lifts per side.",
      "Finish with 5 gentle tighten-and-release contractions around the hips and buttocks.",
    ],
    safety:
      "Use stable support and a comfortable range. Choose a seated movement if standing is unsafe or unsteady.",
    source: "Simple resistance activity trial",
    sourceUrl: "https://pubmed.ncbi.nlm.nih.gov/33905343/",
  },
  {
    id: "supported-calf-raise",
    title: "Supported calf raise",
    prompt: "Rise onto your toes while holding stable support.",
    dose: "Up to 5 slow repetitions",
    icon: "stand",
    tags: ["standing", "strength", "balance"],
    steps: [
      "Stand behind a stable chair and hold its back with both hands.",
      "Slowly lift both heels as far as comfortable.",
      "Lower both heels with control and repeat.",
    ],
    safety:
      "Keep holding the chair. Stop if you become unsteady or develop pain.",
    source: "NHS strength exercises",
    sourceUrl: "https://www.nhs.uk/live-well/exercise/strength-exercises/",
  },
];
