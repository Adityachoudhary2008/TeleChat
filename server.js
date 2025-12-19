const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static("public"));

io.on("connection", (socket) => {

    socket.on("join", (username) => {
        socket.username = username;
        socket.emit("self-id", socket.id);
        socket.broadcast.emit("system", `${username} joined TeleChat`);
    });

    socket.on("message", (payload) => {
        const message = {
            id: crypto.randomUUID(),
            user: socket.username,
            senderId: socket.id,
            text: payload.text,
            createdAt: new Date().toISOString(),
            status: "delivered"
        };

        io.emit("message", message);
    });

    socket.on("seen", (messageId) => {
        socket.broadcast.emit("seen", messageId);
    });

    // typing indicator (stable)
    socket.on("typing", () => {
        socket.broadcast.emit("typing", socket.username);
    });

    socket.on("stopTyping", () => {
        socket.broadcast.emit("stopTyping");
    });

    socket.on("disconnect", () => {
        if (socket.username) {
            socket.broadcast.emit("system", `${socket.username} left TeleChat`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("TeleChat running on port", PORT);
});
