"use strict";

// CyberKey - Educational keyboard activity monitor.
// Events are recorded only inside the designated text area.

const $ = (selector) => document.querySelector(selector);

const input = $("#keyboardInput");
const startBtn = $("#startBtn");
const stopBtn = $("#stopBtn");
const clearInputBtn = $("#clearInputBtn");
const downloadBtn = $("#downloadBtn");
const clearLogsBtn = $("#clearLogsBtn");
const searchInput = $("#searchInput");
const typeFilter = $("#typeFilter");

const state = {
    active: false,
    startedAt: null,
    logs: []
};

const specialKeys = new Set([
    "Enter", "Tab", "Backspace", "Delete",
    "Escape", "ArrowUp", "ArrowDown",
    "ArrowLeft", "ArrowRight", "Home",
    "End", "PageUp", "PageDown",
    "Insert", "CapsLock", "Shift",
    "Control", "Alt", "Meta",
    "Space", " ", "F1", "F2", "F3", "F4",
    "F5", "F6", "F7", "F8", "F9", "F10",
    "F11", "F12"
]);

function getKeyType(key) {
    return key.length === 1 && !specialKeys.has(key)
        ? "character"
        : "special";
}

function formatTime(date) {
    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function formatDateTime(date) {
    return date.toLocaleString();
}

function updateClock() {
    const now = new Date();

    $("#clock").textContent = formatTime(now);
    $("#today").textContent = now.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function updateStatus() {
    $("#sessionStatus").textContent = state.active
        ? "Active"
        : "Idle";

    $("#sessionFoot").textContent = state.active
        ? "Recording in this text area"
        : "Waiting to start";

    $("#livePill").classList.toggle("active", state.active);

    $("#liveText").textContent = state.active
        ? "RECORDING"
        : "INACTIVE";

    $("#statusDot")?.classList.toggle("active", state.active);

    input.disabled = !state.active;
    startBtn.disabled = state.active;
    stopBtn.disabled = !state.active;

    $("#inputHint").textContent = state.active
        ? "Recording enabled for this input area."
        : "Start monitoring to begin your test.";
}

function updateStatistics() {
    const characterCount = state.logs.filter(
        log => log.type === "character"
    ).length;

    const specialCount = state.logs.filter(
        log => log.type === "special"
    ).length;

    $("#totalEvents").textContent = state.logs.length;
    $("#characterEvents").textContent = characterCount;
    $("#specialEvents").textContent = specialCount;
    $("#inputCount").textContent =
        `${input.value.length} character${input.value.length === 1 ? "" : "s"}`;
}

function startMonitoring() {
    if (state.active) return;

    state.active = true;
    state.startedAt = new Date();

    updateStatus();
    input.focus();
}

function stopMonitoring() {
    if (!state.active) return;

    state.active = false;

    updateStatus();
    renderLogs();
}

function recordKey(event) {
    if (!state.active || event.isComposing) return;

    // Ignore held-key auto-repeat so one held key does not flood the log.
    if (event.repeat) return;

    const now = new Date();
    const type = getKeyType(event.key);

    const entry = {
        id: state.logs.length + 1,
        key: event.key === " " ? "Space" : event.key,
        code: event.code || "Unknown",
        type,
        time: now,
        searchable: `${event.key} ${event.code} ${type}`.toLowerCase()
    };

    state.logs.push(entry);

    $("#lastKey").textContent = entry.key;
    $("#lastKeyName").textContent = `Key detected: ${entry.key}`;
    $("#lastKeyTime").textContent = formatDateTime(now);

    updateStatistics();
    renderLogs();
}

function renderLogs() {
    const query = searchInput.value.trim().toLowerCase();
    const filter = typeFilter.value;

    const filtered = state.logs.filter(log => {
        const matchesSearch =
            log.searchable.includes(query) ||
            log.time.toLocaleString().toLowerCase().includes(query);

        const matchesType =
            filter === "all" || log.type === filter;

        return matchesSearch && matchesType;
    });

    const tbody = $("#logTableBody");
    tbody.replaceChildren();

    if (filtered.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.className = "empty-cell";

        const icon = document.createElement("span");
        icon.className = "empty-icon";
        icon.textContent = "⌕";

        const title = document.createElement("strong");
        title.textContent = state.logs.length
            ? "No matching events"
            : "No events yet";

        const description = document.createElement("p");
        description.textContent = state.logs.length
            ? "Try changing your search or filter."
            : "Start monitoring and type in the input area.";

        cell.append(icon, title, description);
        row.appendChild(cell);
        tbody.appendChild(row);
    } else {
        // Newest events first.
        filtered.slice().reverse().forEach(log => {
            const row = document.createElement("tr");

            const values = [
                { text: `#${log.id}`, className: "event-number" },
                { text: log.key, className: "key-name" },
                { text: log.code, className: "code-text" }
            ];

            values.forEach(item => {
                const cell = document.createElement("td");
                cell.textContent = item.text;
                cell.className = item.className;
                row.appendChild(cell);
            });

            const typeCell = document.createElement("td");
            const badge = document.createElement("span");

            badge.className = `type-tag type-${log.type}`;
            badge.textContent = log.type === "character"
                ? "CHARACTER"
                : "SPECIAL";

            typeCell.appendChild(badge);
            row.appendChild(typeCell);

            const timeCell = document.createElement("td");
            timeCell.textContent = formatTime(log.time);
            row.appendChild(timeCell);

            tbody.appendChild(row);
        });
    }

    $("#tableSummary").textContent =
        `Showing ${filtered.length} of ${state.logs.length} events`;
}

function clearInput() {
    input.value = "";
    updateStatistics();

    if (state.active) {
        input.focus();
    }
}

function clearLogs() {
    if (state.logs.length === 0) return;

    const confirmed = window.confirm(
        "Clear all recorded activity logs from this session?"
    );

    if (!confirmed) return;

    state.logs = [];

    $("#lastKey").textContent = "—";
    $("#lastKeyName").textContent = "No key detected";
    $("#lastKeyTime").textContent = "Start a session to see activity.";

    updateStatistics();
    renderLogs();
}

function downloadReport() {
    if (state.logs.length === 0) {
        window.alert("No events to export. Start a session and type first.");
        return;
    }

    const header = [
        "Event",
        "Key",
        "Code",
        "Type",
        "Timestamp"
    ];

    const rows = state.logs.map(log => [
        log.id,
        log.key,
        log.code,
        log.type,
        formatDateTime(log.time)
    ]);

    // Escape CSV cells correctly.
    const csvCell = value =>
        `"${String(value).replace(/"/g, '""')}"`;

    const csv = [header, ...rows]
        .map(row => row.map(csvCell).join(","))
        .join("\r\n");

    const blob = new Blob(
        ["\uFEFF", csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "cyberkey-activity-report.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    // Revoke after the browser has started the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Event listeners
startBtn.addEventListener("click", startMonitoring);
stopBtn.addEventListener("click", stopMonitoring);

input.addEventListener("keydown", recordKey);
input.addEventListener("input", updateStatistics);

clearInputBtn.addEventListener("click", clearInput);
clearLogsBtn.addEventListener("click", clearLogs);
downloadBtn.addEventListener("click", downloadReport);

searchInput.addEventListener("input", renderLogs);
typeFilter.addEventListener("change", renderLogs);

// Update the live clock.
updateClock();
window.setInterval(updateClock, 1000);

// Initial UI
updateStatus();
updateStatistics();
renderLogs();