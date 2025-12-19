const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.json({ limit: "20mb" }));
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================== SOCKET ==================
io.on("connection", (socket) => {

    socket.on("join", (username) => {
        socket.username = username;
        socket.emit("self-id", socket.id);
        socket.broadcast.emit("system", `${username} joined TeleChat`);
    });

    socket.on("message", ({ text }) => {
        io.emit("message", {
            id: crypto.randomUUID(),
            type: "text",
            user: socket.username,
            senderId: socket.id,
            text,
            createdAt: new Date().toISOString()
        });
    });

    socket.on("media-message", (data) => {
        io.emit("media-message", {
            id: crypto.randomUUID(),
            user: socket.username,
            senderId: socket.id,
            type: data.type,
            url: data.url,
            createdAt: new Date().toISOString()
        });
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

// ================== UPLOAD API ==================
app.post("/upload", (req, res) => {
    try {
        const { fileName, data } = req.body;
        if (!fileName || !data) {
            return res.status(400).json({ error: "Invalid upload" });
        }

        const uploadDir = path.join(__dirname, "uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        const base64 = data.split(",")[1];
        const buffer = Buffer.from(base64, "base64");

        const safeName = Date.now() + "-" + fileName.replace(/\s+/g, "_");
        const filePath = path.join(uploadDir, safeName);

        fs.writeFileSync(filePath, buffer);

        res.json({ url: `/uploads/${safeName}` });
    } catch (err) {
        console.error("Upload error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

// ================== START ==================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("TeleChat running on port", PORT);
});
