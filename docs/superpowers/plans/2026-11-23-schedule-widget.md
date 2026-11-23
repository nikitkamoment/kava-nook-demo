# Виджет расписания (iPhone / Scriptable) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Виджет для iPhone, который показывает «что сейчас / что дальше» по школьному расписанию, с минутами до конца урока.

**Architecture:** Один файл `schedule-widget/schedule-widget.js` для приложения Scriptable. Чистая логика (какой сейчас урок) отделена от отрисовки и экспортируется через `module.exports`, поэтому её можно тестировать в Node. Отрисовка работает только внутри Scriptable. Расписание лежит константой в начале файла.

**Tech Stack:** JavaScript (Scriptable на iOS), Node `node:test` для тестов логики.

**Spec:** Отдельного документа нет, решения взяты из диалога и записаны ниже в Global Constraints. Это допущения, их нужно подтвердить: Mac нет, неделя всегда одинаковая (без чётных и нечётных), один и тот же звонковый график для всех дней.

## Global Constraints

- Платформа: iPhone, приложение Scriptable (бесплатное, App Store). Никаких зависимостей кроме Node для тестов.
- Один файл для копирования на телефон, без `require` и без внешних модулей.
- Дни недели как в `Date.getDay()`: 0 = воскресенье, 1 = понедельник ... 6 = суббота.
- Время урока хранится строкой `"HH:MM"` в 24-часовом формате, локальное время телефона.
- Весь текст в виджете на русском.
- Расписание редактируется только в константе `SCHEDULE` вверху файла.

## Review Focus

- Ровно в минуту конца урока (например 09:15): урок уже закончился, показывается перемена или следующий урок.
- Урок заканчивается ровно тогда, когда начинается следующий (нет перемены): сразу следующий урок, без «перемены 0 минут».
- Выходной или день без уроков: показывается первый урок ближайшего учебного дня с подписью «Пн» и т.д.
- После последнего урока дня: показывается завтрашний (или ближайший учебный) день.
- Уроки в `SCHEDULE` перечислены не по порядку времени: результат не должен зависеть от порядка.

---

## File Structure

- `schedule-widget/schedule-widget.js`: расписание, чистая логика, отрисовка виджета.
- `schedule-widget/schedule-widget.test.js`: тесты логики.
- `schedule-widget/README.md`: установка на телефон и как менять расписание.

### Task 1: Что сейчас и что дальше

**Files:**
- Create: `schedule-widget/schedule-widget.js`
- Test: `schedule-widget/schedule-widget.test.js`

**Interfaces:**
- Produces: `getStatus(schedule: Schedule, now: Date) -> Status`, где
  - `Lesson = { subject: string, room: string, start: string, end: string }`
  - `Schedule = { [weekday: number]: Lesson[] }`
  - `Status = { state: "lesson" | "break" | "before" | "after", current: Lesson | null, next: Lesson | null, minutesLeft: number | null, nextDay: number | null }`
  - `minutesLeft`: минут до конца текущего урока (state `lesson`) или до начала следующего (state `break`/`before`), иначе `null`.
  - `nextDay`: `null`, пока `next` относится к сегодняшнему дню.
- Exports: `module.exports = { getStatus }` только если `typeof module !== "undefined"`.

- [ ] **Step 1: Write the failing tests** в `schedule-widget.test.js` (`node:test`, `assert/strict`). Расписание в тесте: понедельник (1), уроки `Матем 08:30-09:15 к.204`, `Русский 09:25-10:10 к.101`, `Физика 10:10-10:55 к.305`. Проверки:
  - `getStatus(s, Пн 08:40)` -> `state "lesson"`, `current.subject "Матем"`, `next.subject "Русский"`, `minutesLeft 35`.
  - `Пн 09:15` -> `state "break"`, `next.subject "Русский"`, `minutesLeft 10` (граница: урок уже закончился).
  - `Пн 10:10` -> `state "lesson"`, `current.subject "Физика"` (перемены нет, урок идёт сразу).
  - `Пн 08:00` -> `state "before"`, `next.subject "Матем"`, `minutesLeft 30`.
  - Расписание с уроками в обратном порядке даёт тот же результат, что и в правильном.
