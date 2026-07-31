import {
  ACTIVITY_LIBRARY,
  EXERCISES,
  REMINDER_DEFINITIONS,
  REMINDER_ORDER,
} from "./content.js";
import {
  MINUTE,
  SECOND,
  clampNumber,
  collectReminderBundle,
  formatClock,
  formatCountdown,
  formatDuration,
  isWithinWorkSchedule,
  localDateKey,
  nearWindowFor,
  nextReminder,
  nextScheduleStart,
} from "./scheduler.js";

const STORAGE_KEY = "vulture-lite:state:v1";
const LEADER_KEY = "vulture-lite:leader:v1";
const STATE_VERSION = 2;
const BUNDLE_WINDOW = 90 * SECOND;
const REOPEN_RESET_AFTER = 15 * MINUTE;
const LEADER_TTL = 10 * SECOND;
const HEARTBEAT_INTERVAL = 15 * SECOND;

const byId = (id) => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}`);
  }
  return element;
};

const refs = {
  themeColor: byId("themeColor"),
  favicon: byId("favicon"),
  browserNoteTitle: byId("browserNoteTitle"),
  browserNoteText: byId("browserNoteText"),
  notificationButton: byId("notificationButton"),
  stateEyebrow: byId("stateEyebrow"),
  nextActivity: byId("nextActivity"),
  nextDetail: byId("nextDetail"),
  countdown: byId("countdown"),
  countdownLabel: byId("countdownLabel"),
  progressRing: byId("progressRing"),
  instrumentStatus: byId("instrumentStatus"),
  primaryAction: byId("primaryAction"),
  mobileQuickButton: byId("mobileQuickButton"),
  pauseButton: byId("pauseButton"),
  planList: byId("planList"),
  historyCount: byId("historyCount"),
  historyMinutes: byId("historyMinutes"),
  planHistoryCount: byId("planHistoryCount"),
  planHistoryMinutes: byId("planHistoryMinutes"),
  recentMoments: byId("recentMoments"),
  statusAnnouncer: byId("statusAnnouncer"),
  toast: byId("toast"),
  onboardingDialog: byId("onboardingDialog"),
  settingsDialog: byId("settingsDialog"),
  evidenceDialog: byId("evidenceDialog"),
  quickDialog: byId("quickDialog"),
  exerciseDialog: byId("exerciseDialog"),
  breakDialog: byId("breakDialog"),
  confirmDialog: byId("confirmDialog"),
  settingsForm: byId("settingsForm"),
  settingsSaved: byId("settingsSaved"),
  settingsNotificationStatus: byId("settingsNotificationStatus"),
  settingsNotificationButton: byId("settingsNotificationButton"),
  exerciseList: byId("exerciseList"),
  breakKicker: byId("breakKicker"),
  breakTitle: byId("breakTitle"),
  breakIntro: byId("breakIntro"),
  breakTimer: byId("breakTimer"),
  breakTimerLabel: byId("breakTimerLabel"),
  breakTimerFill: byId("breakTimerFill"),
  breakAgenda: byId("breakAgenda"),
  breakSafety: byId("breakSafety"),
  startBreakButton: byId("startBreakButton"),
  doneBreakButton: byId("doneBreakButton"),
  snoozeBreakButton: byId("snoozeBreakButton"),
  skipBreakButton: byId("skipBreakButton"),
  swapExerciseButton: byId("swapExerciseButton"),
  breakCloseButton: byId("breakCloseButton"),
  confirmTitle: byId("confirmTitle"),
  confirmText: byId("confirmText"),
  confirmAction: byId("confirmAction"),
};

const settingInputs = {
  eyesEnabled: byId("eyesEnabled"),
  eyesInterval: byId("eyesInterval"),
  eyesDuration: byId("eyesDuration"),
  movementEnabled: byId("movementEnabled"),
  movementInterval: byId("movementInterval"),
  movementDuration: byId("movementDuration"),
  hydrationEnabled: byId("hydrationEnabled"),
  hydrationInterval: byId("hydrationInterval"),
  hydrationDuration: byId("hydrationDuration"),
  resetEnabled: byId("resetEnabled"),
  resetInterval: byId("resetInterval"),
  resetDuration: byId("resetDuration"),
  scheduleEnabled: byId("scheduleEnabled"),
  workStart: byId("workStart"),
  workEnd: byId("workEnd"),
  notificationsEnabled: byId("notificationsEnabled"),
  soundEnabled: byId("soundEnabled"),
};

function createDefaultState() {
  const reminders = {};
  const nextDue = {};
  const activityIndices = {};

  for (const id of REMINDER_ORDER) {
    const definition = REMINDER_DEFINITIONS[id];
    reminders[id] = {
      enabled: true,
      intervalMinutes: definition.defaultIntervalMinutes,
      durationSeconds: definition.defaultDurationSeconds,
      activities: [...definition.defaultActivities],
    };
    nextDue[id] = null;
    activityIndices[id] = 0;
  }

  return {
    version: STATE_VERSION,
    onboardingComplete: false,
    settings: {
      notificationsEnabled: true,
      soundEnabled: true,
      schedule: {
        enabled: false,
        start: "09:00",
        end: "17:30",
        days: [1, 2, 3, 4, 5],
      },
      reminders,
    },
    runtime: {
      running: false,
      pausedUntil: null,
      nextDue,
      activityIndices,
      exerciseIndex: 0,
      lastHeartbeatAt: null,
    },
    history: createEmptyHistory(),
  };
}

function createEmptyHistory(date = new Date()) {
  return {
    date: localDateKey(date),
    completed: 0,
    skipped: 0,
    seconds: 0,
    events: [],
  };
}

function arraysEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function normalizeReminder(id, value, fallback) {
  const definition = REMINDER_DEFINITIONS[id];
  const source = value && typeof value === "object" ? value : {};
  const savedActivities = Array.isArray(source.activities)
    ? source.activities.filter((activity) =>
        definition.validActivities.includes(activity),
      )
    : null;
  const activities =
    savedActivities &&
    Array.isArray(definition.legacyDefaultActivities) &&
    arraysEqual(savedActivities, definition.legacyDefaultActivities)
      ? [...fallback.activities]
      : (savedActivities ?? [...fallback.activities]);

  if (id === "eyes" && !activities.includes("distance")) {
    activities.unshift("distance");
  }
  if (id === "hydration") {
    activities.splice(0, activities.length, "water");
  }
  if (activities.length === 0) {
    activities.push(...fallback.activities);
  }

  return {
    enabled:
      typeof source.enabled === "boolean" ? source.enabled : fallback.enabled,
    intervalMinutes: clampNumber(
      source.intervalMinutes,
      definition.minIntervalMinutes,
      definition.maxIntervalMinutes,
      fallback.intervalMinutes,
    ),
    durationSeconds: clampNumber(
      source.durationSeconds,
      definition.minDurationSeconds,
      definition.maxDurationSeconds,
      fallback.durationSeconds,
    ),
    activities,
  };
}

function normalizeState(value) {
  const fallback = createDefaultState();
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const sourceSettings =
    value.settings && typeof value.settings === "object" ? value.settings : {};
  const sourceSchedule =
    sourceSettings.schedule && typeof sourceSettings.schedule === "object"
      ? sourceSettings.schedule
      : {};
  const scheduleDays = Array.isArray(sourceSchedule.days)
    ? sourceSchedule.days
        .map(Number)
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : fallback.settings.schedule.days;

  const reminders = {};
  for (const id of REMINDER_ORDER) {
    reminders[id] = normalizeReminder(
      id,
      sourceSettings.reminders?.[id],
      fallback.settings.reminders[id],
    );
  }

  const sourceRuntime =
    value.runtime && typeof value.runtime === "object" ? value.runtime : {};
  const nextDue = {};
  const activityIndices = {};
  for (const id of REMINDER_ORDER) {
    const due = Number(sourceRuntime.nextDue?.[id]);
    nextDue[id] = Number.isFinite(due) && due > 0 ? due : null;
    activityIndices[id] = Math.max(
      0,
      Math.floor(Number(sourceRuntime.activityIndices?.[id]) || 0),
    );
  }

  const sourceHistory =
    value.history && typeof value.history === "object" ? value.history : {};
  const historyEvents = Array.isArray(sourceHistory.events)
    ? sourceHistory.events
        .filter(
          (event) =>
            event &&
            typeof event === "object" &&
            typeof event.label === "string" &&
            ["completed", "skipped", "snoozed"].includes(event.status),
        )
        .slice(-30)
        .map((event) => ({
          at: Number(event.at) || Date.now(),
          label: event.label.slice(0, 120),
          status: event.status,
          durationSeconds: Math.max(
            0,
            Math.floor(Number(event.durationSeconds) || 0),
          ),
        }))
    : [];

  return {
    version: STATE_VERSION,
    onboardingComplete: Boolean(value.onboardingComplete),
    settings: {
      notificationsEnabled:
        typeof sourceSettings.notificationsEnabled === "boolean"
          ? sourceSettings.notificationsEnabled
          : fallback.settings.notificationsEnabled,
      soundEnabled:
        typeof sourceSettings.soundEnabled === "boolean"
          ? sourceSettings.soundEnabled
          : fallback.settings.soundEnabled,
      schedule: {
        enabled: Boolean(sourceSchedule.enabled),
        start:
          typeof sourceSchedule.start === "string"
            ? sourceSchedule.start
            : fallback.settings.schedule.start,
        end:
          typeof sourceSchedule.end === "string"
            ? sourceSchedule.end
            : fallback.settings.schedule.end,
        days:
          scheduleDays.length > 0
            ? [...new Set(scheduleDays)]
            : fallback.settings.schedule.days,
      },
      reminders,
    },
    runtime: {
      running: Boolean(sourceRuntime.running),
      pausedUntil:
        Number.isFinite(Number(sourceRuntime.pausedUntil)) &&
        Number(sourceRuntime.pausedUntil) > 0
          ? Number(sourceRuntime.pausedUntil)
          : null,
      nextDue,
      activityIndices,
      exerciseIndex: Math.max(
        0,
        Math.floor(Number(sourceRuntime.exerciseIndex) || 0),
      ),
      lastHeartbeatAt:
        Number.isFinite(Number(sourceRuntime.lastHeartbeatAt)) &&
        Number(sourceRuntime.lastHeartbeatAt) > 0
          ? Number(sourceRuntime.lastHeartbeatAt)
          : null,
    },
    history: {
      date:
        typeof sourceHistory.date === "string"
          ? sourceHistory.date
          : fallback.history.date,
      completed: Math.max(
        0,
        Math.floor(Number(sourceHistory.completed) || 0),
      ),
      skipped: Math.max(0, Math.floor(Number(sourceHistory.skipped) || 0)),
      seconds: Math.max(0, Math.floor(Number(sourceHistory.seconds) || 0)),
      events: historyEvents,
    },
  };
}

let storageOperational = true;
const startupMessages = [];

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createDefaultState();
    }
    try {
      return normalizeState(JSON.parse(stored));
    } catch (error) {
      console.warn("Vulture Lite could not parse its saved state.", error);
      startupMessages.push(
        "Saved settings were unreadable, so a fresh local plan was created.",
      );
      return createDefaultState();
    }
  } catch (error) {
    storageOperational = false;
    console.warn("Vulture Lite cannot access localStorage.", error);
    startupMessages.push(
      "This browser is blocking local storage; settings will last only for this visit.",
    );
    return createDefaultState();
  }
}

let state = loadState();
let currentPrompt = null;
let activeBreak = null;
let promptQueue = [];
let confirmationCallback = null;
let libraryFilter = "all";
let serviceWorkerRegistration = null;
let audioContext = null;
let toastTimer = null;
let settingsSavedTimer = null;
let lastAnnouncement = "";

const tabId =
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let isLeader = !storageOperational;
let leaderExpiresAt = isLeader ? Number.POSITIVE_INFINITY : 0;

function persistState() {
  if (!storageOperational) {
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    storageOperational = false;
    console.warn("Vulture Lite could not save local state.", error);
    showToast(
      "This browser stopped accepting local storage. Current settings may not survive a reload.",
    );
    return false;
  }
}

function ensureToday(now = new Date()) {
  const key = localDateKey(now);
  if (state.history.date !== key) {
    state.history = createEmptyHistory(now);
    return true;
  }
  return false;
}

function enabledReminderIds() {
  return REMINDER_ORDER.filter(
    (id) => state.settings.reminders[id].enabled,
  );
}

function scheduleReminder(id, from = Date.now(), overrideMinutes = null) {
  const reminder = state.settings.reminders[id];
  if (!reminder.enabled) {
    state.runtime.nextDue[id] = null;
    return;
  }
  const intervalMinutes = overrideMinutes ?? reminder.intervalMinutes;
  state.runtime.nextDue[id] = from + intervalMinutes * MINUTE;
}

function scheduleAll(from = Date.now()) {
  for (const id of REMINDER_ORDER) {
    scheduleReminder(id, from);
  }
}

function ensureSchedule(from = Date.now()) {
  let changed = false;
  for (const id of REMINDER_ORDER) {
    const reminder = state.settings.reminders[id];
    if (!reminder.enabled) {
      if (state.runtime.nextDue[id] !== null) {
        state.runtime.nextDue[id] = null;
        changed = true;
      }
      continue;
    }
    if (!Number.isFinite(Number(state.runtime.nextDue[id]))) {
      scheduleReminder(id, from);
      changed = true;
    }
  }
  return changed;
}

function resetChannels(channelIds, from = Date.now()) {
  for (const id of channelIds) {
    scheduleReminder(id, from);
  }
}

function showToast(message, duration = 4_000) {
  refs.toast.textContent = message;
  refs.toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    refs.toast.hidden = true;
  }, duration);
}

function announce(message) {
  if (message === lastAnnouncement) {
    return;
  }
  lastAnnouncement = message;
  refs.statusAnnouncer.textContent = message;
}

function createIcon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", `#icon-${name}`);
  svg.append(use);
  return svg;
}

