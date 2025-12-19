const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

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

    // TEXT MESSAGE (unchanged)
    socket.on("message", (payload) => {
        const message = {
            id: crypto.randomUUID(),
            type: "text",
            user: socket.username,
            senderId: socket.id,
            text: payload.text,
            createdAt: new Date().toISOString()
        };
        io.emit("message", message);
    });

    // MEDIA MESSAGE (NEW)
    socket.on("media-message", (payload) => {
        const message = {
            id: crypto.randomUUID(),
            type: payload.mediaType, // image | video | file
            user: socket.username,
            senderId: socket.id,
            fileName: payload.fileName,
            fileType: payload.fileType,
            data: payload.data,
            createdAt: new Date().toISOString()
        };
        io.emit("media-message", message);
    });

    socket.on("seen", (id) => {
        socket.broadcast.emit("seen", id);
    });

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
