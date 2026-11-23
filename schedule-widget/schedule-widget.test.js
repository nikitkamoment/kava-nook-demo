const test = require("node:test");
const assert = require("node:assert/strict");
const { getStatus } = require("./schedule-widget.js");

// 2026-11-23 is a Monday.
const at = (h, m) => new Date(2026, 10, 23, h, m);

const mon = [
  { subject: "Матем", room: "204", start: "08:30", end: "09:15" },
  { subject: "Русский", room: "101", start: "09:25", end: "10:10" },
  { subject: "Физика", room: "305", start: "10:10", end: "10:55" },
];
const schedule = { 1: mon };

test("during a lesson: current, next and minutes to its end", () => {
  const s = getStatus(schedule, at(8, 40));
  assert.equal(s.state, "lesson");
  assert.equal(s.current.subject, "Матем");
  assert.equal(s.next.subject, "Русский");
  assert.equal(s.minutesLeft, 35);
  assert.equal(s.nextDay, null);
});

test("exactly at lesson end it is already a break", () => {
  const s = getStatus(schedule, at(9, 15));
  assert.equal(s.state, "break");
  assert.equal(s.current, null);
  assert.equal(s.next.subject, "Русский");
  assert.equal(s.minutesLeft, 10);
});

test("back-to-back lessons: no break, next lesson starts at once", () => {
  const s = getStatus(schedule, at(10, 10));
  assert.equal(s.state, "lesson");
  assert.equal(s.current.subject, "Физика");
});

test("before the first lesson", () => {
  const s = getStatus(schedule, at(8, 0));
  assert.equal(s.state, "before");
  assert.equal(s.next.subject, "Матем");
  assert.equal(s.minutesLeft, 30);
});

test("lesson order in the schedule does not matter", () => {
  const reversed = { 1: [...mon].reverse() };
  assert.deepEqual(getStatus(reversed, at(9, 15)), getStatus(schedule, at(9, 15)));
});
