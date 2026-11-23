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
  for (let i = 1; i <= 7; i++) {
    const day = (now.getDay() + i) % 7;
    const upcoming = sortedLessons(schedule, day);
    if (upcoming.length > 0) {
      return { state: "after", current: null, next: upcoming[0], minutesLeft: null, nextDay: day };
    }
  }
  return { state: "after", current: null, next: null, minutesLeft: null, nextDay: null };
}

function formatMinutes(n) {
  const h = Math.floor(n / 60);
  const m = n % 60;
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

const DAY_NAMES = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
function dayName(weekday) {
  return DAY_NAMES[weekday];
}

if (typeof module !== "undefined") {
  module.exports = { getStatus, formatMinutes, dayName };
}
