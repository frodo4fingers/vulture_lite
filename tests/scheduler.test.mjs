import test from "node:test";
import assert from "node:assert/strict";

import {
  MINUTE,
  collectReminderBundle,
  formatCountdown,
  isWithinWorkSchedule,
  localDateKey,
  nextScheduleStart,
} from "../scheduler.js";

const weekdaySchedule = {
  enabled: true,
  days: [1, 2, 3, 4, 5],
  start: "09:00",
  end: "17:30",
};

test("work schedule includes weekdays within the configured window", () => {
  assert.equal(
    isWithinWorkSchedule(
      weekdaySchedule,
      new Date("2026-07-31T10:30:00"),
    ),
    true,
  );
  assert.equal(
    isWithinWorkSchedule(
      weekdaySchedule,
      new Date("2026-07-31T18:00:00"),
    ),
    false,
  );
  assert.equal(
    isWithinWorkSchedule(
      weekdaySchedule,
      new Date("2026-08-01T10:30:00"),
    ),
    false,
  );
});

test("overnight schedules attribute early hours to the previous day", () => {
  const overnight = {
    enabled: true,
    days: [1],
    start: "22:00",
    end: "06:00",
  };
  assert.equal(
    isWithinWorkSchedule(overnight, new Date("2026-07-27T23:00:00")),
    true,
  );
  assert.equal(
    isWithinWorkSchedule(overnight, new Date("2026-07-28T02:00:00")),
    true,
  );
  assert.equal(
    isWithinWorkSchedule(overnight, new Date("2026-07-28T23:00:00")),
    false,
  );
});

test("nearby due reminders are bundled while later reminders stay separate", () => {
  const now = Date.now();
  const reminders = {
    eyes: { enabled: true },
    movement: { enabled: true },
    water: { enabled: true },
  };
  const bundle = collectReminderBundle(
    reminders,
    {
      eyes: now - 1,
      movement: now + 45 * 1_000,
      water: now + 4 * MINUTE,
    },
    now,
  );
  assert.deepEqual(
    bundle.map((entry) => entry.id),
    ["eyes", "movement"],
  );
});

test("countdowns use stable tabular shapes", () => {
  assert.equal(formatCountdown(0), "0:00");
  assert.equal(formatCountdown(65_000), "1:05");
  assert.equal(formatCountdown(3_665_000), "1:01:05");
});

test("date keys use local calendar components", () => {
  assert.equal(localDateKey(new Date(2026, 6, 31, 23, 30)), "2026-07-31");
});

test("next schedule start skips disallowed days", () => {
  const fridayEvening = new Date("2026-07-31T18:00:00");
  const next = nextScheduleStart(weekdaySchedule, fridayEvening);
  assert.equal(next?.getDay(), 1);
  assert.equal(next?.getHours(), 9);
  assert.equal(next?.getMinutes(), 0);
});
