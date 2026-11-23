// Виджет расписания для Scriptable (iPhone).
// Логика ниже чистая и тестируется в Node; отрисовка работает только в Scriptable.

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function sortedLessons(schedule, weekday) {
  return [...(schedule[weekday] || [])].sort(
    (a, b) => toMinutes(a.start) - toMinutes(b.start)
  );
}

function getStatus(schedule, now) {
  const t = now.getHours() * 60 + now.getMinutes();
  const lessons = sortedLessons(schedule, now.getDay());

  const current = lessons.find(
    (l) => toMinutes(l.start) <= t && t < toMinutes(l.end)
  );
  const next = lessons.find((l) => toMinutes(l.start) > t) || null;

  if (current) {
    return {
      state: "lesson",
      current,
      next,
      minutesLeft: toMinutes(current.end) - t,
      nextDay: null,
    };
  }
  if (next) {
    const hadLesson = lessons.some((l) => toMinutes(l.end) <= t);
    return {
      state: hadLesson ? "break" : "before",
      current: null,
      next,
      minutesLeft: toMinutes(next.start) - t,
      nextDay: null,
    };
  }
  return { state: "after", current: null, next: null, minutesLeft: null, nextDay: null };
}

if (typeof module !== "undefined") {
  module.exports = { getStatus };
}
