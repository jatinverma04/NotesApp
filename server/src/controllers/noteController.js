const prisma = require("../prisma");

const createNote = async (req, res) => {
  try {
    const { title, content, folderId } = req.body;
    const userId = req.user.userId;

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const note = await prisma.note.create({
      data: {
        title,
        content: content || "",
        userId,
        folderId: folderId || null
      }
    });

    res.status(201).json({
      id: note.id,
      title: note.title,
      content: note.content,
      folderId: note.folderId,
      version: note.version
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getMyNotes = async (req, res) => {
  try {
    const userId = req.user.userId;

    const notes = await prisma.note.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        folderId: true,
        updatedAt: true,
        version: true,
        collaborators: {
          select: {
            id: true
          }
        }
      }
    });

    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getNotesByFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.userId;

    const notes = await prisma.note.findMany({
      where: {
        userId,
        folderId
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        updatedAt: true,
        version: true,
        user: {
          select: {
            name: true
          }
        }
      }
    });

    const mappedNotes = notes.map((note) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      updatedAt: note.updatedAt,
      version: note.version,
      createdByName: note.user ? note.user.name : null
    }));

    res.json(mappedNotes);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, folderId } = req.body;
    const userId = req.user.userId;

    const note = await prisma.note.findFirst({
      where: {
        id,
        OR: [
          { userId },
          {
            collaborators: {
              some: {
                userId,
                permission: "edit"
              }
            }
          }
        ]
      },
      select: {
        id: true,
        title: true,
        content: true,
        folderId: true,
        version: true,
        userId: true // Need userId to check ownership for folder updates if necessary
      }
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found or access denied" });
    }

    // Only allow owner to change folder
    const updateData = {
      title: title !== undefined ? title : note.title,
      content: content !== undefined ? content : note.content,
      version: { increment: 1 }
    };

    if (note.userId === userId && folderId !== undefined) {
      updateData.folderId = folderId;
    } else if (userId !== note.userId && folderId !== undefined) {
      // Collaborator tried to change folder - ignore or error? ignoring is safer for now.
    } else {
      // No folder change requested or keep existing
      // If folderId is undefined in request, we don't change it.
    }

    const updatedNote = await prisma.note.update({
      where: { id },
      data: updateData
    });

    res.json({
      id: updatedNote.id,
      title: updatedNote.title,
      content: updatedNote.content,
      folderId: updatedNote.folderId,
      version: updatedNote.version
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const note = await prisma.note.findFirst({
      where: { id, userId }
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    // Manual cascade delete for related interactions
    await prisma.notification.deleteMany({ where: { noteId: id } });
    await prisma.collaborator.deleteMany({ where: { noteId: id } });
    await prisma.noteVersion.deleteMany({ where: { noteId: id } });

    await prisma.note.delete({
      where: { id }
    });

    res.json({ message: "Note deleted" });
  } catch (err) {
    console.error("Delete note error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getNoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const note = await prisma.note.findFirst({
      where: {
        id,
        OR: [
          { userId },
          {
            collaborators: {
              some: {
                userId
              }
            }
          }
        ]
      },
      select: {
        id: true,
        title: true,
        content: true,
        folderId: true,
        updatedAt: true,
        version: true,
        collaborators: {
          select: {
            permission: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json(note);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const searchNotes = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user.userId;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const searchTerm = q.trim();

    const notes = await prisma.note.findMany({
      where: {
        userId,
        OR: [
          {
            title: {
              contains: searchTerm,
              mode: "insensitive"
            }
          },
          {
            content: {
              contains: searchTerm,
              mode: "insensitive"
            }
          }
        ]
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        folderId: true,
        updatedAt: true,
        version: true
      }
    });

    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getNoteHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const note = await prisma.note.findFirst({
      where: { id, userId }
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const versions = await prisma.noteVersion.findMany({
      where: { noteId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        version: true,
        createdAt: true
      }
    });

    res.json(versions);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const generateShareLink = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const note = await prisma.note.findFirst({
      where: { id, userId }
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found or access denied" });
    }

    const shareCode = require("crypto").randomBytes(5).toString("hex");

    const updatedNote = await prisma.note.update({
      where: { id },
      data: { shareCode }
    });

    res.json({
      shareCode: updatedNote.shareCode
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getSharedNote = async (req, res) => {
  try {
    const { shareCode } = req.params;

    const note = await prisma.note.findUnique({
      where: { shareCode },
      select: {
        id: true,
        title: true,
        content: true,
        version: true
      }
    });

    if (!note) {
      return res.status(404).json({ message: "Shared note not found" });
    }

    res.json(note);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getAllUserEmails = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId }
      },
      select: {
        id: true,
        email: true
      }
    });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const addCollaborator = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, permission } = req.body;
    const ownerId = req.user.userId;

    if (!userId || !permission) {
      return res.status(400).json({ message: "userId and permission are required" });
    }

    if (permission !== "view" && permission !== "edit") {
      return res.status(400).json({ message: "Invalid permission" });
    }

    const note = await prisma.note.findFirst({
      where: {
        id,
        userId: ownerId
      }
    });

    if (!note) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const existing = await prisma.collaborator.findUnique({
      where: {
        noteId_userId: {
          noteId: id,
          userId
        }
      }
    });

    let collaborator;

    if (existing) {
      collaborator = await prisma.collaborator.update({
        where: { id: existing.id },
        data: { permission },
        select: {
          id: true,
          noteId: true,
          userId: true,
          permission: true
        }
      });
    } else {
      collaborator = await prisma.collaborator.create({
        data: {
          noteId: id,
          userId,
          permission
        },
        select: {
          id: true,
          noteId: true,
          userId: true,
          permission: true
        }
      });
    }

    await prisma.notification.create({
      data: {
        userId,
        noteId: id,
        type: "COLLAB_INVITE"
      }
    });

    return res.status(200).json(collaborator);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const list = await prisma.notification.findMany({
      where: {
        userId,
        createdAt: { gte: oneDayAgo }
      },
      orderBy: { createdAt: "desc" },
      include: {
        note: {
          select: {
            id: true,
            title: true,
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    const data = list.map(n => ({
      id: n.id,
      noteId: n.noteId,
      title: n.note.title,
      ownerName: n.note.user.name,
      createdAt: n.createdAt,
      isRead: n.isRead
    }));

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    await prisma.notification.updateMany({
      where: {
        id,
        userId
      },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const updateSharedNote = async (req, res) => {
  try {
    const { shareCode } = req.params;
    const { title, content } = req.body;

    const note = await prisma.note.findUnique({
      where: { shareCode }
    });

    if (!note) {
      return res.status(404).json({ message: "Shared note not found" });
    }

    const updatedNote = await prisma.note.update({
      where: { shareCode },
      data: {
        title: title !== undefined ? title : note.title,
        content: content !== undefined ? content : note.content,
        version: { increment: 1 }
      },
      select: {
        id: true,
        title: true,
        content: true,
        version: true
      }
    });

    return res.json(updatedNote);
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};

const updateNoteForCollaborator = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title, content } = req.body;

    const collaborator = await prisma.collaborator.findUnique({
      where: {
        noteId_userId: {
          noteId: id,
          userId
        }
      }
    });

    if (!collaborator || collaborator.permission !== "edit") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const note = await prisma.note.findUnique({ where: { id } });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    const updatedNote = await prisma.note.update({
      where: { id },
      data: {
        title: title !== undefined ? title : note.title,
        content: content !== undefined ? content : note.content,
        version: { increment: 1 }
      }
    });

    res.json({
      id: updatedNote.id,
      title: updatedNote.title,
      content: updatedNote.content,
      version: updatedNote.version
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getNoteForCollaborator = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const collaborator = await prisma.collaborator.findUnique({
      where: {
        noteId_userId: {
          noteId: id,
          userId
        }
      }
    });

    if (!collaborator) {
      return res.status(404).json({ message: "Note not found" });
    }

    const note = await prisma.note.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        version: true
      }
    });

    if (!note) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json(note);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getCollaboratorNotes = async (req, res) => {
  try {
    const userId = req.user.userId;

    const collaborations = await prisma.collaborator.findMany({
      where: { userId },
      select: {
        permission: true,
        note: {
          select: {
            id: true,
            title: true,
            content: true,
            updatedAt: true,
            user: {
              select: { name: true, email: true }
            }
          }
        }
      }
    });

    const notes = collaborations.map((c) => ({
      id: c.note.id,
      title: c.note.title,
      content: c.note.content,
      updatedAt: c.note.updatedAt,
      permission: c.permission,
      ownerName: c.note.user.name || c.note.user.email
    }));

    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all user's note IDs for cascading deletes
    const userNotes = await prisma.note.findMany({
      where: { userId },
      select: { id: true }
    });
    const noteIds = userNotes.map(n => n.id);

    // Delete in correct order to avoid FK violations
    // 1. Delete notifications (references both user and notes)
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { noteId: { in: noteIds } } });

    // 2. Delete collaborator entries (references both user and notes)
    await prisma.collaborator.deleteMany({ where: { userId } });
    await prisma.collaborator.deleteMany({ where: { noteId: { in: noteIds } } });

    // 3. Delete note versions (references notes)
    await prisma.noteVersion.deleteMany({ where: { noteId: { in: noteIds } } });

    // 4. Delete notes
    await prisma.note.deleteMany({ where: { userId } });

    // 5. Delete folders
    await prisma.folder.deleteMany({ where: { userId } });

    // 6. Delete the user
    await prisma.user.delete({ where: { id: userId } });

    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete account" });
  }
};

module.exports = {
  createNote,
  getMyNotes,
  getNotesByFolder,
  getNoteById,
  updateNote,
  deleteNote,
  searchNotes,
  getNoteHistory,
  generateShareLink,
  getSharedNote,
  updateSharedNote,
  getAllUserEmails,
  addCollaborator,
  getNotifications,
  markNotificationRead,
  getNoteForCollaborator,
  updateNoteForCollaborator,
  getCollaboratorNotes,
  getMe,
  deleteAccount
};
