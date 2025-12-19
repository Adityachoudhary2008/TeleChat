const socket = io();

const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const fileInput = document.getElementById("fileInput");
const typingIndicator = document.getElementById("typingIndicator");

let username = prompt("Enter your name") || "Guest";
let mySocketId = null;
let typingTimeout;

socket.emit("join", username);

socket.on("self-id", (id) => mySocketId = id);

// SEND TEXT MESSAGE (unchanged)
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    socket.emit("message", { text });
    input.value = "";
    socket.emit("stopTyping");
});

// MEDIA UPLOAD
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        const mediaType = file.type.startsWith("image")
            ? "image"
            : file.type.startsWith("video")
            ? "video"
            : "file";

        socket.emit("media-message", {
            mediaType,
            fileName: file.name,
            fileType: file.type,
            data: reader.result
        });
    };
    reader.readAsDataURL(file);
    fileInput.value = "";
});

// RECEIVE TEXT MESSAGE
socket.on("message", (msg) => renderMessage(msg));

// RECEIVE MEDIA MESSAGE
socket.on("media-message", (msg) => renderMessage(msg));

function renderMessage(msg) {
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
    } else {
        content = `<a href="${msg.data}" download="${msg.fileName}">📄 ${msg.fileName}</a>`;
    }

    div.innerHTML = `
        <strong>${msg.user}</strong><br>
        ${content}
        <span class="time">${time} ${isMe ? "✓✓" : ""}</span>
    `;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (!isMe) socket.emit("seen", msg.id);
}

// TYPING (unchanged)
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

// SYSTEM
socket.on("system", (text) => {
    const div = document.createElement("div");
    div.className = "system";
    div.innerText = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
});
