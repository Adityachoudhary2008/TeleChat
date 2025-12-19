const socket = io(); // Railway same-origin

const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");
const typingIndicator = document.getElementById("typingIndicator");

let username = prompt("Enter your name");
if (!username) username = "Guest";

socket.emit("join", username);

// SEND MESSAGE
form.addEventListener("submit", (e) => {
    e.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    socket.emit("message", text);
    input.value = "";
    socket.emit("stopTyping");
});

// RECEIVE MESSAGE
socket.on("message", (data) => {
    const div = document.createElement("div");
    div.className = `msg ${data.user === username ? "me" : "other"}`;
    div.innerHTML = `
        <strong>${data.user}</strong><br>
        ${data.text}
        <span class="time">${data.time}</span>
    `;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
});

// SYSTEM MESSAGE
socket.on("system", (text) => {
    const div = document.createElement("div");
    div.className = "system";
    div.innerText = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
});

// TYPING EVENTS
let typingTimeout;

input.addEventListener("input", () => {
    socket.emit("typing");

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        socket.emit("stopTyping");
    }, 1000);
});

socket.on("typing", (user) => {
    if (user !== username) {
        typingIndicator.innerText = `${user} is typing...`;
    }
});

socket.on("stopTyping", () => {
    typingIndicator.innerText = "";
});
