const prisma = require("../prisma");

// CREATE FOLDER
const createFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        userId
      }
    });

    res.status(201).json({
      id: folder.id,
      name: folder.name,
      createdAt: folder.createdAt
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET MY FOLDERS
const getMyFolders = async (req, res) => {
  try {
    const userId = req.user.userId;

    const folders = await prisma.folder.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    });

    res.json(folders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE FOLDER
const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const folder = await prisma.folder.findFirst({
      where: { id, userId }
    });

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    await prisma.folder.delete({
      where: { id }
    });

    res.json({ message: "Folder deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createFolder,
  getMyFolders,
  deleteFolder
};
