const taskInput = document.getElementById("taskInput");
const addTaskButton = document.getElementById("addTask");
const scheduleList = document.getElementById("schedule");
const reminderList = document.getElementById("reminders");
const chatInput = document.getElementById("chatInput");
const askButton = document.getElementById("askButton");
const chatOutput = document.getElementById("chatOutput");
const clockEl = document.getElementById("clock");
const apiKeyInput = document.getElementById("apiKeyInput");
const saveApiKeyButton = document.getElementById("saveApiKey");

const todoList = document.getElementById("todoList");
const progressList = document.getElementById("progressList");
const doneList = document.getElementById("doneList");

const clientName = document.getElementById("clientName");
const clientContact = document.getElementById("clientContact");
const fileName = document.getElementById("fileName");
const fileDetails = document.getElementById("fileDetails");
const clientNotes = document.getElementById("clientNotes");
const addClientButton = document.getElementById("addClient");
const clientList = document.getElementById("clientList");

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

const STORAGE_KEYS = {
  tasks: "smartOfficeTasks",
  clients: "smartOfficeClients",
  apiKey: "openaiApiKey",
};

const tasks = loadStoredData(STORAGE_KEYS.tasks, []);
const clients = loadStoredData(STORAGE_KEYS.clients, []);
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

function loadStoredData(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveStoredData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

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
    status: "todo",
    createdAt: new Date().toISOString(),
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

function renderBoard() {
  todoList.innerHTML = "";
  progressList.innerHTML = "";
  doneList.innerHTML = "";

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${task.title}</strong>
      <span class="meta">${formatTime(task.time)} · ${task.location}</span>
      <div class="status-actions">
        <button data-status="todo">To Do</button>
        <button data-status="progress">In Progress</button>
        <button data-status="done">Done</button>
      </div>
    `;

    li.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        task.status = button.dataset.status;
        saveStoredData(STORAGE_KEYS.tasks, tasks);
        renderBoard();
        renderSchedule();
      });
    });

    if (task.status === "progress") {
      progressList.appendChild(li);
    } else if (task.status === "done") {
      doneList.appendChild(li);
    } else {
      todoList.appendChild(li);
    }
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
  saveStoredData(STORAGE_KEYS.tasks, tasks);
  taskInput.value = "";
  renderSchedule();
  renderBoard();
  scheduleReminders();
  chatOutput.textContent = `Samajh gaya: ${newTask.title} (${formatTime(newTask.time)}, ${newTask.location}).`;
}

function renderClients() {
  clientList.innerHTML = "";
  clients.forEach((client) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${client.name}</strong>
      <span class="meta">${client.contact}</span>
      <span class="badge">${client.fileName}</span>
      <span class="meta">${client.fileDetails}</span>
      <span class="meta">${client.notes}</span>
    `;
    clientList.appendChild(li);
  });
}

function addClient() {
  if (!clientName.value.trim()) return;
  const client = {
    id: crypto.randomUUID(),
    name: clientName.value.trim(),
    contact: clientContact.value.trim() || "-",
    fileName: fileName.value.trim() || "-",
    fileDetails: fileDetails.value.trim() || "-",
    notes: clientNotes.value.trim() || "-",
    createdAt: new Date().toISOString(),
  };

  clients.push(client);
  saveStoredData(STORAGE_KEYS.clients, clients);
  clientName.value = "";
  clientContact.value = "";
  fileName.value = "";
  fileDetails.value = "";
  clientNotes.value = "";
  renderClients();
}

function saveApiKey() {
  const value = apiKeyInput.value.trim();
  if (!value) return;
  localStorage.setItem(STORAGE_KEYS.apiKey, value);
  apiKeyInput.value = "";
  chatOutput.textContent = "API key saved. Ab aap ChatGPT se baat kar sakte ho.";
}

function getApiKey() {
  return localStorage.getItem(STORAGE_KEYS.apiKey);
}

async function handleChat() {
  const query = chatInput.value.trim();
  if (!query) return;
  chatOutput.textContent = "Thinking...";

  const apiKey = getApiKey();
  if (!apiKey) {
    chatOutput.textContent = "API key nahi mila. Pehle key save karo.";
    return;
  }

  const payload = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a Hinglish office planner assistant. Reply in simple Hinglish. Summarize tasks, reminders, and client data clearly.",
      },
      {
        role: "user",
        content: `User query: ${query}\n\nTasks: ${JSON.stringify(tasks)}\nClients: ${JSON.stringify(clients)}`,
      },
    ],
  };

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    chatOutput.textContent = data.choices?.[0]?.message?.content || "No response.";
  } catch (error) {
    chatOutput.textContent = `Error: ${error.message}`;
  }
}

function initTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      panels.forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });
}

addTaskButton.addEventListener("click", addTask);
askButton.addEventListener("click", handleChat);
saveApiKeyButton.addEventListener("click", saveApiKey);
addClientButton.addEventListener("click", addClient);

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

apiKeyInput.value = getApiKey() ? "********" : "";

renderSchedule();
renderBoard();
renderClients();
scheduleReminders();
initTabs();