function setButtonLabel(button, label) {
  const labelElement = button.querySelector("span");
  if (labelElement) {
    labelElement.textContent = label;
  } else {
    button.textContent = label;
  }
}

function setPrimaryActionLabel(label) {
  setButtonLabel(refs.primaryAction, label);
  setButtonLabel(refs.mobileQuickButton, label);
}

function currentNotificationPermission() {
  if (!globalThis.isSecureContext || !("Notification" in globalThis)) {
    return "unsupported";
  }
  return Notification.permission;
}

async function registerServiceWorker() {
  if (
    !globalThis.isSecureContext ||
    !("serviceWorker" in navigator) ||
    serviceWorkerRegistration
  ) {
    return serviceWorkerRegistration;
  }
  try {
    serviceWorkerRegistration =
      await navigator.serviceWorker.register("./sw.js", {
        updateViaCache: "none",
      });
    return serviceWorkerRegistration;
  } catch (error) {
    console.warn("Vulture Lite service worker registration failed.", error);
    return null;
  }
}

async function requestNotificationPermission() {
  const permission = currentNotificationPermission();
  if (permission === "unsupported") {
    showToast(
      "Notifications need a supported browser on HTTPS. The title and favicon still work.",
    );
    return "unsupported";
  }
  if (permission === "denied") {
    showToast(
      "Notifications are blocked in this browser. Change the site permission to enable them.",
    );
    return "denied";
  }
  if (permission === "granted") {
    showToast("Browser notifications are already on.");
    return "granted";
  }

  try {
    const result = await Notification.requestPermission();
    if (result === "granted") {
      await registerServiceWorker();
      showToast("Notifications are on while Vulture Lite remains open.");
    } else {
      showToast("No problem. The title and favicon will keep signalling.");
    }
    renderNotificationState();
    return result;
  } catch (error) {
    console.warn("Notification permission request failed.", error);
    showToast("The browser could not open its notification permission prompt.");
    return "error";
  }
}

async function enableNotifications() {
  state.settings.notificationsEnabled = true;
  settingInputs.notificationsEnabled.checked = true;
  persistState();
  renderNotificationState();
  await requestNotificationPermission();
}

async function notifyPrompt(prompt) {
  if (state.settings.soundEnabled) {
    void playChime();
  }

  const shouldUseSystemNotification =
    document.visibilityState !== "visible" ||
    !document.hasFocus() ||
    Boolean(document.querySelector("dialog[open]:not(#breakDialog)"));

  if (
    !state.settings.notificationsEnabled ||
    !shouldUseSystemNotification ||
    !isLeader ||
    currentNotificationPermission() !== "granted"
  ) {
    return;
  }

  const body = `${prompt.items
    .map((item) => item.title)
    .join(" · ")}. Open Vulture Lite to start, snooze, or skip.`;
  const options = {
    body,
    icon: "./favicon.svg",
    tag: "vulture-lite-break",
    renotify: true,
    data: { url: globalThis.location.href },
  };

  try {
    const registration =
      serviceWorkerRegistration ?? (await registerServiceWorker());
    if (registration) {
      await registration.showNotification(prompt.title, options);
      return;
    }
    new Notification(prompt.title, options);
  } catch (error) {
    console.warn("Vulture Lite could not show a browser notification.", error);
    showToast("A break is ready, but the browser notification failed.");
  }
}

