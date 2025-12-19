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

/* ===== SEND TEXT ===== */
form.addEventListener("submit", e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    socket.emit("message", { text });
    input.value = "";
    socket.emit("stopTyping");
});

/* ===== RECEIVE ===== */
socket.on("message", renderMessage);
socket.on("media-message", renderMessage);

/* ===== RENDER MESSAGE ===== */
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

    if (msg.type === "text") {
        content = msg.text;
    }

    if (msg.type === "image") {
        content = `<img src="${msg.url}" style="max-width:100%;border-radius:8px;" />`;
    }

    if (msg.type === "video") {
        content = `<video src="${msg.url}" controls style="max-width:100%;border-radius:8px;"></video>`;
    }

    if (msg.type === "file") {
        content = `<a href="${msg.url}" target="_blank">📄 Download file</a>`;
    }

    if (msg.type === "audio") {
        content = `<audio controls src="${msg.url}"></audio>`;
    }

    div.innerHTML = `
        <strong>${msg.user}</strong><br>
        ${content}
        <span class="time">${time}${isMe ? " ✓✓" : ""}</span>
    `;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
}

/* ===== TYPING ===== */
input.addEventListener("input", () => {
    socket.emit("typing");
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => socket.emit("stopTyping"), 800);
});

socket.on("typing", u => {
    if (u !== username) typingIndicator.innerText = `${u} is typing...`;
});
socket.on("stopTyping", () => typingIndicator.innerText = "");

/* ===== ATTACHMENT MENU ===== */
attachBtn.onclick = () => {
    attachmentMenu.classList.add("show");
    overlay.classList.add("show");
};

overlay.onclick = closeMenu;

function closeMenu() {
    attachmentMenu.classList.remove("show");
    overlay.classList.remove("show");
}

document.querySelectorAll(".menu-item").forEach(item => {
    item.onclick = () => {
        closeMenu();
        if (item.dataset.type === "image") imageInput.click();
        if (item.dataset.type === "video") videoInput.click();
        if (item.dataset.type === "file") fileInput.click();
    };
});

/* ===== UPLOAD VIA CLOUDINARY ===== */
async function uploadAndSend(file, type) {
    const reader = new FileReader();
    reader.onload = async () => {
        const res = await fetch("/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: reader.result, type })
        });
        const { url } = await res.json();
        socket.emit("media-message", { type, url });
    };
    reader.readAsDataURL(file);
}

imageInput.onchange = () => uploadAndSend(imageInput.files[0], "image");
videoInput.onchange = () => uploadAndSend(videoInput.files[0], "video");
fileInput.onchange  = () => uploadAndSend(fileInput.files[0], "file");

/* ===== VOICE MESSAGE (OLD UX RESTORED) ===== */
micBtn.onclick = async () => {
    if (recorder && recorder.state === "recording") {
        recorder.stop();
        return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream);
    audioChunks = [];

    recorder.ondataavailable = e => audioChunks.push(e.data);

    recorder.onstop = () => {
        recordedBlob = new Blob(audioChunks, { type: "audio/webm" });
        voiceControls.classList.add("show");
    };

    recorder.start();
};

cancelVoice.onclick = () => {
    recordedBlob = null;
    voiceControls.classList.remove("show");
};

sendVoice.onclick = () => {
    if (!recordedBlob) return;

    uploadAndSend(new File([recordedBlob], "voice.webm"), "audio");
    recordedBlob = null;
    voiceControls.classList.remove("show");
};
