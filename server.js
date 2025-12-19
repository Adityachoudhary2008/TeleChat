const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

cloudinary.config({
    cloud_name: dqymsvsrr,
    api_key: 162949727147937,
    api_secret: e5OdHJvKXlmwj_bAZldiUXL9hKU
});

app.use(express.json({ limit: "50mb" }));
app.use(express.static("public"));

/* ================= SOCKET ================= */
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

    socket.on("seen", (id) => socket.broadcast.emit("seen", id));
    socket.on("typing", () => socket.broadcast.emit("typing", socket.username));
    socket.on("stopTyping", () => socket.broadcast.emit("stopTyping"));

    socket.on("disconnect", () => {
        if (socket.username) {
            socket.broadcast.emit("system", `${socket.username} left TeleChat`);
        }
    });
});

/* ================= CLOUDINARY UPLOAD ================= */
app.post("/upload", async (req, res) => {
    try {
        const { data, type } = req.body;
        if (!data) return res.status(400).json({ error: "No file data" });

        const result = await cloudinary.uploader.upload(data, {
            resource_type: type === "video" || type === "audio" ? "video" : "image"
        });

        res.json({ url: result.secure_url });
    } catch (err) {
        console.error("Cloudinary error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

/* ================= START ================= */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("TeleChat running on port", PORT);
});