async function playChime(preview = false) {
  if (!preview && !state.settings.soundEnabled) {
    return;
  }
  const AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContext) {
    if (preview) {
      showToast("This browser does not support the optional chime.");
    }
    return;
  }

  try {
    audioContext ??= new AudioContext();
    await audioContext.resume();
    const start = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.connect(audioContext.destination);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.075, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);

    const first = audioContext.createOscillator();
    first.type = "sine";
    first.frequency.setValueAtTime(523.25, start);
    first.connect(gain);
    first.start(start);
    first.stop(start + 0.34);

    const second = audioContext.createOscillator();
    second.type = "sine";
    second.frequency.setValueAtTime(659.25, start + 0.18);
    second.connect(gain);
    second.start(start + 0.18);
    second.stop(start + 0.7);
  } catch (error) {
    console.warn("Vulture Lite could not play its chime.", error);
    if (preview) {
      showToast("The browser blocked the chime preview.");
    }
  }
}

function claimLeadership() {
  if (!storageOperational) {
    isLeader = true;
    leaderExpiresAt = Number.POSITIVE_INFINITY;
    return;
  }

  const now = Date.now();
  try {
    let leader = null;
    const raw = localStorage.getItem(LEADER_KEY);
    if (raw) {
      try {
        leader = JSON.parse(raw);
      } catch (error) {
        console.warn("Ignoring an unreadable tab-leader record.", error);
      }
    }

    if (
      !leader ||
      leader.owner === tabId ||
      !Number.isFinite(Number(leader.expiresAt)) ||
      Number(leader.expiresAt) <= now
    ) {
      leader = { owner: tabId, expiresAt: now + LEADER_TTL };
      localStorage.setItem(LEADER_KEY, JSON.stringify(leader));
    }

    isLeader = leader.owner === tabId;
    leaderExpiresAt = isLeader
      ? Number(leader.expiresAt)
      : Math.max(0, Number(leader.expiresAt) || 0);
  } catch (error) {
    console.warn("Tab leadership is unavailable.", error);
    isLeader = true;
    leaderExpiresAt = Number.POSITIVE_INFINITY;
  }
}

function releaseLeadership() {
  if (!storageOperational || !isLeader) {
    return;
  }
  try {
    const leader = JSON.parse(localStorage.getItem(LEADER_KEY) ?? "null");
    if (leader?.owner === tabId) {
      localStorage.removeItem(LEADER_KEY);
    }
  } catch (error) {
    console.warn("Could not release tab leadership cleanly.", error);
  }
}

function isPaused(now = Date.now()) {
  return Boolean(
    state.runtime.pausedUntil && state.runtime.pausedUntil > now,
  );
}

function peekActivity(id) {
  const reminder = state.settings.reminders[id];
  const index = state.runtime.activityIndices[id] ?? 0;
  const activityId =
    reminder.activities[index % reminder.activities.length] ??
    REMINDER_DEFINITIONS[id].defaultActivities[0];
  if (activityId === "exercise") {
    const exercise =
      EXERCISES[state.runtime.exerciseIndex % EXERCISES.length] ?? EXERCISES[0];
    return {
      title: exercise?.title ?? "Guided desk-side movement",
      icon: exercise?.icon ?? "move",
    };
  }
  return ACTIVITY_LIBRARY[activityId] ?? {
    title: REMINDER_DEFINITIONS[id].label,
    icon: REMINDER_DEFINITIONS[id].icon,
  };
}

function chooseExercise(forcedExercise = null) {
  if (forcedExercise) {
    return forcedExercise;
  }
  const exercise =
    EXERCISES[state.runtime.exerciseIndex % EXERCISES.length] ?? EXERCISES[0];
  state.runtime.exerciseIndex += 1;
  return exercise;
}

function chooseActivity(
  id,
  { activityId: forcedActivityId, exercise, durationSeconds } = {},
) {
  const reminder = state.settings.reminders[id];
  let activityId = forcedActivityId;

  if (!activityId) {
    const index = state.runtime.activityIndices[id] ?? 0;
    activityId =
      reminder.activities[index % reminder.activities.length] ??
      REMINDER_DEFINITIONS[id].defaultActivities[0];
    state.runtime.activityIndices[id] = index + 1;
  }

  if (activityId === "exercise") {
    const selected = chooseExercise(exercise);
    return {
      id: `exercise:${selected.id}`,
      activityId,
      title: selected.title,
      detail: `${selected.prompt} ${selected.dose}.`,
      icon: selected.icon,
      steps: [...selected.steps],
      safety: selected.safety,
      source: selected.source,
      sourceUrl: selected.sourceUrl,
      durationSeconds: durationSeconds ?? reminder.durationSeconds,
      exercise: selected,
    };
  }

  const activity = ACTIVITY_LIBRARY[activityId];
  if (!activity) {
    throw new Error(`Unknown activity: ${activityId}`);
  }
  return {
    id: activityId,
    activityId,
    title: activity.title,
    detail: activity.detail,
    icon: activity.icon,
    steps: [...activity.steps],
    safety: activity.safety ?? null,
    source: activity.source ?? null,
    sourceUrl: activity.sourceUrl ?? null,
    durationSeconds: durationSeconds ?? reminder.durationSeconds,
    exercise: null,
  };
}

function buildPrompt(
  channelIds,
  source,
  {
    activities = {},
    exercise = null,
    durations = {},
  } = {},
) {
  const items = channelIds.map((id) =>
    chooseActivity(id, {
      activityId: activities[id],
      exercise: activities[id] === "exercise" ? exercise : null,
      durationSeconds: durations[id],
    }),
  );
  const durationSeconds = Math.max(
    ...items.map((item) => item.durationSeconds),
  );
  const bundled = items.length > 1;

  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    source,
    channelIds: [...channelIds],
    title: bundled ? "A small reset is due." : items[0].title,
    intro: bundled
      ? "These arrived together, so you only get one interruption."
      : items[0].detail,
    kicker: bundled
      ? `${items.length} reminders, bundled`
      : source === "manual"
        ? "A moment you chose"
        : "A quiet nudge",
    durationSeconds,
    items,
    manualScheduleReset: false,
  };
}

function buildManualPrompt(kind, exercise = null) {
  const manual = {
    eyes: {
      channelIds: ["eyes"],
      activities: { eyes: "distance" },
      durations: { eyes: 20 },
    },
    stand: {
      channelIds: ["movement"],
      activities: { movement: "stand" },
      durations: { movement: 120 },
    },
    walk: {
      channelIds: ["reset"],
      activities: { reset: "walk" },
      durations: { reset: 300 },
    },
    water: {
      channelIds: ["hydration"],
      activities: { hydration: "water" },
      durations: { hydration: 30 },
    },
    coffee: {
      channelIds: ["reset"],
      activities: { reset: "coffee" },
      durations: { reset: 300 },
    },
    exercise: {
      channelIds: ["movement"],
      activities: { movement: "exercise" },
      durations: { movement: 60 },
    },
  }[kind];

  if (!manual) {
    throw new Error(`Unknown quick break: ${kind}`);
  }
  return buildPrompt(manual.channelIds, "manual", {
    activities: manual.activities,
    durations: manual.durations,
    exercise,
  });
}

function recordMoment(status, prompt, durationSeconds = 0) {
  ensureToday();
  if (status === "completed") {
    state.history.completed += 1;
    state.history.seconds += Math.max(0, Math.round(durationSeconds));
  } else if (status === "skipped") {
    state.history.skipped += 1;
  }
  state.history.events.push({
    at: Date.now(),
    label: prompt.title,
    status,
    durationSeconds: Math.max(0, Math.round(durationSeconds)),
  });
  state.history.events = state.history.events.slice(-30);
}

function resetManualPromptSchedule(prompt, from = Date.now()) {
  if (prompt.source !== "manual" || prompt.manualScheduleReset) {
    return;
  }
  resetChannels(prompt.channelIds, from);
  prompt.manualScheduleReset = true;
}

function getOpenDialog() {
  return document.querySelector("dialog[open]");
}

function openDialog(dialog) {
  if (!dialog.open) {
    dialog.showModal();
  }
}

function closeDialog(dialog) {
  if (dialog.open) {
    dialog.close();
  }
}

function enqueuePrompt(prompt, { notify = false } = {}) {
  promptQueue.push(prompt);
  if (notify) {
    void notifyPrompt(prompt);
  }
  flushPromptQueue();
}

function flushPromptQueue() {
  if (
    currentPrompt ||
    activeBreak ||
    promptQueue.length === 0 ||
    getOpenDialog()
  ) {
    return;
  }
  const prompt = promptQueue.shift();
  showPrompt(prompt);
}

