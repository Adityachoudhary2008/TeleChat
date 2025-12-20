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

/* ================= CLOUDINARY CONFIG (FIXED) ================= */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(express.json({ limit: "50mb" }));
app.use(express.static("public"));

/* ================= ONLINE USERS STORE (ADDED) ================= */
const onlineUsers = {};

/* ================= SOCKET ================= */
io.on("connection", (socket) => {

    socket.on("join", (username) => {
        socket.username = username || "Guest";
        socket.emit("self-id", socket.id);
        socket.broadcast.emit("system", `${socket.username} joined TeleChat`);

        /* ===== ADD: track online user ===== */
        onlineUsers[socket.id] = socket.username;
        io.emit("users-update", Object.values(onlineUsers));
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

        /* ===== ADD: remove offline user ===== */
        delete onlineUsers[socket.id];
        io.emit("users-update", Object.values(onlineUsers));
    });
});

/* ================= CLOUDINARY UPLOAD ================= */
app.post("/upload", async (req, res) => {
    try {
        const { data, type } = req.body;
        if (!data) {
            return res.status(400).json({ error: "No file data" });
        }

        const result = await cloudinary.uploader.upload(data, {
            resource_type:
                type === "video" || type === "audio" ? "video" : "image"
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
    console.log("✅ TeleChat running on port", PORT);
});
