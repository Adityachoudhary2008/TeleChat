const socket = io();

// ===== DOM =====
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
const fileInput = document.getElementById("fileInput");

const voiceControls = document.getElementById("voiceControls");
const cancelVoice = document.getElementById("cancelVoice");
const sendVoice = document.getElementById("sendVoice");

// ===== STATE =====
let username = prompt("Enter your name") || "Guest";
let mySocketId = null;
let typingTimeout;

let mediaRecorder;
let audioChunks = [];
let audioBlob = null;

// ===== JOIN =====
socket.emit("join", username);

socket.on("self-id", (id) => mySocketId = id);

// ===== SEND TEXT =====
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    socket.emit("message", { text });
    input.value = "";
    socket.emit("stopTyping");
});

// ===== RECEIVE =====
socket.on("message", renderMessage);
socket.on("media-message", renderMessage);

// ===== RENDER =====
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
    if (msg.type === "image") content = `<img src="${msg.data}" style="max-width:100%;border-radius:8px;">`;
    if (msg.type === "video") content = `<video src="${msg.data}" controls style="max-width:100%;border-radius:8px;"></video>`;
    if (msg.type === "file") content = `<a href="${msg.data}" download="${msg.fileName}">📄 ${msg.fileName}</a>`;
    if (msg.type === "audio") content = `<audio controls src="${msg.data}"></audio>`;

    div.innerHTML = `
        <strong>${msg.user}</strong><br>
        ${content}
        <span class="time">${time}${isMe ? " ✓✓" : ""}</span>
    `;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (!isMe) socket.emit("seen", msg.id);
}

// ===== TYPING =====
input.addEventListener("input", () => {
    socket.emit("typing");
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => socket.emit("stopTyping"), 800);
});

socket.on("typing", (u) => {
    if (u !== username) typingIndicator.innerText = `${u} is typing...`;
});
socket.on("stopTyping", () => typingIndicator.innerText = "");

// ===== ATTACHMENT MENU =====
attachBtn.addEventListener("click", () => {
    attachmentMenu.classList.add("show");
    overlay.classList.add("show");
});

overlay.addEventListener("click", () => {
    attachmentMenu.classList.remove("show");
    overlay.classList.remove("show");
});

document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => {
        attachmentMenu.classList.remove("show");
        overlay.classList.remove("show");
        if (item.dataset.type === "image") imageInput.click();
        if (item.dataset.type === "video") videoInput.click();
        if (item.dataset.type === "file") fileInput.click();
    });
});

// ===== FILE UPLOAD =====
function setupFileUpload(inputEl, type) {
    inputEl.addEventListener("change", () => {
        const file = inputEl.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            socket.emit("media-message", {
                mediaType: type,
                fileName: file.name,
                fileType: file.type,
                data: reader.result
            });
        };
        reader.readAsDataURL(file);
        inputEl.value = "";
    });
}

setupFileUpload(imageInput, "image");
setupFileUpload(videoInput, "video");
setupFileUpload(fileInput, "file");

// ===== VOICE MESSAGE =====
micBtn.addEventListener("click", async () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

    mediaRecorder.onstop = () => {
        audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        voiceControls.classList.add("show");
    };

    mediaRecorder.start();
});

cancelVoice.addEventListener("click", () => {
    audioBlob = null;
    voiceControls.classList.remove("show");
});

sendVoice.addEventListener("click", () => {
    if (!audioBlob) return;

    const reader = new FileReader();
    reader.onload = () => {
        socket.emit("media-message", {
            mediaType: "audio",
            fileName: "voice-message.webm",
            fileType: "audio/webm",
            data: reader.result
        });
    };
    reader.readAsDataURL(audioBlob);

    audioBlob = null;
    voiceControls.classList.remove("show");
});