function renderPromptContent(prompt) {
  refs.breakKicker.textContent = prompt.kicker;
  refs.breakTitle.textContent = prompt.title;
  refs.breakIntro.textContent = prompt.intro;
  refs.breakTimer.textContent = formatCountdown(
    prompt.durationSeconds * SECOND,
  );
  refs.breakTimer.setAttribute("datetime", `PT${prompt.durationSeconds}S`);
  refs.breakTimerLabel.textContent = "suggested";
  refs.breakTimerFill.style.width = "0%";
  refs.breakAgenda.replaceChildren();

  const safetyMessages = [];
  for (const item of prompt.items) {
    const listItem = document.createElement("li");
    const iconWrap = document.createElement("span");
    iconWrap.className = "agenda-icon";
    iconWrap.append(createIcon(item.icon));

    const copy = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = item.title;
    const detail = document.createElement("p");
    detail.textContent = item.detail;
    copy.append(heading, detail);

    if (item.steps.length > 0) {
      const steps = document.createElement("ol");
      for (const instruction of item.steps) {
        const step = document.createElement("li");
        step.textContent = instruction;
        steps.append(step);
      }
      copy.append(steps);
    }

    if (item.source && item.sourceUrl) {
      const source = document.createElement("a");
      source.className = "source-link";
      source.href = item.sourceUrl;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = `Source: ${item.source}`;
      copy.append(source);
    }

    if (item.safety) {
      safetyMessages.push(item.safety);
    }

    listItem.append(iconWrap, copy);
    refs.breakAgenda.append(listItem);
  }

  if (safetyMessages.length > 0) {
    refs.breakSafety.hidden = false;
    refs.breakSafety.textContent = [...new Set(safetyMessages)].join(" ");
  } else {
    refs.breakSafety.hidden = true;
    refs.breakSafety.textContent = "";
  }

  refs.startBreakButton.hidden = false;
  refs.startBreakButton.textContent = `Start ${formatDuration(
    prompt.durationSeconds,
  )}`;
  refs.doneBreakButton.hidden = false;
  refs.doneBreakButton.textContent = "Done for now";
  refs.snoozeBreakButton.hidden = prompt.source !== "scheduled";
  refs.skipBreakButton.hidden = prompt.source !== "scheduled";
  refs.skipBreakButton.textContent = "Skip";
  refs.swapExerciseButton.hidden = !prompt.items.some(
    (item) => item.exercise,
  );
  refs.breakCloseButton.setAttribute(
    "aria-label",
    prompt.source === "scheduled" ? "Skip and close" : "Close",
  );
}

function showPrompt(prompt) {
  currentPrompt = prompt;
  activeBreak = null;
  renderPromptContent(prompt);
  openDialog(refs.breakDialog);
  renderAll();
}

function closePrompt() {
  currentPrompt = null;
  activeBreak = null;
  closeDialog(refs.breakDialog);
  renderAll();
  window.setTimeout(flushPromptQueue, 0);
}

function startBreak() {
  if (!currentPrompt || activeBreak) {
    return;
  }
  const now = Date.now();
  resetManualPromptSchedule(currentPrompt, now);
  activeBreak = {
    prompt: currentPrompt,
    startedAt: now,
    endAt: now + currentPrompt.durationSeconds * SECOND,
    recorded: false,
    finished: false,
  };
  refs.startBreakButton.hidden = true;
  refs.doneBreakButton.textContent = "Done early";
  refs.snoozeBreakButton.hidden = true;
  refs.skipBreakButton.hidden = true;
  refs.swapExerciseButton.hidden = true;
  refs.breakTimerLabel.textContent = "remaining";
  refs.breakCloseButton.setAttribute("aria-label", "End break and close");
  persistState();
  updateActiveBreak(now);
}

function finishActiveBreak(now = Date.now(), keepOpen = false) {
  if (!activeBreak || !currentPrompt) {
    return;
  }

  if (!activeBreak.recorded) {
    const elapsed = activeBreak.finished
      ? currentPrompt.durationSeconds
      : Math.min(
          currentPrompt.durationSeconds,
          Math.max(1, Math.round((now - activeBreak.startedAt) / SECOND)),
        );
    resetManualPromptSchedule(currentPrompt, now);
    recordMoment("completed", currentPrompt, elapsed);
    activeBreak.recorded = true;
    persistState();
    renderHistory();
  }

  if (!keepOpen) {
    closePrompt();
  }
}

function completePromptWithoutTimer() {
  if (!currentPrompt) {
    return;
  }
  resetManualPromptSchedule(currentPrompt);
  recordMoment("completed", currentPrompt, currentPrompt.durationSeconds);
  persistState();
  closePrompt();
  announce("Break marked complete.");
}

function updateActiveBreak(now = Date.now()) {
  if (!activeBreak || !currentPrompt) {
    return;
  }

  const total = currentPrompt.durationSeconds * SECOND;
  const remaining = Math.max(0, activeBreak.endAt - now);
  const elapsedRatio = total > 0 ? 1 - remaining / total : 1;
  refs.breakTimer.textContent = formatCountdown(remaining);
  refs.breakTimer.setAttribute(
    "datetime",
    `PT${Math.ceil(remaining / SECOND)}S`,
  );
  refs.breakTimerFill.style.width = `${Math.min(
    100,
    Math.max(0, elapsedRatio * 100),
  )}%`;

  if (remaining > 0 || activeBreak.finished) {
    return;
  }

  activeBreak.finished = true;
  finishActiveBreak(now, true);
  void playChime();
  refs.breakTitle.textContent = "That was enough.";
  refs.breakIntro.textContent =
    "Return when you are ready. There is nothing else to earn.";
  refs.breakTimer.textContent = "Done";
  refs.breakTimer.removeAttribute("datetime");
  refs.breakTimerLabel.textContent = "moment complete";
  refs.breakTimerFill.style.width = "100%";
  refs.doneBreakButton.hidden = false;
  refs.doneBreakButton.textContent = "Return to work";
  refs.breakCloseButton.setAttribute("aria-label", "Return to work");
  announce("Break complete. Return when you are ready.");
}

function skipPrompt() {
  if (!currentPrompt) {
    return;
  }
  if (currentPrompt.source === "scheduled") {
    recordMoment("skipped", currentPrompt);
    persistState();
  }
  closePrompt();
}

function snoozePrompt() {
  if (!currentPrompt) {
    return;
  }
  const now = Date.now();
  for (const id of currentPrompt.channelIds) {
    scheduleReminder(id, now, 10);
  }
  recordMoment("snoozed", currentPrompt);
  persistState();
  closePrompt();
  showToast("Snoozed for 10 minutes.");
}

function swapExercise() {
  if (!currentPrompt || activeBreak) {
    return;
  }
  const itemIndex = currentPrompt.items.findIndex((item) => item.exercise);
  if (itemIndex < 0) {
    return;
  }
  const previous = currentPrompt.items[itemIndex];
  const replacement = chooseActivity(currentPrompt.channelIds[itemIndex], {
    activityId: "exercise",
    durationSeconds: previous.durationSeconds,
  });
  currentPrompt.items[itemIndex] = replacement;
  if (currentPrompt.items.length === 1) {
    currentPrompt.title = replacement.title;
    currentPrompt.intro = replacement.detail;
  }
  persistState();
  renderPromptContent(currentPrompt);
}

function handleBreakDone() {
  if (!currentPrompt) {
    return;
  }
  if (activeBreak) {
    finishActiveBreak(Date.now(), false);
  } else {
    completePromptWithoutTimer();
  }
}

function handleBreakClose() {
  if (activeBreak) {
    finishActiveBreak(Date.now(), false);
    return;
  }
  skipPrompt();
}

function triggerDueReminders(now = Date.now()) {
  if (
    !state.runtime.running ||
    isPaused(now) ||
    !isWithinWorkSchedule(state.settings.schedule, new Date(now)) ||
    !isLeader ||
    leaderExpiresAt <= now ||
    currentPrompt ||
    activeBreak ||
    promptQueue.length > 0
  ) {
    return false;
  }

  const bundle = collectReminderBundle(
    state.settings.reminders,
    state.runtime.nextDue,
    now,
    BUNDLE_WINDOW,
  );
  if (bundle.length === 0) {
    return false;
  }

  const channelIds = bundle.map((entry) => entry.id);
  for (const id of channelIds) {
    scheduleReminder(id, now);
  }
  const prompt = buildPrompt(channelIds, "scheduled");
  persistState();
  enqueuePrompt(prompt, { notify: true });
  return true;
}

function openQuickDialog() {
  openDialog(refs.quickDialog);
}

function startQuickBreak(kind, exercise = null) {
  closeDialog(refs.quickDialog);
  closeDialog(refs.exerciseDialog);
  const prompt = buildManualPrompt(kind, exercise);
  window.setTimeout(() => enqueuePrompt(prompt), 0);
}

