const taskInput = document.getElementById("taskInput");
const addTaskButton = document.getElementById("addTask");
const scheduleList = document.getElementById("schedule");
const reminderList = document.getElementById("reminders");
const chatInput = document.getElementById("chatInput");
const askButton = document.getElementById("askButton");
const chatOutput = document.getElementById("chatOutput");
const clockEl = document.getElementById("clock");

const tasks = [];
let reminderTimers = [];

const LOCATION_HINTS = [
  { key: "conference", label: "Conference Room" },
  { key: "cabin", label: "Cabin" },
  { key: "desk", label: "Desk" },
  { key: "reception", label: "Reception" },
  { key: "cafeteria", label: "Cafeteria" },
];

const CATEGORY_HINTS = [
  { key: "meeting", label: "Meeting" },
  { key: "call", label: "Call" },
  { key: "follow", label: "Follow-up" },
  { key: "report", label: "Report" },
  { key: "break", label: "Break" },
];

const TIME_REGEX = /(\b\d{1,2})(?::(\d{2}))?\s?(am|pm)?/i;

function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

setInterval(updateClock, 1000);
updateClock();

function parseTask(text) {
  const lower = text.toLowerCase();
  const timeMatch = lower.match(TIME_REGEX);
  let hour = null;
  let minute = 0;
  let meridiem = null;

  if (timeMatch) {
    hour = Number(timeMatch[1]);
    minute = timeMatch[2] ? Number(timeMatch[2]) : 0;
    meridiem = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

    if (meridiem === "pm" && hour < 12) {
      hour += 12;
    }
    if (meridiem === "am" && hour === 12) {
      hour = 0;
    }
  }

  const location =
    LOCATION_HINTS.find((item) => lower.includes(item.key))?.label ||
    "Office";
  const category =
    CATEGORY_HINTS.find((item) => lower.includes(item.key))?.label ||
    "General";

  const title = text.replace(TIME_REGEX, "").trim() || "Untitled task";

  return {
    id: crypto.randomUUID(),
    raw: text,
    title,
    time: hour !== null ? { hour, minute } : null,
    location,
    category,
    createdAt: new Date(),
  };
}

function formatTime(time) {
  if (!time) return "Flexible";
  const date = new Date();
  date.setHours(time.hour, time.minute, 0, 0);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortTasks(list) {
  return [...list].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    const minutesA = a.time.hour * 60 + a.time.minute;
    const minutesB = b.time.hour * 60 + b.time.minute;
    return minutesA - minutesB;
  });
}

function renderSchedule() {
  scheduleList.innerHTML = "";
  const sorted = sortTasks(tasks);
  sorted.forEach((task) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${task.title}</strong>
      <span class="meta">${formatTime(task.time)} · ${task.location}</span>
      <span class="badge">${task.category}</span>
    `;
    scheduleList.appendChild(li);
  });
}

function clearReminders() {
  reminderTimers.forEach((timer) => clearTimeout(timer));
  reminderTimers = [];
}

function scheduleReminders() {
  clearReminders();
  reminderList.innerHTML = "";
  const now = new Date();
  sortTasks(tasks).forEach((task) => {
    const li = document.createElement("li");
    if (!task.time) {
      li.innerHTML = `
        <strong>${task.title}</strong>
        <span class="meta">Flexible task, reminder jab aap dekho.</span>
      `;
      reminderList.appendChild(li);
      return;
    }

    const reminderTime = new Date();
    reminderTime.setHours(task.time.hour, task.time.minute, 0, 0);
    const diff = reminderTime.getTime() - now.getTime();

    const message = `Reminder: ${task.title} at ${formatTime(task.time)} (${task.location})`;
    li.innerHTML = `
      <strong>${task.title}</strong>
      <span class="meta">Reminder set for ${formatTime(task.time)}</span>
    `;
    reminderList.appendChild(li);

    if (diff > 0) {
      const timer = setTimeout(() => {
        alert(message);
      }, diff);
      reminderTimers.push(timer);
    }
  });
}

function addTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  const newTask = parseTask(text);
  tasks.push(newTask);
  taskInput.value = "";
  renderSchedule();
  scheduleReminders();
  chatOutput.textContent = `Samajh gaya: ${newTask.title} (${formatTime(newTask.time)}, ${newTask.location}).`;
}

function handleChat() {
  const query = chatInput.value.trim().toLowerCase();
  if (!query) return;

  if (query.includes("sari details") || query.includes("all tasks") || query.includes("details")) {
    if (!tasks.length) {
      chatOutput.textContent = "Abhi koi task nahi hai.";
      return;
    }
    const details = sortTasks(tasks)
      .map(
        (task, index) =>
          `${index + 1}. ${task.title} | ${formatTime(task.time)} | ${task.location} | ${task.category}`
      )
      .join("\n");
    chatOutput.textContent = `Aaj ki sari details:\n${details}`;
    return;
  }

  if (query.includes("next") || query.includes("agla")) {
    const nextTask = sortTasks(tasks).find((task) => task.time);
    chatOutput.textContent = nextTask
      ? `Agla task: ${nextTask.title} at ${formatTime(nextTask.time)} (${nextTask.location}).`
      : "Koi timed task nahi mila.";
    return;
  }

  chatOutput.textContent =
    "Main schedule check kar raha hoon. Aap 'sari details' ya 'next' puch sakte ho.";
}

addTaskButton.addEventListener("click", addTask);
askButton.addEventListener("click", handleChat);

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleChat();
  }
});

taskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    addTask();
  }
});
