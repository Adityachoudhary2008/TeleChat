const socket = io();

// ===== DOM =====
const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const typingIndicator = document.getElementById("typingIndicator");

const attachBtn = document.getElementById("attachBtn");
const attachmentMenu = document.getElementById("attachmentMenu");
const overlay = document.getElementById("overlay");

const imageInput = document.getElementById("imageInput");
const videoInput = document.getElementById("videoInput");
const fileInput = document.getElementById("fileInput");

// ===== STATE =====
let username = prompt("Enter your name") || "Guest";
let mySocketId = null;
let typingTimeout = null;

// ===== JOIN =====
socket.emit("join", username);

socket.on("self-id", (id) => {
    mySocketId = id;
});

// ===== SEND TEXT MESSAGE =====
form.addEventListener("submit", (e) => {
    e.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    socket.emit("message", { text });
    input.value = "";
    socket.emit("stopTyping");
});

// ===== RECEIVE TEXT MESSAGE =====
socket.on("message", (msg) => {
    renderMessage(msg);
});

// ===== RECEIVE MEDIA MESSAGE =====
socket.on("media-message", (msg) => {
    renderMessage(msg);
});

// ===== RENDER MESSAGE (alignment safe) =====
function renderMessage(msg) {
    if (!mySocketId) return;

    const isMe = msg.senderId === mySocketId;

    const div = document.createElement("div");
    div.className = `msg ${isMe ? "me" : "other"}`;
    div.dataset.id = msg.id;

    const time = new Date(msg.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
    });

    let content = "";

    if (msg.type === "text") {
        content = msg.text;
    } else if (msg.type === "image") {
        content = `<img src="${msg.data}" style="max-width:100%;border-radius:8px;" />`;
    } else if (msg.type === "video") {
        content = `<video src="${msg.data}" controls style="max-width:100%;border-radius:8px;"></video>`;
    } else if (msg.type === "file") {
        content = `<a href="${msg.data}" download="${msg.fileName}">📄 ${msg.fileName}</a>`;
    }

    div.innerHTML = `
        <strong>${msg.user}</strong><br>
        ${content}
        <span class="time">${time}${isMe ? " ✓✓" : ""}</span>
    `;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (!isMe) {
        socket.emit("seen", msg.id);
    }
}

// ===== SEEN UPDATE =====
socket.on("seen", (id) => {
    const el = document.querySelector(`[data-id="${id}"] .time`);
    if (el && !el.innerText.includes("✓✓")) {
        el.innerText = el.innerText.replace("✓", "✓✓");
    }
});

// ===== TYPING INDICATOR (SAFE) =====
input.addEventListener("input", () => {
    socket.emit("typing");

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit("stopTyping");
    }, 800);
});

socket.on("typing", (user) => {
    if (user !== username) {
        typingIndicator.innerText = `${user} is typing...`;
    }
});

socket.on("stopTyping", () => {
    typingIndicator.innerText = "";
});

// ===== SYSTEM MESSAGE =====
socket.on("system", (text) => {
    const div = document.createElement("div");
    div.className = "system";
    div.innerText = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
});

// ===== ATTACHMENT MENU =====
attachBtn.addEventListener("click", () => {
    attachmentMenu.classList.add("show");
    overlay.classList.add("show");
});

overlay.addEventListener("click", closeAttachmentMenu);

function closeAttachmentMenu() {
    attachmentMenu.classList.remove("show");
    overlay.classList.remove("show");
}

document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", () => {
        const type = item.dataset.type;
        closeAttachmentMenu();

        if (type === "image") imageInput.click();
        if (type === "video") videoInput.click();
        if (type === "file") fileInput.click();
    });
});

// ===== FILE UPLOAD (ISOLATED, NO DISCONNECT) =====
function setupFileUpload(inputEl, mediaType) {
    inputEl.addEventListener("change", () => {
        const file = inputEl.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            socket.emit("media-message", {
                mediaType,
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