function startLibraryActivity(activityId) {
  const activity = ACTIVITY_LIBRARY[activityId];
  if (!activity?.library) {
    throw new Error(`Activity is not available in the break library: ${activityId}`);
  }
  const { channelId, durationSeconds } = activity.library;
  closeDialog(refs.quickDialog);
  closeDialog(refs.exerciseDialog);
  const prompt = buildPrompt([channelId], "manual", {
    activities: { [channelId]: activityId },
    durations: { [channelId]: durationSeconds },
  });
  window.setTimeout(() => enqueuePrompt(prompt), 0);
}

function createLibraryCard(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "exercise-card";
  button.dataset.libraryId = item.id;

  const icon = document.createElement("span");
  icon.className = "exercise-icon";
  icon.append(createIcon(item.icon));

  const copy = document.createElement("span");
  const title = document.createElement("h3");
  title.textContent = item.title;
  const prompt = document.createElement("p");
  prompt.textContent = item.prompt;
  copy.append(title, prompt);

  const dose = document.createElement("span");
  dose.className = "exercise-dose";
  dose.textContent = item.dose;

  button.append(icon, copy, dose);
  button.addEventListener("click", item.onSelect);
  return button;
}

function renderBreakLibrary() {
  refs.exerciseList.replaceChildren();
  const activityItems = Object.entries(ACTIVITY_LIBRARY)
    .filter(([, activity]) => activity.library)
    .map(([activityId, activity]) => ({
      id: `activity:${activityId}`,
      title: activity.title,
      prompt: activity.detail,
      dose: formatDuration(activity.library.durationSeconds),
      icon: activity.icon,
      tags: activity.library.tags,
      onSelect: () => startLibraryActivity(activityId),
    }));
  const exerciseItems = EXERCISES.map((exercise) => ({
    id: `exercise:${exercise.id}`,
    title: exercise.title,
    prompt: exercise.prompt,
    dose: exercise.dose,
    icon: exercise.icon,
    tags: exercise.tags,
    onSelect: () => startQuickBreak("exercise", exercise),
  }));
  const groups = [
    { title: "Breaks and resets", items: activityItems },
    { title: "Guided movements", items: exerciseItems },
  ];

  for (const group of groups) {
    const visible = group.items.filter(
      (item) =>
        libraryFilter === "all" || item.tags.includes(libraryFilter),
    );
    if (visible.length === 0) {
      continue;
    }

    const section = document.createElement("section");
    section.className = "library-group";
    const heading = document.createElement("h3");
    heading.className = "library-group-title";
    heading.textContent = group.title;
    section.append(heading);
    for (const item of visible) {
      section.append(createLibraryCard(item));
    }
    refs.exerciseList.append(section);
  }
}

function renderNotificationState() {
  const permission = currentNotificationPermission();
  if (!state.settings.notificationsEnabled) {
    refs.browserNoteTitle.textContent = "Signals are quiet";
    refs.browserNoteText.textContent =
      "Browser notifications are off; the favicon and page title still change.";
    refs.notificationButton.textContent = "Turn notifications on";
    refs.notificationButton.disabled = false;
    refs.settingsNotificationStatus.textContent = "Off in Vulture Lite.";
    refs.settingsNotificationButton.textContent = "Enable";
    refs.settingsNotificationButton.disabled = false;
    return;
  }

  if (permission === "granted") {
    refs.browserNoteTitle.textContent = "Signals are ready";
    refs.browserNoteText.textContent =
      "Keep this tab open; notifications can reach you behind other tabs.";
    refs.notificationButton.textContent = "Notifications on";
    refs.notificationButton.disabled = true;
    refs.settingsNotificationStatus.textContent =
      "On while this page remains open.";
    refs.settingsNotificationButton.textContent = "Enabled";
    refs.settingsNotificationButton.disabled = true;
    return;
  }

  if (permission === "denied") {
    refs.browserNoteTitle.textContent = "Keep this tab visible or pinned";
    refs.browserNoteText.textContent =
      "Notifications are blocked; the favicon and page title still change.";
    refs.notificationButton.textContent = "Blocked in browser";
    refs.notificationButton.disabled = true;
    refs.settingsNotificationStatus.textContent =
      "Blocked in browser site permissions.";
    refs.settingsNotificationButton.textContent = "Blocked";
    refs.settingsNotificationButton.disabled = true;
    return;
  }

  if (permission === "unsupported") {
    refs.browserNoteTitle.textContent = "Keep this tab open";
    refs.browserNoteText.textContent =
      "Notifications are unavailable here; the favicon and title still signal.";
    refs.notificationButton.textContent = "Unavailable";
    refs.notificationButton.disabled = true;
    refs.settingsNotificationStatus.textContent =
      "Unavailable in this browser or connection.";
    refs.settingsNotificationButton.textContent = "Unavailable";
    refs.settingsNotificationButton.disabled = true;
    return;
  }

  refs.browserNoteTitle.textContent = "Keep this tab open";
  refs.browserNoteText.textContent =
    "Enable notifications so nudges can find you behind other tabs.";
  refs.notificationButton.textContent = "Enable notifications";
  refs.notificationButton.disabled = false;
  refs.settingsNotificationStatus.textContent = "Not enabled yet.";
  refs.settingsNotificationButton.textContent = "Enable";
  refs.settingsNotificationButton.disabled = false;
}

function phaseFor(now, withinSchedule, next) {
  if (activeBreak) {
    return "calm";
  }
  if (currentPrompt || promptQueue.length > 0) {
    return "due";
  }
  if (!state.runtime.running) {
    return "stopped";
  }
  if (isPaused(now)) {
    return "paused";
  }
  if (!withinSchedule) {
    return "off-hours";
  }
  if (!next) {
    return "stopped";
  }
  const remaining = next.dueAt - now;
  if (remaining <= 0) {
    return "due";
  }
  if (remaining <= nearWindowFor(next.reminder)) {
    return "near";
  }
  return "calm";
}

