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
        socket.broadcast.emit("system", `${username} joined TeleChat`);
    });

    // MESSAGE SEND (SERVER TIME + DELIVERY)
    socket.on("message", (payload, callback) => {
        const message = {
            id: Date.now() + Math.random(),
            user: socket.username,
            text: payload.text,
            time: new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit"
            })
        };

        // send to everyone
        io.emit("message", message);

        // delivered ack (to sender)
        callback({ delivered: true });
    });

    // SEEN STATUS
    socket.on("seen", (messageId) => {
        socket.broadcast.emit("seen", messageId);
    });

    // TYPING INDICATOR (FIXED)
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
