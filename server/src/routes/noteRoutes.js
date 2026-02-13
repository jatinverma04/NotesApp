const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createNote,
  getMyNotes,
  searchNotes,
  getNotesByFolder,
  getNotifications,
  markNotificationRead,
  getNoteForCollaborator,
  updateNoteForCollaborator,
  getNoteHistory,
  generateShareLink,
  addCollaborator,
  getNoteById,
  updateNote,
  deleteNote,
  getCollaboratorNotes
} = require("../controllers/noteController");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createNote);
router.get("/", getMyNotes);
router.get("/search", searchNotes);
router.get("/folder/:folderId", getNotesByFolder);
router.get("/notifications", getNotifications);
router.post("/notifications/:id/read", markNotificationRead);
router.get("/collaborator", getCollaboratorNotes);
router.get("/:id/access", getNoteForCollaborator);
router.put("/:id/access", updateNoteForCollaborator);
router.get("/:id/history", getNoteHistory);
router.post("/:id/share", generateShareLink);
router.post("/:id/collaborators", addCollaborator);
router.get("/:id", getNoteById);
router.put("/:id", updateNote);
router.delete("/:id", deleteNote);

module.exports = router;
