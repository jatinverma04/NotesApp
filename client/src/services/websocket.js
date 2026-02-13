class WebSocketService {
  constructor() {
    this.ws = null;
    this.noteId = null;
    this.token = null;
    this.shareCode = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect(noteId, token, shareCode = null) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.noteId === noteId) {
      return;
    }

    if (this.ws) {
      this.disconnect();
    }

    this.noteId = noteId;
    this.token = token;
    this.shareCode = shareCode;

    const wsUrl = `ws://localhost:5000?token=${encodeURIComponent(token)}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      const joinMessage = {
        type: "join",
        noteId
      };
      if (shareCode) {
        joinMessage.shareCode = shareCode;
      }
      this.send(joinMessage);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (err) {
        this.emit("error", { message: "Invalid WebSocket message" });
      }
    };

    this.ws.onerror = () => { };

    this.ws.onclose = (event) => {
      this.ws = null;

      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          if (this.noteId && this.token) {
            this.connect(this.noteId, this.token, this.shareCode);
          }
        }, this.reconnectDelay * this.reconnectAttempts);
      } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit("error", { message: "Failed to reconnect to server" });
      }
    };
  }

  disconnect() {
    if (this.ws) {
      if (this.noteId) {
        try {
          this.send({
            type: "leave",
            noteId: this.noteId
          });
        } catch (_) { }
      }
      this.ws.close(1000, "Client disconnecting");
      this.ws = null;
    }
    this.noteId = null;
    this.token = null;
    this.shareCode = null;
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case "joined":
        this.emit("joined", message.note);
        break;
      case "edit":
        this.emit("edit", message);
        break;
      case "edit_ack":
        this.emit("edit_ack", message);
        break;
      case "presence":
        this.emit("presence", message.users);
        break;
      case "resync":
        this.emit("resync", message.note);
        break;
      case "error":
        this.emit("error", { message: message.message });
        break;
      default:
        break;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (_) { }
      });
    }
  }

  sendEdit(noteId, content, version) {
    this.send({
      type: "edit",
      noteId,
      content,
      version
    });
  }
}

export default new WebSocketService();

