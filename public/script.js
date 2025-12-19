const socket = io(); // same-origin (Railway best practice)

const chat = document.getElementById("chat");
const form = document.getElementById("form");
const input = document.getElementById("input");

let username = prompt("Enter your name");
if (!username) username = "Guest";

socket.emit("join", username);

form.addEventListener("submit", (e) => {
    e.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    socket.emit("message", text);
    input.value = "";
});

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

socket.on("system", (text) => {
    const div = document.createElement("div");
    div.className = "system";
    div.innerText = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
});
