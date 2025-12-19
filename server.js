const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Socket.IO with safe CORS (Railway friendly)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve frontend
app.use(express.static("public"));

// Socket logic
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", (username) => {
        socket.username = username;
        socket.broadcast.emit("system", `${username} joined TeleChat`);
    });

    socket.on("message", (text) => {
        io.emit("message", {
            user: socket.username,
            text,
            time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            })
        });
    });

    socket.on("disconnect", () => {
        if (socket.username) {
            socket.broadcast.emit("system", `${socket.username} left TeleChat`);
        }
    });
});

// Railway PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`TeleChat running on port ${PORT}`);
});
