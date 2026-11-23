// Виджет расписания для Scriptable (iPhone).
// Логика ниже чистая и тестируется в Node; отрисовка работает только в Scriptable.

// Расписание IVd. День недели как в Date.getDay(): 1 = Пн ... 5 = Пт.
// Сдвоенные уроки записаны одним уроком: начало первой пары, конец второй.
const SCHEDULE = {
  1: [
    { subject: "Рисование", room: "313", start: "08:05", end: "08:50" },
    { subject: "Математика", room: "303", start: "09:00", end: "09:45" },
    { subject: "Этика", room: "225", start: "09:55", end: "10:40" },
    { subject: "Литовский", room: "001", start: "10:50", end: "11:35" },
    { subject: "Физкультура", room: "127", start: "12:05", end: "12:50" },
    { subject: "Английский", room: "320", start: "13:10", end: "14:50" },
  ],
  2: [
    { subject: "Математика", room: "303", start: "09:55", end: "10:40" },
    { subject: "Литовский", room: "107", start: "10:50", end: "12:50" },
    { subject: "Русский", room: "225", start: "13:10", end: "14:50" },
  ],
  3: [
    { subject: "Классный час", room: "225", start: "08:05", end: "08:50" },
    { subject: "Физкультура", room: "127", start: "09:00", end: "09:45" },
    { subject: "Русский", room: "225", start: "09:55", end: "11:35" },
    { subject: "Математика", room: "303", start: "12:05", end: "13:55" },
    { subject: "Информатика", room: "318", start: "14:05", end: "14:50" },
  ],
  4: [
    { subject: "Литовский", room: "002", start: "10:50", end: "12:50" },
    { subject: "Информатика", room: "318", start: "13:10", end: "14:50" },
    { subject: "Английский", room: "320", start: "15:00", end: "15:45" },
  ],
  5: [
    { subject: "Литовский", room: "001", start: "09:55", end: "11:35" },
    { subject: "Математика", room: "303", start: "14:05", end: "15:45" },
  ],
};

// Значок и цвет каждого предмета.
const STYLES = {
  "Математика": { emoji: "📐", color: "#0A84FF" },
  "Литовский": { emoji: "🇱🇹", color: "#FFD60A" },
  "Английский": { emoji: "🇬🇧", color: "#BF5AF2" },
  "Русский": { emoji: "📖", color: "#FF453A" },
  "Физкультура": { emoji: "🏃", color: "#30D158" },
  "Информатика": { emoji: "💻", color: "#64D2FF" },
  "Рисование": { emoji: "🎨", color: "#FF9F0A" },
  "Этика": { emoji: "🤝", color: "#FF375F" },
  "Классный час": { emoji: "🏫", color: "#D4A373" },
};
const DEFAULT_STYLE = { emoji: "📚", color: "#8E8E93" };
function styleOf(lesson) {
  return (lesson && STYLES[lesson.subject]) || DEFAULT_STYLE;
}

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
    return { state: "lesson", current, next, minutesLeft: toMinutes(current.end) - t, nextDay: null };
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
const DAY_FULL = ["ВОСКРЕСЕНЬЕ", "ПОНЕДЕЛЬНИК", "ВТОРНИК", "СРЕДА", "ЧЕТВЕРГ", "ПЯТНИЦА", "СУББОТА"];
function dayName(weekday) {
  return DAY_NAMES[weekday];
}

// Всё, что рисует виджет: главный урок, подпись, прогресс, следующий урок, уроки дня.
function view(schedule, now) {
  const s = getStatus(schedule, now);
  const t = now.getHours() * 60 + now.getMinutes();
  const day = s.state === "after" ? s.nextDay : now.getDay();
  const list = day === null ? [] : sortedLessons(schedule, day);
  const main = s.current || s.next;
  const activeIndex = main ? list.indexOf(main) : -1;
  const next = activeIndex >= 0 ? list[activeIndex + 1] || null : null;

  let label = "УРОКОВ НЕТ";
  let hint = "";
  let progress = null;
  if (s.state === "lesson") {
    label = "СЕЙЧАС";
    hint = `ещё ${formatMinutes(s.minutesLeft)}`;
    const len = toMinutes(main.end) - toMinutes(main.start);
    progress = (t - toMinutes(main.start)) / len;
  } else if (s.state === "break") {
    label = "ПЕРЕМЕНА";
    hint = `ещё ${formatMinutes(s.minutesLeft)}`;
  } else if (s.state === "before") {
    label = "СЕГОДНЯ";
    hint = `через ${formatMinutes(s.minutesLeft)}`;
  } else if (main) {
    label = s.nextDay === (now.getDay() + 1) % 7 ? "ЗАВТРА" : DAY_FULL[s.nextDay];
  }
  return { label, hint, main, progress, next, list, activeIndex, minutesLeft: s.minutesLeft };
}

// ---------- Отрисовка (только Scriptable) ----------

const WHITE = (a) => new Color("#FFFFFF", a);