function setFavicon(phase) {
  const colors = {
    calm: "#285848",
    near: "#c4872f",
    due: "#c85d49",
    paused: "#7c827d",
    "off-hours": "#527b91",
    stopped: "#647169",
  };
  const color = colors[phase] ?? colors.calm;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="18" fill="${color}"/><path fill="#fbfaf5" d="M13 17h10l9 25 9-25h10L36.5 51h-9z"/></svg>`;
  refs.favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  refs.themeColor.content = color;
}

function renderInstrument(now = Date.now()) {
  const withinSchedule = isWithinWorkSchedule(
    state.settings.schedule,
    new Date(now),
  );
  const next = nextReminder(
    state.settings.reminders,
    state.runtime.nextDue,
  );
  const phase = phaseFor(now, withinSchedule, next);
  document.body.dataset.state = phase;
  setFavicon(phase);

  refs.pauseButton.hidden = true;
  refs.progressRing.setAttribute("stroke-dashoffset", "100");

  if (activeBreak && currentPrompt) {
    const remaining = Math.max(0, activeBreak.endAt - now);
    const total = Math.max(1, currentPrompt.durationSeconds * SECOND);
    const remainingRatio = Math.min(1, Math.max(0, remaining / total));
    refs.progressRing.setAttribute(
      "stroke-dashoffset",
      String(100 - remainingRatio * 100),
    );
    refs.stateEyebrow.textContent = "Taking a moment";
    refs.nextActivity.textContent = currentPrompt.title;
    refs.nextDetail.textContent =
      "The next reminder waits until you return to the workday.";
    refs.countdown.textContent = activeBreak.finished
      ? "Done"
      : formatCountdown(remaining);
    refs.countdownLabel.textContent = activeBreak.finished
      ? "return when ready"
      : "remaining in this moment";
    refs.instrumentStatus.lastChild.textContent =
      " Your schedule is giving this break room.";
    setPrimaryActionLabel("Open break");
    document.title = activeBreak.finished
      ? "Break complete · Vulture Lite"
      : `${formatCountdown(remaining)} · Taking a break`;
    announce(
      activeBreak.finished
        ? "Break complete. Return when ready."
        : "A break is in progress.",
    );
    return;
  }

  if (currentPrompt || promptQueue.length > 0) {
    refs.stateEyebrow.textContent = "A reminder is waiting";
    refs.nextActivity.textContent =
      currentPrompt?.title ?? promptQueue[0]?.title ?? "A small reset is due.";
    refs.nextDetail.textContent =
      "Open the reminder to start, snooze, or skip without judgement.";
    refs.countdown.textContent = "0:00";
    refs.countdownLabel.textContent = "ready now";
    refs.instrumentStatus.lastChild.textContent =
      " A single calm interruption is ready.";
    setPrimaryActionLabel("Open reminder");
    refs.pauseButton.hidden = false;
    setButtonLabel(refs.pauseButton, "Pause 30 min");
    document.title = "Break due · Vulture Lite";
    announce("A break reminder is ready.");
    return;
  }

  if (!state.runtime.running) {
    refs.stateEyebrow.textContent = "Your rhythm is ready";
    refs.nextActivity.textContent = "Begin when it suits you.";
    refs.nextDetail.textContent =
      "A balanced plan is prepared, and every setting is yours.";
    refs.countdown.textContent = "--:--";
    refs.countdownLabel.textContent = "until your plan starts";
    refs.instrumentStatus.lastChild.textContent =
      " Nothing leaves this browser.";
    setPrimaryActionLabel("Start my rhythm");
    document.title = "Vulture Lite";
    announce("Vulture Lite is ready to start.");
    return;
  }

  if (isPaused(now)) {
    const remaining = state.runtime.pausedUntil - now;
    refs.stateEyebrow.textContent = "Paused";
    refs.nextActivity.textContent = "A quiet interval.";
    refs.nextDetail.textContent =
      "Your plan will restart with fresh timers when the pause ends.";
    refs.countdown.textContent = formatCountdown(remaining);
    refs.countdownLabel.textContent = "until reminders resume";
    refs.instrumentStatus.lastChild.textContent =
      " No reminders will fire during this pause.";
    setPrimaryActionLabel("Take a break now");
    refs.pauseButton.hidden = false;
    setButtonLabel(refs.pauseButton, "Resume");
    document.title = `Paused ${formatCountdown(remaining)} · Vulture Lite`;
    announce("Reminders are paused.");
    return;
  }

  if (!withinSchedule) {
    const nextStart = nextScheduleStart(
      state.settings.schedule,
      new Date(now),
    );
    refs.stateEyebrow.textContent = "Outside your work hours";
    refs.nextActivity.textContent = "The schedule is resting.";
    refs.nextDetail.textContent = nextStart
      ? `It will begin fresh at ${formatClock(
          nextStart.getTime(),
          navigator.language,
        )}.`
      : "Choose active days in settings to restart it.";
    refs.countdown.textContent = nextStart
      ? formatCountdown(nextStart.getTime() - now)
      : "--:--";
    refs.countdownLabel.textContent = "until the next workday";
    refs.instrumentStatus.lastChild.textContent =
      " Manual quick breaks remain available.";
    setPrimaryActionLabel("Take a break now");
    document.title = "Off hours · Vulture Lite";
    announce("The reminder schedule is outside configured work hours.");
    return;
  }

  if (!next) {
    refs.stateEyebrow.textContent = "No active reminders";
    refs.nextActivity.textContent = "Your flight plan is empty.";
    refs.nextDetail.textContent =
      "Enable at least one reminder, or keep using manual quick breaks.";
    refs.countdown.textContent = "--:--";
    refs.countdownLabel.textContent = "no reminder scheduled";
    refs.instrumentStatus.lastChild.textContent =
      " Open settings to tune the plan.";
    setPrimaryActionLabel("Edit my plan");
    document.title = "No reminders · Vulture Lite";
    announce("No reminders are enabled.");
    return;
  }

  const remaining = Math.max(0, next.dueAt - now);
  const activity = peekActivity(next.id);
  const interval = next.reminder.intervalMinutes * MINUTE;
  const remainingRatio = Math.min(1, Math.max(0, remaining / interval));
  refs.progressRing.setAttribute(
    "stroke-dashoffset",
    String(100 - remainingRatio * 100),
  );
  refs.stateEyebrow.textContent = `${REMINDER_DEFINITIONS[next.id].label} next`;
  refs.nextActivity.textContent = activity.title;
  refs.nextDetail.textContent = `${formatClock(
    next.dueAt,
    navigator.language,
  )} · ${formatDuration(next.reminder.durationSeconds)} suggested`;
  refs.countdown.textContent = formatCountdown(remaining);
  refs.countdown.setAttribute(
    "datetime",
    `PT${Math.ceil(remaining / SECOND)}S`,
  );
  refs.countdownLabel.textContent =
    phase === "near" ? "almost time" : "until your next nudge";
  refs.instrumentStatus.lastChild.textContent =
    phase === "near"
      ? " The favicon is amber so this moment can be noticed quietly."
      : " This tab is holding the schedule locally.";
  setPrimaryActionLabel("Take a break now");
  refs.pauseButton.hidden = false;
  setButtonLabel(refs.pauseButton, "Pause 30 min");
  document.title =
    phase === "near"
      ? `${formatCountdown(remaining)} · ${activity.title}`
      : `${formatCountdown(remaining)} · Vulture Lite`;
  if (phase === "near") {
    announce(`${activity.title} is approaching.`);
  } else {
    announce(`Next reminder: ${activity.title}.`);
  }
}

function planTimeText(id, now, withinSchedule) {
  const reminder = state.settings.reminders[id];
  if (!reminder.enabled) {
    return { main: "Off", detail: "disabled" };
  }
  if (!state.runtime.running) {
    return { main: "Ready", detail: `every ${reminder.intervalMinutes} min` };
  }
  if (isPaused(now)) {
    return { main: "Paused", detail: `every ${reminder.intervalMinutes} min` };
  }
  if (!withinSchedule) {
    return {
      main: "Next workday",
      detail: `every ${reminder.intervalMinutes} min`,
    };
  }
  const dueAt = state.runtime.nextDue[id];
  return {
    main: Number.isFinite(Number(dueAt))
      ? formatClock(dueAt, navigator.language)
      : "Ready",
    detail: `every ${reminder.intervalMinutes} min`,
  };
}

function openSettingsForChannel(id = null) {
  populateSettingsForm();
  openDialog(refs.settingsDialog);
  if (!id) {
    return;
  }
  const focusTarget = {
    eyes: settingInputs.eyesInterval,
    movement: settingInputs.movementInterval,
    hydration: settingInputs.hydrationInterval,
    reset: settingInputs.resetInterval,
  }[id];
  window.setTimeout(() => focusTarget?.focus(), 120);
}

function renderPlan(now = Date.now()) {
  refs.planList.replaceChildren();
  const withinSchedule = isWithinWorkSchedule(
    state.settings.schedule,
    new Date(now),
  );

  for (const id of REMINDER_ORDER) {
    const definition = REMINDER_DEFINITIONS[id];
    const reminder = state.settings.reminders[id];
    const activity = peekActivity(id);
    const time = planTimeText(id, now, withinSchedule);

    const listItem = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "plan-item";
    if (!reminder.enabled) {
      button.classList.add("is-disabled");
    }
    button.addEventListener("click", () => openSettingsForChannel(id));

    const marker = document.createElement("span");
    marker.className = `plan-marker ${definition.tone}`;
    marker.append(createIcon(definition.icon));

    const copy = document.createElement("span");
    copy.className = "plan-copy";
    const title = document.createElement("strong");
    title.textContent = definition.label;
    const detail = document.createElement("small");
    detail.textContent = reminder.enabled
      ? activity.title
      : definition.description;
    copy.append(title, detail);

    const timing = document.createElement("span");
    timing.className = "plan-time";
    const clock = document.createElement("time");
    clock.textContent = time.main;
    const cadence = document.createElement("small");
    cadence.textContent = time.detail;
    timing.append(clock, cadence);

    button.append(marker, copy, timing);
    listItem.append(button);
    refs.planList.append(listItem);
  }
}

function renderHistory() {
  ensureToday();
  refs.historyCount.textContent = String(state.history.completed);
  refs.planHistoryCount.textContent = String(state.history.completed);
  const minutes = state.history.seconds / 60;
  const displayedMinutes =
    minutes > 0 && minutes < 1 ? "<1" : String(Math.round(minutes));
  refs.historyMinutes.textContent = displayedMinutes;
  refs.planHistoryMinutes.textContent = displayedMinutes;
  refs.recentMoments.replaceChildren();

  const recent = state.history.events.slice(-4).reverse();
  if (recent.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-moment";
    empty.textContent =
      "Your first completed break will appear here, on this device only.";
    refs.recentMoments.append(empty);
    return;
  }

  for (const event of recent) {
    const item = document.createElement("li");
    const iconName =
      event.status === "completed"
        ? "check"
        : event.status === "snoozed"
          ? "clock"
          : "x";
    item.append(createIcon(iconName));

    const label = document.createElement("span");
    const suffix =
      event.status === "completed"
        ? ""
        : event.status === "snoozed"
          ? " · snoozed"
          : " · skipped";
    label.textContent = `${event.label}${suffix}`;

    const time = document.createElement("time");
    time.dateTime = new Date(event.at).toISOString();
    time.textContent = formatClock(event.at, navigator.language);
    item.append(label, time);
    refs.recentMoments.append(item);
  }
}

function renderAll(now = Date.now()) {
  renderInstrument(now);
  renderPlan(now);
  renderHistory();
  renderNotificationState();
}

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(
    (input) => input.value,
  );
}

function setCheckedValues(name, values) {
  const selected = new Set(values);
  for (const input of document.querySelectorAll(`input[name="${name}"]`)) {
    input.checked = selected.has(input.value);
  }
}

function populateSettingsForm() {
  const {
    reminders,
    schedule,
    notificationsEnabled,
    soundEnabled,
  } = state.settings;
  settingInputs.eyesEnabled.checked = reminders.eyes.enabled;
  settingInputs.eyesInterval.value = reminders.eyes.intervalMinutes;
  settingInputs.eyesDuration.value = reminders.eyes.durationSeconds;
  settingInputs.movementEnabled.checked = reminders.movement.enabled;
  settingInputs.movementInterval.value = reminders.movement.intervalMinutes;
  settingInputs.movementDuration.value = Math.round(
    reminders.movement.durationSeconds / 60,
  );
  settingInputs.hydrationEnabled.checked = reminders.hydration.enabled;
  settingInputs.hydrationInterval.value =
    reminders.hydration.intervalMinutes;
  settingInputs.hydrationDuration.value =
    reminders.hydration.durationSeconds;
  settingInputs.resetEnabled.checked = reminders.reset.enabled;
  settingInputs.resetInterval.value = reminders.reset.intervalMinutes;
  settingInputs.resetDuration.value = Math.round(
    reminders.reset.durationSeconds / 60,
  );
  settingInputs.scheduleEnabled.checked = schedule.enabled;
  settingInputs.workStart.value = schedule.start;
  settingInputs.workEnd.value = schedule.end;
  settingInputs.notificationsEnabled.checked = notificationsEnabled;
  settingInputs.soundEnabled.checked = soundEnabled;

  setCheckedValues(
    "eyesActivity",
    reminders.eyes.activities.filter((activity) => activity !== "distance"),
  );
  setCheckedValues("movementActivity", reminders.movement.activities);
  setCheckedValues("resetActivity", reminders.reset.activities);
  setCheckedValues(
    "workday",
    schedule.days.map(String),
  );
  syncSettingsControls();
  renderNotificationState();
}

function syncReminderEditor(enabledInput) {
  const fieldset = enabledInput.closest(".reminder-editor");
  if (!fieldset) {
    return;
  }
  for (const input of fieldset.querySelectorAll("input")) {
    if (input !== enabledInput) {
      input.disabled = !enabledInput.checked;
    }
  }
}

function syncSettingsControls() {
  syncReminderEditor(settingInputs.eyesEnabled);
  syncReminderEditor(settingInputs.movementEnabled);
  syncReminderEditor(settingInputs.hydrationEnabled);
  syncReminderEditor(settingInputs.resetEnabled);
  const scheduleEnabled = settingInputs.scheduleEnabled.checked;
  settingInputs.workStart.disabled = !scheduleEnabled;
  settingInputs.workEnd.disabled = !scheduleEnabled;
  for (const input of document.querySelectorAll('input[name="workday"]')) {
    input.disabled = !scheduleEnabled;
  }
}

function normalizeActivityChoice(name, fallback, label) {
  const values = checkedValues(name);
  if (values.length > 0) {
    return values;
  }
  const fallbackInput = document.querySelector(
    `input[name="${name}"][value="${fallback}"]`,
  );
  if (fallbackInput) {
    fallbackInput.checked = true;
  }
  showToast(`${label} needs at least one activity, so one was kept on.`);
  return [fallback];
}

function saveSettingsFromForm() {
  const previousSettings = state.settings;
  let workdays = checkedValues("workday").map(Number);
  if (settingInputs.scheduleEnabled.checked && workdays.length === 0) {
    workdays = [1, 2, 3, 4, 5];
    setCheckedValues(
      "workday",
      workdays.map(String),
    );
    showToast("Quiet work hours need an active day, so weekdays were restored.");
  }

  const eyesActivities = [
    "distance",
    ...checkedValues("eyesActivity").filter(
      (activity) => activity !== "distance",
    ),
  ];
  const movementActivities = normalizeActivityChoice(
    "movementActivity",
    "position",
    "Movement",
  );
  const resetActivities = normalizeActivityChoice(
    "resetActivity",
    "walk",
    "Longer reset",
  );

  const nextSettings = {
    notificationsEnabled: settingInputs.notificationsEnabled.checked,
    soundEnabled: settingInputs.soundEnabled.checked,
    schedule: {
      enabled: settingInputs.scheduleEnabled.checked,
      start: settingInputs.workStart.value || "09:00",
      end: settingInputs.workEnd.value || "17:30",
      days: workdays,
    },
    reminders: {
      eyes: normalizeReminder(
        "eyes",
        {
          enabled: settingInputs.eyesEnabled.checked,
          intervalMinutes: settingInputs.eyesInterval.value,
          durationSeconds: settingInputs.eyesDuration.value,
          activities: eyesActivities,
        },
        previousSettings.reminders.eyes,
      ),
      movement: normalizeReminder(
        "movement",
        {
          enabled: settingInputs.movementEnabled.checked,
          intervalMinutes: settingInputs.movementInterval.value,
          durationSeconds: Number(settingInputs.movementDuration.value) * 60,
          activities: movementActivities,
        },
        previousSettings.reminders.movement,
      ),
      hydration: normalizeReminder(
        "hydration",
        {
          enabled: settingInputs.hydrationEnabled.checked,
          intervalMinutes: settingInputs.hydrationInterval.value,
          durationSeconds: settingInputs.hydrationDuration.value,
          activities: ["water"],
        },
        previousSettings.reminders.hydration,
      ),
      reset: normalizeReminder(
        "reset",
        {
          enabled: settingInputs.resetEnabled.checked,
          intervalMinutes: settingInputs.resetInterval.value,
          durationSeconds: Number(settingInputs.resetDuration.value) * 60,
          activities: resetActivities,
        },
        previousSettings.reminders.reset,
      ),
    },
  };

  const now = Date.now();
  for (const id of REMINDER_ORDER) {
    const previous = previousSettings.reminders[id];
    const next = nextSettings.reminders[id];
    if (
      previous.enabled !== next.enabled ||
      previous.intervalMinutes !== next.intervalMinutes
    ) {
      if (next.enabled) {
        state.runtime.nextDue[id] = now + next.intervalMinutes * MINUTE;
      } else {
        state.runtime.nextDue[id] = null;
      }
    }
  }

  const scheduleChanged =
    JSON.stringify(previousSettings.schedule) !==
    JSON.stringify(nextSettings.schedule);
  const notificationsWereEnabled = previousSettings.notificationsEnabled;
  const soundWasEnabled = previousSettings.soundEnabled;
  state.settings = nextSettings;
  if (
    scheduleChanged &&
    state.runtime.running &&
    isWithinWorkSchedule(nextSettings.schedule, new Date(now))
  ) {
    scheduleAll(now);
  }

  persistState();
  syncSettingsControls();
  renderAll(now);
  refs.settingsSaved.textContent = "Saved just now";
  window.clearTimeout(settingsSavedTimer);
  settingsSavedTimer = window.setTimeout(() => {
    refs.settingsSaved.textContent = "Saved on this device";
  }, 2_500);

  if (!soundWasEnabled && nextSettings.soundEnabled) {
    void playChime(true);
  }
  if (!notificationsWereEnabled && nextSettings.notificationsEnabled) {
    void requestNotificationPermission();
  }
}

function startRhythm() {
  if (enabledReminderIds().length === 0) {
    showToast("Enable at least one reminder before starting the rhythm.");
    openSettingsForChannel();
    return false;
  }
  const now = Date.now();
  state.runtime.running = true;
  state.runtime.pausedUntil = null;
  state.onboardingComplete = true;
  scheduleAll(now);
  state.runtime.lastHeartbeatAt = now;
  persistState();
  closeDialog(refs.onboardingDialog);
  renderAll(now);
  showToast("Your local rhythm is running. Keep this tab open.");
  return true;
}

async function startRhythmWithSignals() {
  if (!startRhythm()) {
    return;
  }
  if (state.settings.soundEnabled) {
    void playChime(true);
  }
  if (state.settings.notificationsEnabled) {
    await requestNotificationPermission();
  }
}

function startQuietly() {
  state.settings.notificationsEnabled = false;
  state.settings.soundEnabled = false;
  startRhythm();
}

function togglePause() {
  const now = Date.now();
  if (isPaused(now)) {
    state.runtime.pausedUntil = null;
    scheduleAll(now);
    showToast("Reminders resumed with fresh timers.");
  } else {
    state.runtime.pausedUntil = now + 30 * MINUTE;
    showToast("Paused for 30 minutes.");
  }
  persistState();
  renderAll(now);
}

function handlePrimaryAction() {
  if (currentPrompt) {
    if (!refs.breakDialog.open) {
      openDialog(refs.breakDialog);
    }
    return;
  }
  if (promptQueue.length > 0) {
    flushPromptQueue();
    return;
  }
  if (!state.runtime.running) {
    void startRhythmWithSignals();
    return;
  }
  if (enabledReminderIds().length === 0) {
    openSettingsForChannel();
    return;
  }
  openQuickDialog();
}

function exportSettings() {
  const exportValue = {
    product: "Vulture Lite",
    version: STATE_VERSION,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
  };
  const blob = new Blob([JSON.stringify(exportValue, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `vulture-lite-settings-${localDateKey()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Settings exported as JSON.");
}

function askForConfirmation({ title, text, action, onConfirm }) {
  refs.confirmTitle.textContent = title;
  refs.confirmText.textContent = text;
  refs.confirmAction.textContent = action;
  confirmationCallback = onConfirm;
  openDialog(refs.confirmDialog);
}

function clearToday() {
  state.history = createEmptyHistory();
  persistState();
  renderHistory();
  showToast("Today’s local trace was cleared.");
}

function confirmClearToday() {
  askForConfirmation({
    title: "Clear today’s trace?",
    text: "Completed, skipped, and snoozed moments for today will be removed from this browser.",
    action: "Clear today",
    onConfirm: clearToday,
  });
}

function clearAllData() {
  if (storageOperational) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Could not clear saved Vulture Lite data.", error);
      showToast("The browser would not clear its local data.");
      return;
    }
  }
  releaseLeadership();
  globalThis.location.reload();
}

