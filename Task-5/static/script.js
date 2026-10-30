
const interfaceSelect = document.getElementById("interfaceSelect");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");
const protocolFilter = document.getElementById("protocolFilter");
const packetTableBody = document.getElementById("packetTableBody");
const messageBox = document.getElementById("message");

let latestPackets = [];
let pollTimer = null;

function showMessage(message, type = "") {
    messageBox.textContent = message;
    messageBox.className = "message";

    if (type) {
        messageBox.classList.add(type);
    }
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
}

async function loadInterfaces() {
    try {
        const data = await apiRequest("/api/interfaces");

        interfaceSelect.replaceChildren();

        if (!data.interfaces || data.interfaces.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No interfaces found";
            interfaceSelect.appendChild(option);
            showMessage("No network interfaces found. Check your network adapter and Npcap installation.", "error");
            return;
        }

        data.interfaces.forEach((name) => {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            interfaceSelect.appendChild(option);
        });

        showMessage("Network interfaces loaded. Select one to begin.", "success");
    } catch (error) {
        showMessage("Could not load network interfaces: " + error.message, "error");
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value === null || value === undefined || value === ""
        ? "—"
        : String(value);
    return cell;
}

function renderPackets(packets) {
    const selectedProtocol = protocolFilter.value;

    const filteredPackets = selectedProtocol === "ALL"
        ? packets
        : packets.filter(packet => packet.protocol === selectedProtocol);

    packetTableBody.replaceChildren();

    if (filteredPackets.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 7;
        cell.className = "empty-state";
        cell.textContent = packets.length === 0
            ? "No packets captured yet. Start capture to monitor traffic."
            : "No packets match the selected protocol.";

        row.appendChild(cell);
        packetTableBody.appendChild(row);
    } else {
        filteredPackets.forEach(packet => {
            const row = document.createElement("tr");

            row.appendChild(createCell(packet.timestamp));

            const protocolCell = document.createElement("td");
            const badge = document.createElement("span");
            badge.className = "protocol-tag " + packet.protocol.toLowerCase();
            badge.textContent = packet.protocol;
            protocolCell.appendChild(badge);
            row.appendChild(protocolCell);

            row.appendChild(createCell(packet.source));
            row.appendChild(createCell(packet.destination));
            row.appendChild(createCell(packet.source_port));
            row.appendChild(createCell(packet.destination_port));
            row.appendChild(createCell(formatBytes(packet.size)));

            packetTableBody.appendChild(row);
        });
    }

    document.getElementById("packetCountLabel").textContent =
        `Showing ${filteredPackets.length} of ${packets.length} packets`;
}

function renderProtocols(counts) {
    const container = document.getElementById("protocolDistribution");
    container.replaceChildren();

    const entries = Object.entries(counts || {})
        .sort((a, b) => b[1] - a[1]);

    document.getElementById("protocolTotal").textContent = entries.length;

    if (entries.length === 0) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "No packets captured yet.";
        container.appendChild(empty);
        return;
    }

    const maxCount = Math.max(...entries.map(entry => entry[1]), 1);

    entries.forEach(([protocol, count]) => {
        const item = document.createElement("div");
        item.className = "protocol-item";

        const meta = document.createElement("div");
        meta.className = "protocol-meta";

        const name = document.createElement("span");
        name.className = "protocol-name";
        name.textContent = protocol;

        const number = document.createElement("span");
        number.className = "protocol-number";
        number.textContent = count;

        meta.append(name, number);

        const track = document.createElement("div");
        track.className = "progress-track";

        const fill = document.createElement("div");
        fill.className = "progress-fill";
        fill.style.width = `${(count / maxCount) * 100}%`;

        track.appendChild(fill);
        item.append(meta, track);
        container.appendChild(item);
    });
}

function updateDashboard(data) {
    document.getElementById("totalPackets").textContent =
        data.total_packets ?? 0;

    document.getElementById("totalBytes").textContent =
        formatBytes(data.total_bytes ?? 0);

    document.getElementById("activeInterface").textContent =
        data.interface || "—";

    const statusText = document.getElementById("captureStatus");
    const statusDot = document.getElementById("statusDot");

    statusText.textContent = data.running ? "Capturing" : "Stopped";
    statusDot.classList.toggle("active", Boolean(data.running));

    startBtn.disabled = Boolean(data.running);
    stopBtn.disabled = !data.running;
    interfaceSelect.disabled = Boolean(data.running);

    latestPackets = data.packets || [];

    renderProtocols(data.protocol_counts || {});
    renderPackets(latestPackets);

    if (data.error) {
        showMessage("Capture error: " + data.error, "error");
    }
}

async function refreshStatus() {
    try {
        const data = await apiRequest("/api/status");
        updateDashboard(data);
    } catch (error) {
        showMessage("Could not refresh dashboard: " + error.message, "error");
    }
}

startBtn.addEventListener("click", async () => {
    const selectedInterface = interfaceSelect.value;

    if (!selectedInterface) {
        showMessage("Please select a network interface first.", "error");
        return;
    }

    startBtn.disabled = true;
    showMessage("Starting packet capture...");

    try {
        const data = await apiRequest("/api/start", {
            method: "POST",
            body: JSON.stringify({ interface: selectedInterface })
        });

        showMessage(data.message, "success");
        await refreshStatus();
    } catch (error) {
        showMessage(error.message, "error");
        await refreshStatus();
    }
});

stopBtn.addEventListener("click", async () => {
    stopBtn.disabled = true;
    showMessage("Stopping packet capture...");

    try {
        const data = await apiRequest("/api/stop", {
            method: "POST"
        });

        showMessage(data.message, "success");
        await refreshStatus();
    } catch (error) {
        showMessage(error.message, "error");
    }
});

clearBtn.addEventListener("click", async () => {
    try {
        const data = await apiRequest("/api/clear", {
            method: "POST"
        });

        showMessage(data.message, "success");
        await refreshStatus();
    } catch (error) {
        showMessage(error.message, "error");
    }
});

protocolFilter.addEventListener("change", () => {
    renderPackets(latestPackets);
});

loadInterfaces();
refreshStatus();

pollTimer = setInterval(refreshStatus, 1500);