- [ ] **Step 2: Run** `node --test schedule-widget/`. Expected: FAIL, `getStatus` не определён.
- [ ] **Step 3: Implement `getStatus`** в `schedule-widget.js`. Время переводится в минуты от начала суток, уроки дня сортируются по `start`, конец урока не включается в интервал (`start <= t < end`).
- [ ] **Step 4: Run** `node --test schedule-widget/`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: определять текущий и следующий урок`.

### Task 2: Другой день и подписи

**Files:**
- Modify: `schedule-widget/schedule-widget.js`
- Test: `schedule-widget/schedule-widget.test.js`

**Interfaces:**
- Consumes: `getStatus` из Task 1.
- Produces: `formatMinutes(n: number) -> string` (`5` -> `"5 мин"`, `75` -> `"1 ч 15 мин"`, `60` -> `"1 ч"`); `dayName(weekday: number) -> string` (`"Пн"`, `"Вт"`, `"Ср"`, `"Чт"`, `"Пт"`, `"Сб"`, `"Вс"`); экспорт обоих функций.

- [ ] **Step 1: Write the failing tests**:
  - Пн 11:00 (после последнего урока), во вторник есть уроки: `state "after"`, `next` равен первому уроку вторника, `nextDay 2`, `minutesLeft null`.
  - Суббота при расписании только Пн-Пт: `state "after"`, `nextDay 1`, `next` равен первому уроку понедельника.
  - Воскресенье 23:59 и понедельник 00:01 дают корректный результат (переход через полночь).
  - Расписание вообще без уроков: `state "after"`, `next null`, `nextDay null` (не падает).
  - `formatMinutes(5)`, `formatMinutes(75)`, `formatMinutes(60)`; `dayName(1)` и `dayName(0)`.
- [ ] **Step 2: Run** `node --test schedule-widget/`. Expected: FAIL.
- [ ] **Step 3: Implement** расширение `getStatus` (поиск ближайшего дня с уроками, максимум 7 шагов вперёд) и две функции форматирования.
- [ ] **Step 4: Run** `node --test schedule-widget/`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: показывать ближайший учебный день`.

### Task 3: Отрисовка виджета в Scriptable

**Files:**
- Modify: `schedule-widget/schedule-widget.js`

**Interfaces:**
- Consumes: `getStatus`, `formatMinutes`, `dayName`.
- Produces: `buildWidget(status: Status, family: string) -> ListWidget`; в конце файла блок `if (typeof Script !== "undefined")`, где вызывается `getStatus(SCHEDULE, new Date())`, строится виджет, он выставляется через `Script.setWidget` (или `.presentSmall()` при запуске из приложения), затем `Script.complete()`.

Отрисовка работает только в Scriptable, автотестов у неё нет, проверка вручную (Step 2).

- [ ] **Step 1: Implement `buildWidget`**. Тёмный фон. Состояния:
  - `lesson`: крупно предмет и аудитория, под ним «до конца: N мин», ниже строка «Дальше: предмет, время».
  - `break`: «Перемена, ещё N мин», «Дальше: предмет, аудитория».
  - `before`: «Уроки начнутся в HH:MM», первый урок.
  - `after`: «Уроков на сегодня нет. <Пн>: первый урок HH:MM, предмет».
  Семейства: `small` (только главное), `medium` (плюс список уроков дня), `accessoryRectangular` и `accessoryInline` (одна-две строки без фона). Обновление: `widget.refreshAfterDate` на ближайшую границу урока, но не позже чем через 5 минут.
- [ ] **Step 2: Проверить вручную**: скопировать файл в Scriptable, запустить, добавить виджет small, medium и на экран блокировки, подставив в `SCHEDULE` реальное расписание. Ожидаемо: корректный текущий урок, время обновляется.
- [ ] **Step 3: Run** `node --test schedule-widget/`. Expected: PASS (импорт файла в Node не должен падать из-за кода Scriptable).
- [ ] **Step 4: Commit** `feat: отрисовка виджета для Scriptable`.

### Task 4: Инструкция

**Files:**
- Create: `schedule-widget/README.md`

- [ ] **Step 1: Write README** на русском: установка Scriptable, создание скрипта и вставка кода, как добавить виджет на главный экран и экран блокировки, как менять `SCHEDULE` (пример одного дня), как запустить тесты (`node --test schedule-widget/`).
- [ ] **Step 2: Commit** `docs: инструкция по установке виджета`.

## Self-Review

- Что сейчас / что дальше, минуты до конца, аудитория: Task 1 и 3. Ближайший учебный день, выходные: Task 2. Экран блокировки: Task 3. Установка: Task 4.
- Имена и типы (`getStatus`, `Status`, `formatMinutes`, `dayName`, `buildWidget`) совпадают между задачами.
- Все пять пунктов Review Focus покрыты тестами в Task 1 и 2.
