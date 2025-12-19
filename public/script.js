const socket = io();

/* ===== DOM ===== */
const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const typingIndicator = document.getElementById("typingIndicator");

const attachBtn = document.getElementById("attachBtn");
const micBtn = document.getElementById("micBtn");

const attachmentMenu = document.getElementById("attachmentMenu");
const overlay = document.getElementById("overlay");

const imageInput = document.getElementById("imageInput");
const videoInput = document.getElementById("videoInput");
const fileInput  = document.getElementById("fileInput");

const voiceControls = document.getElementById("voiceControls");
const cancelVoice = document.getElementById("cancelVoice");
const sendVoice = document.getElementById("sendVoice");

/* ===== STATE ===== */
let username = prompt("Enter your name") || "Guest";
let mySocketId = null;
let typingTimeout;

let recorder = null;
let audioChunks = [];
let recordedBlob = null;

/* ===== JOIN ===== */
socket.emit("join", username);
socket.on("self-id", id => mySocketId = id);

/* ===== TEXT ===== */
form.addEventListener("submit", e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    socket.emit("message", { text });
    input.value = "";
});

/* ===== RECEIVE ===== */
socket.on("message", renderMessage);
socket.on("media-message", renderMessage);

/* ===== RENDER ===== */
function renderMessage(msg) {
    if (!mySocketId) return;

    const isMe = msg.senderId === mySocketId;
    const div = document.createElement("div");
    div.className = `msg ${isMe ? "me" : "other"}`;

    const time = new Date(msg.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
    });

    let content = "";

    if (msg.type === "text") content = msg.text;
    if (msg.type === "image") content = `<img src="${msg.url}" onerror="this.remove()" style="max-width:100%;border-radius:8px;">`;
    if (msg.type === "video") content = `<video src="${msg.url}" controls style="max-width:100%;border-radius:8px;"></video>`;
    if (msg.type === "file") content = `<a href="${msg.url}" target="_blank">📄 Download file</a>`;
    if (msg.type === "audio") content = `<audio controls src="${msg.url}"></audio>`;

    div.innerHTML = `
        <strong>${msg.user}</strong><br>
        ${content}
        <span class="time">${time}${isMe ? " ✓✓" : ""}</span>
    `;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

/* ===== ATTACHMENT MENU ===== */
attachBtn.onclick = () => {
    attachmentMenu.classList.add("show");
    overlay.classList.add("show");
};
overlay.onclick = () => {
    attachmentMenu.classList.remove("show");
    overlay.classList.remove("show");
};

/* ===== SAFE UPLOAD (WITH RESPONSE CHECK) ===== */
async function uploadAndSendFile(file, type) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
        const res = await fetch("/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: reader.result, type })
        });

        if (!res.ok) {
            console.error("Upload failed");
            return;
        }

        const json = await res.json();
        if (!json.url) {
            console.error("No URL from server");
            return;
        }

        socket.emit("media-message", { type, url: json.url });
    };
    reader.readAsDataURL(file);
}

/* ===== FILE INPUTS ===== */
imageInput.onchange = () => {
    const f = imageInput.files[0];
    imageInput.value = "";
    uploadAndSendFile(f, "image");
};
videoInput.onchange = () => {
    const f = videoInput.files[0];
    videoInput.value = "";
    uploadAndSendFile(f, "video");
};
fileInput.onchange = () => {
    const f = fileInput.files[0];
    fileInput.value = "";
    uploadAndSendFile(f, "file");
};

/* ===== VOICE (FORCED MIME — THIS FIXES 0 SEC AUDIO) ===== */
micBtn.onclick = async () => {
    if (recorder && recorder.state === "recording") {
        recorder.stop();
        return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus"
    });

    audioChunks = [];

    recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunks.push(e.data);
    };

    recorder.onstop = () => {
        recordedBlob = new Blob(audioChunks, { type: "audio/webm;codecs=opus" });
        if (recordedBlob.size > 0) {
            voiceControls.classList.add("show");
        }
    };

    recorder.start();
};

cancelVoice.onclick = () => {
    recordedBlob = null;
    voiceControls.classList.remove("show");
};

sendVoice.onclick = () => {
    if (!recordedBlob || recordedBlob.size === 0) return;
    uploadAndSendFile(new File([recordedBlob], "voice.webm"), "audio");
    recordedBlob = null;
    voiceControls.classList.remove("show");
};