function bindEvents() {
  byId("settingsButton").addEventListener("click", () =>
    openSettingsForChannel(),
  );
  byId("editPlanButton").addEventListener("click", () =>
    openSettingsForChannel(),
  );
  byId("evidenceButton").addEventListener("click", () =>
    openDialog(refs.evidenceDialog),
  );
  byId("footerEvidenceButton").addEventListener("click", () =>
    openDialog(refs.evidenceDialog),
  );
  refs.notificationButton.addEventListener("click", () => {
    void enableNotifications();
  });
  refs.settingsNotificationButton.addEventListener("click", () => {
    void enableNotifications();
  });
  refs.primaryAction.addEventListener("click", handlePrimaryAction);
  refs.pauseButton.addEventListener("click", togglePause);
  refs.mobileQuickButton.addEventListener("click", handlePrimaryAction);

  for (const button of document.querySelectorAll("[data-close]")) {
    button.addEventListener("click", () => {
      closeDialog(byId(button.dataset.close));
    });
  }

  for (const button of document.querySelectorAll("[data-quick]")) {
    button.addEventListener("click", () => {
      startQuickBreak(button.dataset.quick);
    });
  }

  const openBreakLibrary = () => {
    closeDialog(refs.quickDialog);
    renderBreakLibrary();
    window.setTimeout(() => openDialog(refs.exerciseDialog), 0);
  };
  byId("exerciseLibraryButton").addEventListener(
    "click",
    openBreakLibrary,
  );
  byId("quickLibraryButton").addEventListener("click", openBreakLibrary);

  for (const button of document.querySelectorAll("[data-library-filter]")) {
    button.addEventListener("click", () => {
      libraryFilter = button.dataset.libraryFilter;
      for (const sibling of document.querySelectorAll(
        "[data-library-filter]",
      )) {
        sibling.classList.toggle("is-active", sibling === button);
      }
      renderBreakLibrary();
    });
  }

  refs.settingsForm.addEventListener("change", saveSettingsFromForm);
  byId("exportButton").addEventListener("click", exportSettings);
  byId("settingsExportButton").addEventListener("click", exportSettings);
  byId("clearTodayButton").addEventListener("click", confirmClearToday);
  byId("planClearTodayButton").addEventListener("click", confirmClearToday);
  byId("clearDataButton").addEventListener("click", () => {
    askForConfirmation({
      title: "Clear all local data?",
      text: "Your plan, work hours, signal settings, and today’s trace will be removed from this browser.",
      action: "Clear everything",
      onConfirm: clearAllData,
    });
  });
  refs.confirmAction.addEventListener("click", () => {
    const callback = confirmationCallback;
    confirmationCallback = null;
    closeDialog(refs.confirmDialog);
    callback?.();
  });

  byId("onboardingNotify").addEventListener("click", () => {
    void startRhythmWithSignals();
  });
  byId("onboardingQuiet").addEventListener("click", startQuietly);
  byId("onboardingCustomize").addEventListener("click", () => {
    closeDialog(refs.onboardingDialog);
    window.setTimeout(() => openSettingsForChannel(), 0);
  });

  refs.startBreakButton.addEventListener("click", startBreak);
  refs.doneBreakButton.addEventListener("click", handleBreakDone);
  refs.snoozeBreakButton.addEventListener("click", snoozePrompt);
  refs.skipBreakButton.addEventListener("click", skipPrompt);
  refs.breakCloseButton.addEventListener("click", handleBreakClose);
  refs.swapExerciseButton.addEventListener("click", swapExercise);
  refs.breakDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    handleBreakClose();
  });

  for (const dialog of document.querySelectorAll("dialog")) {
    dialog.addEventListener("close", () => {
      window.setTimeout(flushPromptQueue, 0);
    });
  }

  document.addEventListener("visibilitychange", () => tick());
  globalThis.addEventListener("focus", () => tick());
  globalThis.addEventListener("beforeunload", () => {
    state.runtime.lastHeartbeatAt = Date.now();
    persistState();
    releaseLeadership();
  });
  globalThis.addEventListener("storage", (event) => {
    if (event.key === LEADER_KEY) {
      claimLeadership();
      return;
    }
    if (event.key !== STORAGE_KEY || !event.newValue) {
      return;
    }
    try {
      state = normalizeState(JSON.parse(event.newValue));
      renderAll();
    } catch (error) {
      console.warn("Ignoring unreadable state from another tab.", error);
    }
  });

  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type !== "SHOW_BREAK") {
      return;
    }
    globalThis.focus();
    if (currentPrompt && !refs.breakDialog.open && !getOpenDialog()) {
      openDialog(refs.breakDialog);
    } else {
      flushPromptQueue();
    }
  });
}

