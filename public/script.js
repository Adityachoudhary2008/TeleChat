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

// ===== RENDER MESSAGE (SAFE) =====
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
    }

    if (msg.type === "image") {
        // 🔥 IMAGE FIX: explicit img tag + preload safe
        content = `<img src="${msg.data}" alt="image" style="max-width:100%;border-radius:8px;" loading="lazy" />`;
    }

    if (msg.type === "video") {
        content = `<video src="${msg.data}" controls playsinline style="max-width:100%;border-radius:8px;"></video>`;
    }

    if (msg.type === "file") {
        content = `<a href="${msg.data}" download="${msg.fileName}">📄 ${msg.fileName}</a>`;
    }

    div.innerHTML = `
        <strong>${msg.user}</strong><br>
        ${content}
        <span class="time">${time}${isMe ? " ✓✓" : ""}</span>
    `;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (!isMe) socket.emit("seen", msg.id);
}

// ===== SEEN =====
socket.on("seen", (id) => {
    const el = document.querySelector(`[data-id="${id}"] .time`);
    if (el && !el.innerText.includes("✓✓")) {
        el.innerText = el.innerText.replace("✓", "✓✓");
    }
});

// ===== TYPING =====
input.addEventListener("input", () => {
    socket.emit("typing");
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit("stopTyping");
    }, 800);
});

socket.on("typing", (user) => {
    if (user !== username) typingIndicator.innerText = `${user} is typing...`;
});

socket.on("stopTyping", () => {
    typingIndicator.innerText = "";
});

// ===== SYSTEM =====
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
        closeAttachmentMenu();
        const type = item.dataset.type;

        if (type === "image") imageInput.click();
        if (type === "video") videoInput.click();
        if (type === "file") fileInput.click();
    });
});

// ===== FILE UPLOAD (PHOTO FIXED) =====
function setupFileUpload(inputEl, mediaType) {
    inputEl.addEventListener("change", () => {
        const file = inputEl.files[0];
        if (!file) return;

        // 🔒 IMAGE SIZE SAFETY (prevents silent fail)
        if (mediaType === "image" && file.size > 2 * 1024 * 1024) {
            alert("Image size should be less than 2MB");
            inputEl.value = "";
            return;
        }

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
