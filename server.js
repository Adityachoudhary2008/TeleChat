const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve frontend
app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", (username) => {
        socket.username = username;
        socket.broadcast.emit("system", `${username} joined TeleChat`);
    });

    // MESSAGE WITH SERVER TIMESTAMP
    socket.on("message", (text) => {
        io.emit("message", {
            user: socket.username,
            text,
            time: new Date().toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit"
            })
        });
    });

    // TYPING INDICATOR
    socket.on("typing", () => {
        socket.broadcast.emit("typing", socket.username);
    });

    socket.on("stopTyping", () => {
        socket.broadcast.emit("stopTyping", socket.username);
    });

    socket.on("disconnect", () => {
        if (socket.username) {
            socket.broadcast.emit("system", `${socket.username} left TeleChat`);
        }
    });
});

// Railway-safe PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("TeleChat running on port", PORT);
});
