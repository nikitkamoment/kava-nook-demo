// Виджет расписания для Scriptable (iPhone).
// Логика ниже чистая и тестируется в Node; отрисовка работает только в Scriptable.

// Расписание IVd. День недели как в Date.getDay(): 1 = Пн ... 5 = Пт.
// Сдвоенные уроки записаны одним уроком: начало первой пары, конец второй.
// Меняй только этот блок.
const SCHEDULE = {
  1: [
    { subject: "Dailė", room: "313", start: "08:05", end: "08:50" },
    { subject: "Matematika", room: "303", start: "09:00", end: "09:45" },
    { subject: "Dorinis ugdymas", room: "225", start: "09:55", end: "10:40" },
    { subject: "Lietuvių kalba", room: "001", start: "10:50", end: "11:35" },
    { subject: "Fizinis ugdymas", room: "127", start: "12:05", end: "12:50" },
    { subject: "Anglų kalba", room: "320", start: "13:10", end: "14:50" },
  ],
  2: [
    { subject: "Matematika", room: "303", start: "09:55", end: "10:40" },
    { subject: "Lietuvių kalba", room: "107", start: "10:50", end: "12:50" },
    { subject: "Rusų kalba", room: "225", start: "13:10", end: "14:50" },
  ],
  3: [
    { subject: "Kl valanda", room: "225", start: "08:05", end: "08:50" },
    { subject: "Fizinis ugdymas", room: "127", start: "09:00", end: "09:45" },
    { subject: "Rusų kalba", room: "225", start: "09:55", end: "11:35" },
    { subject: "Matematika", room: "303", start: "12:05", end: "13:55" },
    { subject: "Informatika", room: "318", start: "14:05", end: "14:50" },
  ],
  4: [
    { subject: "Lietuvių kalba", room: "002", start: "10:50", end: "12:50" },
    { subject: "Informatika", room: "318", start: "13:10", end: "14:50" },
    { subject: "Anglų kalba", room: "320", start: "15:00", end: "15:45" },
  ],
  5: [
    { subject: "Lietuvių kalba", room: "001", start: "09:55", end: "11:35" },
    { subject: "Matematika", room: "303", start: "14:05", end: "15:45" },
  ],
};

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

function describe(status) {
  const { state, current, next, minutesLeft, nextDay } = status;
  if (state === "lesson") {
    return {
      title: current.subject,
      subtitle: `каб. ${current.room} · ещё ${formatMinutes(minutesLeft)}`,
      footer: next ? `Дальше: ${next.subject}, ${next.start}` : "Дальше: уроков сегодня нет",
    };
  }
  if (state === "break") {
    return {
      title: "Перемена",
      subtitle: `ещё ${formatMinutes(minutesLeft)}`,
      footer: `Дальше: ${next.subject}, каб. ${next.room}`,
    };
  }
  if (state === "before") {
    return { title: `Уроки с ${next.start}`, subtitle: `${next.subject}, каб. ${next.room}`, footer: "" };
  }
  if (next) {
    return { title: "Уроков больше нет", subtitle: `${dayName(nextDay)}: ${next.start}`, footer: next.subject };
  }
  return { title: "Уроков нет", subtitle: "", footer: "" };
}

function buildWidget(status, family) {
  const d = describe(status);
  const w = new ListWidget();
  const inline = family === "accessoryInline";
  const accessory = family && family.startsWith("accessory");
  if (!accessory) w.backgroundColor = new Color("#1c1c1e");
  const add = (text, size, bold, color) => {
    if (!text) return;
    const t = w.addText(text);
    t.font = bold ? Font.boldSystemFont(size) : Font.systemFont(size);
    if (!accessory) t.textColor = new Color(color || "#ffffff");
    t.minimumScaleFactor = 0.6;
  };
  if (inline) {
    add([d.title, d.subtitle].filter(Boolean).join(" · "), 12, false);
  } else if (accessory) {
    add(d.title, 14, true);
    add(d.subtitle, 12, false);
    add(d.footer, 11, false);
  } else {
    add(d.title, family === "small" ? 20 : 24, true);
    add(d.subtitle, 15, false, "#ffd60a");
    w.addSpacer();
    add(d.footer, 13, false, "#8e8e93");
  }
  const minutes = status.minutesLeft ? Math.max(1, Math.min(5, status.minutesLeft)) : 5;
  w.refreshAfterDate = new Date(Date.now() + minutes * 60000);
  return w;
}

if (typeof module !== "undefined") {
  module.exports = { getStatus, formatMinutes, dayName, describe, SCHEDULE };
}

if (typeof Script !== "undefined") {
  const widget = buildWidget(getStatus(SCHEDULE, new Date()), config.widgetFamily);
  if (config.runsInWidget) {
    Script.setWidget(widget);
    Script.complete();
  } else {
    widget.presentSmall().then(() => Script.complete());
  }
}