function progressBar(progress, color, width) {
  const h = 6;
  const dc = new DrawContext();
  dc.size = new Size(width, h);
  dc.opaque = false;
  dc.respectScreenScale = true;
  const bg = new Path();
  bg.addRoundedRect(new Rect(0, 0, width, h), 3, 3);
  dc.addPath(bg);
  dc.setFillColor(WHITE(0.18));
  dc.fillPath();
  const fg = new Path();
  fg.addRoundedRect(new Rect(0, 0, Math.max(h, width * progress), h), 3, 3);
  dc.addPath(fg);
  dc.setFillColor(new Color(color));
  dc.fillPath();
  return dc.getImage();
}

function text(stack, value, font, color, lines) {
  const t = stack.addText(value);
  t.font = font;
  t.textColor = color;
  t.lineLimit = lines || 1;
  t.minimumScaleFactor = 0.7;
  return t;
}

function addMainBlock(stack, v, barWidth) {
  const st = styleOf(v.main);
  const accent = new Color(st.color);

  const head = stack.addStack();
  head.centerAlignContent();
  text(head, v.label, Font.heavySystemFont(11), accent);
  head.addSpacer();
  if (v.hint) text(head, v.hint, Font.mediumSystemFont(11), WHITE(0.7));

  stack.addSpacer(8);
  if (!v.main) {
    text(stack, "Отдыхай 😎", Font.boldRoundedSystemFont(20), WHITE(1));
    return;
  }
  text(stack, `${st.emoji} ${v.main.subject}`, Font.boldRoundedSystemFont(19), WHITE(1), 2);
  stack.addSpacer(3);
  text(stack, `каб. ${v.main.room}`, Font.semiboldSystemFont(13), accent);
  text(stack, `${v.main.start} – ${v.main.end}`, Font.mediumMonospacedSystemFont(12), WHITE(0.75));

  if (v.progress !== null) {
    stack.addSpacer(6);
    const img = stack.addImage(progressBar(v.progress, st.color, barWidth));
    img.imageSize = new Size(barWidth, 6);
  }

  stack.addSpacer();
  if (v.next) {
    text(stack, "ДАЛЕЕ", Font.heavySystemFont(9), WHITE(0.45));
    text(
      stack,
      `${styleOf(v.next).emoji} ${v.next.subject} · ${v.next.start} · ${v.next.room}`,
      Font.mediumSystemFont(11),
      WHITE(0.85)
    );
  }
}

function addDayList(stack, v) {
  v.list.slice(0, 6).forEach((l, i) => {
    const active = i === v.activeIndex;
    const past = v.label !== "ЗАВТРА" && v.activeIndex >= 0 && i < v.activeIndex;
    const row = stack.addStack();
    row.centerAlignContent();
    row.setPadding(3, 6, 3, 6);
    row.cornerRadius = 6;
    if (active) row.backgroundColor = new Color(styleOf(l).color, 0.25);
    const alpha = past ? 0.35 : 1;
    text(row, l.start, Font.mediumMonospacedSystemFont(11), WHITE(0.6 * alpha));
    row.addSpacer(6);
    text(row, l.subject, Font.semiboldSystemFont(11), WHITE(alpha));
    row.addSpacer();
    text(row, l.room, Font.mediumMonospacedSystemFont(11), new Color(styleOf(l).color, alpha));
    stack.addSpacer(2);
  });
}

function background(v) {
  const g = new LinearGradient();
  g.colors = [new Color(styleOf(v.main).color, 0.45), new Color("#111114")];
  g.locations = [0, 0.75];
  g.startPoint = new Point(0, 0);
  g.endPoint = new Point(1, 1);
  return g;
}

function buildWidget(v, family) {
  const w = new ListWidget();
  const st = styleOf(v.main);

  if (family === "accessoryInline") {
    text(w, v.main ? `${st.emoji} ${v.main.subject} · ${v.main.room} · ${v.main.start}` : "Уроков нет", Font.systemFont(12), WHITE(1));
  } else if (family === "accessoryRectangular") {
    text(w, [v.label, v.hint].filter(Boolean).join(" · "), Font.heavySystemFont(11), WHITE(0.8));
    if (v.main) {
      text(w, `${st.emoji} ${v.main.subject}`, Font.boldRoundedSystemFont(15), WHITE(1));
      text(w, `каб. ${v.main.room} · ${v.main.start}–${v.main.end}`, Font.mediumSystemFont(12), WHITE(0.8));
    }
  } else {
    w.backgroundGradient = background(v);
    w.setPadding(14, 14, 14, 14);
    if (family === "medium" || family === "large") {
      const row = w.addStack();
      const left = row.addStack();
      left.layoutVertically();
      left.size = new Size(140, 0);
      addMainBlock(left, v, 140);
      row.addSpacer(12);
      const right = row.addStack();
      right.layoutVertically();
      addDayList(right, v);
    } else {
      addMainBlock(w, v, 130);
    }
  }

  const minutes = v.minutesLeft ? Math.max(1, Math.min(5, v.minutesLeft)) : 5;
  w.refreshAfterDate = new Date(Date.now() + minutes * 60000);
  return w;
}

if (typeof module !== "undefined") {
  module.exports = { getStatus, formatMinutes, dayName, view, SCHEDULE };
}

if (typeof Script !== "undefined") {
  const widget = buildWidget(view(SCHEDULE, new Date()), config.widgetFamily);
  if (config.runsInWidget) {
    Script.setWidget(widget);
    Script.complete();
  } else {
    widget.presentMedium().then(() => Script.complete());
  }
}
