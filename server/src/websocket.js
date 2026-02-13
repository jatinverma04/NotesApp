const WebSocket = require("ws");
const jwt = require("jsonwebtoken");
const prisma = require("./prisma");

const rooms = {};
const userCache = {};

const getUserName = async (userId) => {
  if (userCache[userId]) {
    return userCache[userId].name;
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });
    if (user) {
      userCache[userId] = { name: user.name };
      return user.name;
    }
  } catch (err) {
  }
  return "Unknown User";
};

const broadcastPresence = async (noteId) => {
  if (!rooms[noteId] || rooms[noteId].size === 0) return;

  const users = [];
  for (const client of rooms[noteId]) {
    if (client.readyState === WebSocket.OPEN) {
      users.push({
        userId: client.userId,
        name: client.userName || "Unknown User"
      });
    }
  }

  const presenceMessage = JSON.stringify({
    type: "presence",
    users
  });

  rooms[noteId].forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(presenceMessage);
      } catch (err) {
      }
    }
  });
};

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({
    server,
    verifyClient: () => true
  });

  wss.on("connection", async (ws, req) => {
    let clientInfo = null;

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      let token = url.searchParams.get("token");

      if (!token && req.headers.authorization) {
        const authHeader = req.headers.authorization;
        if (authHeader.startsWith("Bearer ")) {
          token = authHeader.split(" ")[1];
        }
      }

      if (!token) {
        ws.close(1008, "Authentication token required");
        return;
      }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        ws.close(1008, "Invalid or expired token");
        return;
      }

      const userId = decoded.userId;
      const userName = await getUserName(userId);
      clientInfo = {
        ws,
        userId,
        userName,
        noteId: null
      };

      ws.userId = userId;
      ws.userName = userName;
      ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString());

          switch (message.type) {
            case "join":
              await handleJoin(ws, message, clientInfo);
              break;

            case "edit":
              await handleEdit(ws, message, clientInfo);
              break;

            case "leave":
              handleLeave(ws, message, clientInfo);
              break;

            default:
              ws.send(JSON.stringify({
                type: "error",
                message: "Unknown message type"
              }));
          }
        } catch (err) {
          ws.send(JSON.stringify({
            type: "error",
            message: "Invalid message format"
          }));
        }
      });

      ws.on("close", () => {
        if (clientInfo && clientInfo.noteId) {
          handleLeave(ws, { type: "leave", noteId: clientInfo.noteId }, clientInfo);
        }
      });

      ws.on("error", () => { });

    } catch (err) {
      ws.close(1011, "Internal server error");
    }
  });

};

const handleJoin = async (ws, message, clientInfo) => {
  try {
    const { noteId } = message;

    if (!noteId) {
      ws.send(JSON.stringify({
        type: "error",
        message: "noteId is required for join"
      }));
      return;
    }

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        OR: [
          { userId: clientInfo.userId },
          {
            collaborators: {
              some: {
                userId: clientInfo.userId,
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
        version: true
      }
    });

    if (!note) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Access denied. You need to be the owner or have edit permission."
      }));
      return;
    }

    if (clientInfo.noteId && rooms[clientInfo.noteId]) {
      rooms[clientInfo.noteId].delete(ws);
      if (rooms[clientInfo.noteId].size === 0) {
        delete rooms[clientInfo.noteId];
      }
    }

    if (!rooms[noteId]) {
      rooms[noteId] = new Set();
    }
    rooms[noteId].add(ws);
    clientInfo.noteId = noteId;
    ws.noteId = noteId;

    ws.send(JSON.stringify({
      type: "joined",
      note: {
        id: note.id,
        title: note.title,
        content: note.content,
        version: note.version
      }
    }));

    await broadcastPresence(noteId);
  } catch (err) {
    ws.send(JSON.stringify({
      type: "error",
      message: "Failed to join note"
    }));
  }
};

const handleEdit = async (ws, message, clientInfo) => {
  try {
    const { noteId, content, version } = message;

    if (!noteId || content === undefined || version === undefined) {
      ws.send(JSON.stringify({
        type: "error",
        message: "noteId, content, and version are required for edit"
      }));
      return;
    }

    if (clientInfo.noteId !== noteId) {
      return;
    }

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        OR: [
          { userId: clientInfo.userId },
          {
            collaborators: {
              some: {
                userId: clientInfo.userId,
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
        version: true
      }
    });

    if (!note) {
      ws.send(JSON.stringify({
        type: "error",
        message: "Note not found or access denied"
      }));
      return;
    }

    if (version < note.version) {
      ws.send(JSON.stringify({
        type: "resync",
        note: {
          id: note.id,
          title: note.title,
          content: note.content,
          version: note.version
        }
      }));
      return;
    }

    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        content,
        version: { increment: 1 }
      }
    });

    // Create history entry
    try {
      await prisma.noteVersion.create({
        data: {
          noteId: note.id,
          title: note.title,
          content: note.content,
          version: note.version
        }
      });
    } catch (err) {
      // Ignore version creation failure
    }

    const editMessage = JSON.stringify({
      type: "edit",
      noteId,
      content: updatedNote.content,
      version: updatedNote.version
    });

    if (rooms[noteId]) {
      rooms[noteId].forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          try {
            client.send(editMessage);
          } catch (err) {
            // Ignore send failures
          }
        }
      });
    }

    ws.send(JSON.stringify({
      type: "edit_ack",
      noteId,
      version: updatedNote.version
    }));

  } catch (err) {
    ws.send(JSON.stringify({
      type: "error",
      message: "Failed to update note"
    }));
  }
};

const handleLeave = async (ws, message, clientInfo) => {
  try {
    const noteId = message.noteId || clientInfo.noteId;

    if (noteId && rooms[noteId]) {
      rooms[noteId].delete(ws);

      if (rooms[noteId].size === 0) {
        delete rooms[noteId];
      } else {
        await broadcastPresence(noteId);
      }
    }

    clientInfo.noteId = null;
    ws.noteId = null;
  } catch (err) {
  }
};

module.exports = setupWebSocket;
