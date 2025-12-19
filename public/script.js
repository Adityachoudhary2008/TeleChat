const socket = io();

const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const typingIndicator = document.getElementById("typingIndicator");

let username = prompt("Enter your name") || "Guest";
socket.emit("join", username);

let typingTimer;
let messagesMap = {};

// SEND MESSAGE
form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    socket.emit("message", { text }, (ack) => {
        // delivered ✓
    });

    input.value = "";
    socket.emit("stopTyping");
});

// RECEIVE MESSAGE
socket.on("message", (data) => {
    const div = document.createElement("div");
    const isMe = data.user === username;

    div.className = `msg ${isMe ? "me" : "other"}`;
    div.dataset.id = data.id;

    div.innerHTML = `
        <strong>${data.user}</strong><br>
        ${data.text}
        <div class="status">
            <span class="time">${data.time}</span>
            ${isMe ? `<span class="tick"> ✓✓</span>` : ""}
        </div>
    `;

    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;

    // mark seen for incoming
    if (!isMe) {
        socket.emit("seen", data.id);
    }

    messagesMap[data.id] = div;
});

// SEEN UPDATE
socket.on("seen", (messageId) => {
    const msg = messagesMap[messageId];
    if (msg) {
        const tick = msg.querySelector(".tick");
        if (tick) tick.innerText = " ✓✓✓";
    }
});

// SYSTEM MESSAGE
socket.on("system", (text) => {
    const div = document.createElement("div");
    div.className = "system";
    div.innerText = text;
    chat.appendChild(div);
});

// TYPING INDICATOR (FIXED)
input.addEventListener("input", () => {
    socket.emit("typing");
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
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
