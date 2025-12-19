const socket = io();

const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const typingIndicator = document.getElementById("typingIndicator");

let username = prompt("Enter your name") || "Guest";
let mySocketId = null;
let typingTimeout;

socket.emit("join", username);

socket.on("self-id", (id) => {
    mySocketId = id;
});

// send message
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    socket.emit("message", { text });
    input.value = "";
    socket.emit("stopTyping");
});

// receive message
socket.on("message", (msg) => {
    const isMe = msg.senderId === mySocketId;

    const div = document.createElement("div");
    div.className = `msg ${isMe ? "me" : "other"}`;
    div.dataset.id = msg.id;

    const time = new Date(msg.createdAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit"
    });

    div.innerHTML = `
        <strong>${msg.user}</strong><br>
        ${msg.text}
        <span class="time">${time} ${isMe ? "✓" : ""}</span>
    `;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    if (!isMe) socket.emit("seen", msg.id);
});

// seen update
socket.on("seen", (id) => {
    const msg = document.querySelector(`[data-id="${id}"] .time`);
    if (msg && !msg.innerText.includes("✓✓")) {
        msg.innerText += "✓";
    }
});

// typing indicator (reliable)
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

// system messages
socket.on("system", (text) => {
    const div = document.createElement("div");
    div.className = "system";
    div.innerText = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
});
