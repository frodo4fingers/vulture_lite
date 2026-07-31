import test from "node:test";
import assert from "node:assert/strict";

import {
  ACTIVITY_LIBRARY,
  EXERCISES,
  REMINDER_DEFINITIONS,
  REMINDER_ORDER,
} from "../content.js";

test("the four recurring reminder channels remain intact", () => {
  assert.deepEqual(REMINDER_ORDER, [
    "eyes",
    "movement",
    "hydration",
    "reset",
  ]);
  assert.deepEqual(REMINDER_DEFINITIONS.hydration.defaultActivities, ["water"]);
  assert.deepEqual(REMINDER_DEFINITIONS.hydration.validActivities, ["water"]);
});

test("expanded defaults rotate restorative breaks without replacing water", () => {
  assert.deepEqual(REMINDER_DEFINITIONS.eyes.defaultActivities, [
    "distance",
    "nature",
    "blink",
    "eyes-closed",
  ]);
  assert.deepEqual(REMINDER_DEFINITIONS.reset.defaultActivities, [
    "coffee",
    "walk",
    "breathe",
    "offscreen",
    "exercise",
  ]);
  assert.ok(REMINDER_DEFINITIONS.movement.defaultActivities.includes("exercise"));
});

test("every browsable break maps to a valid reminder channel", () => {
  for (const [activityId, activity] of Object.entries(ACTIVITY_LIBRARY)) {
    assert.ok(activity.steps.length > 0, `${activityId} needs instructions`);
    assert.ok(activity.library, `${activityId} needs library metadata`);
    const definition = REMINDER_DEFINITIONS[activity.library.channelId];
    assert.ok(definition, `${activityId} has an unknown reminder channel`);
    assert.ok(
      definition.validActivities.includes(activityId),
      `${activityId} is not valid for ${activity.library.channelId}`,
    );
    assert.ok(activity.library.durationSeconds > 0);
    assert.ok(activity.library.tags.length > 0);
  }
});

test("the guided movement rotation includes every researched addition", () => {
  const ids = EXERCISES.map((exercise) => exercise.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of [
    "head-glide",
    "shoulder-blade-squeeze",
    "shoulder-roll",
    "finger-opening",
    "simple-resistance-circuit",
  ]) {
    assert.ok(ids.includes(id), `missing ${id}`);
  }
  for (const exercise of EXERCISES) {
    assert.ok(exercise.steps.length > 0, `${exercise.id} needs instructions`);
    assert.ok(exercise.tags.length > 0, `${exercise.id} needs filter tags`);
    assert.match(exercise.sourceUrl, /^https:\/\//);
  }
});
