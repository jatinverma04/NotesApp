const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  createFolder,
  getMyFolders,
  deleteFolder
} = require("../controllers/folderController");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createFolder);
router.get("/", getMyFolders);
router.delete("/:id", deleteFolder);

module.exports = router;
