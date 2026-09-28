// ============================================================
// server.js
//
// This is the file you run: `node server.js` (or `npm run dev`).
// It just wires everything together — the real logic lives in
// src/routes and src/services.
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const newsRoutes = require("./src/routes/news");
const userRoutes = require("./src/routes/users");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // lets your React Native app call this server from a different origin
app.use(express.json()); // lets req.body work for POST/PUT requests

app.get("/", (req, res) => {
  res.send("VibeNewz backend is running.");
});

app.use("/api/news", newsRoutes);
app.use("/api/users", userRoutes);

// Catch-all for routes that don't exist
app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

// Catch-all for unexpected errors, so the server logs them instead of
// silently crashing
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`VibeNewz backend running at http://localhost:${PORT}`);
});