let lastWithinSchedule = isWithinWorkSchedule(
  state.settings.schedule,
  new Date(),
);

function tick(now = Date.now()) {
  const todayChanged = ensureToday(new Date(now));

  if (isLeader && leaderExpiresAt <= now) {
    isLeader = false;
  }

  if (
    state.runtime.pausedUntil &&
    state.runtime.pausedUntil <= now
  ) {
    state.runtime.pausedUntil = null;
    scheduleAll(now);
    persistState();
    showToast("The pause ended; reminders restarted with fresh timers.");
  }

  const withinSchedule = isWithinWorkSchedule(
    state.settings.schedule,
    new Date(now),
  );
  if (
    state.runtime.running &&
    !isPaused(now) &&
    !lastWithinSchedule &&
    withinSchedule
  ) {
    scheduleAll(now);
    persistState();
  }
  lastWithinSchedule = withinSchedule;

  if (todayChanged) {
    persistState();
  }

  triggerDueReminders(now);
  updateActiveBreak(now);
  renderAll(now);
}

function initialize() {
  const now = Date.now();
  ensureToday(new Date(now));

  const previousHeartbeat = state.runtime.lastHeartbeatAt;
  const reopenedAfterLongGap =
    state.runtime.running &&
    Number.isFinite(Number(previousHeartbeat)) &&
    now - Number(previousHeartbeat) > REOPEN_RESET_AFTER;

  if (
    reopenedAfterLongGap &&
    (!state.runtime.pausedUntil || state.runtime.pausedUntil <= now)
  ) {
    state.runtime.pausedUntil = null;
    scheduleAll(now);
    startupMessages.push(
      "Welcome back. Missed alerts were discarded and the rhythm restarted.",
    );
  } else if (state.runtime.running) {
    ensureSchedule(now);
  }

  state.runtime.lastHeartbeatAt = now;
  persistState();
  populateSettingsForm();
  renderBreakLibrary();
  bindEvents();
  claimLeadership();
  renderAll(now);
  void registerServiceWorker();

  if (!state.onboardingComplete) {
    window.setTimeout(() => openDialog(refs.onboardingDialog), 180);
  }
  if (startupMessages.length > 0) {
    window.setTimeout(() => showToast(startupMessages[0], 6_000), 420);
  }

  window.setInterval(() => tick(), SECOND);
  window.setInterval(claimLeadership, 4 * SECOND);
  window.setInterval(() => {
    state.runtime.lastHeartbeatAt = Date.now();
    persistState();
  }, HEARTBEAT_INTERVAL);
}

initialize();
