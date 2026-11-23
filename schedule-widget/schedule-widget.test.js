const test = require("node:test");
const assert = require("node:assert/strict");
const { getStatus, formatMinutes, dayName } = require("./schedule-widget.js");

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

const tue = [{ subject: "Литер", room: "1", start: "09:00", end: "09:45" }];
const week = { 1: mon, 2: tue };

test("after the last lesson: first lesson of the next school day", () => {
  const s = getStatus(week, at(11, 0));
  assert.equal(s.state, "after");
  assert.equal(s.next.subject, "Литер");
  assert.equal(s.nextDay, 2);
  assert.equal(s.minutesLeft, null);
});

test("weekend: wraps to the first lesson of the next week", () => {
  const sat = new Date(2026, 10, 28, 12, 0);
  const s = getStatus(week, sat);
  assert.equal(s.state, "after");
  assert.equal(s.next.subject, "Матем");
  assert.equal(s.nextDay, 1);
});

test("Sunday 23:59 points to Monday, Monday 00:01 is before the lessons", () => {
  const sun = getStatus(week, new Date(2026, 10, 29, 23, 59));
  assert.equal(sun.state, "after");
  assert.equal(sun.nextDay, 1);
  const monday = getStatus(week, new Date(2026, 10, 30, 0, 1));
  assert.equal(monday.state, "before");
  assert.equal(monday.next.subject, "Матем");
  assert.equal(monday.minutesLeft, 509);
});

test("empty schedule does not crash", () => {
  const s = getStatus({}, at(12, 0));
  assert.equal(s.state, "after");
  assert.equal(s.next, null);
  assert.equal(s.nextDay, null);
});

test("formatMinutes", () => {
  assert.equal(formatMinutes(5), "5 мин");
  assert.equal(formatMinutes(75), "1 ч 15 мин");
  assert.equal(formatMinutes(60), "1 ч");
});

test("dayName", () => {
  assert.equal(dayName(1), "Пн");
  assert.equal(dayName(0), "Вс");
});
