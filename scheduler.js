export const SECOND = 1_000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;

export function clampNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(maximum, Math.max(minimum, parsed));
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseTimeToMinutes(value, fallback = 0) {
  if (!/^\d{2}:\d{2}$/.test(value ?? "")) {
    return fallback;
  }
  const [hours, minutes] = value.split(":").map(Number);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return fallback;
  }
  return hours * 60 + minutes;
}

export function isWithinWorkSchedule(schedule, date = new Date()) {
  if (!schedule.enabled) {
    return true;
  }

  const days = new Set(schedule.days);
  const start = parseTimeToMinutes(schedule.start, 9 * 60);
  const end = parseTimeToMinutes(schedule.end, 17 * 60 + 30);
  const current = date.getHours() * 60 + date.getMinutes();
  const today = date.getDay();

  if (start === end) {
    return days.has(today);
  }

  if (start < end) {
    return days.has(today) && current >= start && current < end;
  }

  if (current >= start) {
    return days.has(today);
  }

  const previousDay = (today + 6) % 7;
  return current < end && days.has(previousDay);
}

export function nextScheduleStart(schedule, date = new Date()) {
  if (!schedule.enabled) {
    return new Date(date);
  }

  const start = parseTimeToMinutes(schedule.start, 9 * 60);
  const allowedDays = new Set(schedule.days);

  for (let offset = 0; offset <= 8; offset += 1) {
    const candidate = new Date(date);
    candidate.setDate(date.getDate() + offset);
    candidate.setHours(Math.floor(start / 60), start % 60, 0, 0);
    if (allowedDays.has(candidate.getDay()) && candidate > date) {
      return candidate;
    }
  }

  return null;
}

export function enabledReminderEntries(reminders, nextDue) {
  return Object.entries(reminders)
    .filter(([, reminder]) => reminder.enabled)
    .map(([id, reminder]) => ({
      id,
      reminder,
      dueAt: Number(nextDue[id]),
    }))
    .filter((entry) => Number.isFinite(entry.dueAt))
    .sort((left, right) => left.dueAt - right.dueAt);
}

export function nextReminder(reminders, nextDue) {
  return enabledReminderEntries(reminders, nextDue)[0] ?? null;
}

export function collectReminderBundle(
  reminders,
  nextDue,
  now,
  bundleWindow = 90 * SECOND,
) {
  const entries = enabledReminderEntries(reminders, nextDue);
  if (entries.length === 0 || entries[0].dueAt > now) {
    return [];
  }

  const cutoff = now + bundleWindow;
  return entries.filter((entry) => entry.dueAt <= cutoff);
}

export function nearWindowFor(reminder) {
  const proportional = reminder.intervalMinutes * MINUTE * 0.1;
  return Math.min(2 * MINUTE, Math.max(MINUTE, proportional));
}

export function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / SECOND));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      seconds,
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds} sec`;
  }
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

export function formatClock(timestamp, locale) {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}
