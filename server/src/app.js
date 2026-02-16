const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const noteRoutes = require("./routes/noteRoutes");
const folderRoutes = require("./routes/folderRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const { getSharedNote, updateSharedNote, getAllUserEmails, getMe, deleteAccount } = require("./controllers/noteController");

const app = express();

app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/folders", folderRoutes);
app.get("/api/users/emails", authMiddleware, getAllUserEmails);
app.get("/api/users/me", authMiddleware, getMe);
app.delete("/api/users/me", authMiddleware, deleteAccount);

// Public routes for shared notes (no auth required)
app.get("/api/shared/:shareCode", getSharedNote);
app.put("/api/shared/:shareCode", updateSharedNote);

app.get("/", (req, res) => {
  res.json({ message: "Notes App Backend Running!!" });
});

app.get("/ping", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

module.exports = app;
