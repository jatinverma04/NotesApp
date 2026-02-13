# Collaborative Notes Application

A full-stack realtime collaborative notes application built with Node.js, Express, Prisma, React, and WebSockets.

## 🏗️ Architecture Overview

### Backend (Node.js + Express + Prisma)
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Realtime**: Raw WebSocket using `ws` library
- **Authentication**: JWT-based authentication
- **Conflict Resolution**: Version-based optimistic locking

### Frontend (React)
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS with dark mode support
- **State Management**: React Context API
- **Routing**: React Router v7
- **Realtime**: WebSocket client for collaborative editing

## 📁 Project Structure

```
notesApp/
├── server/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   │   ├── authController.js
│   │   │   ├── folderController.js
│   │   │   └── noteController.js
│   │   ├── middleware/       # Express middleware
│   │   │   └── authMiddleware.js
│   │   ├── routes/           # API routes
│   │   │   ├── authRoutes.js
│   │   │   ├── folderRoutes.js
│   │   │   └── noteRoutes.js
│   │   ├── websocket.js      # WebSocket server implementation
│   │   ├── app.js            # Express app configuration
│   │   ├── server.js         # HTTP server + WebSocket setup
│   │   └── prisma.js         # Prisma client instance
│   ├── prisma/
│   │   └── schema.prisma     # Database schema
│   └── package.json
│
└── client/
    ├── src/
    │   ├── components/       # Reusable React components
    │   │   ├── Header.jsx
    │   │   ├── Navbar.jsx
    │   │   ├── ProtectedRoute.jsx
    │   │   └── Sidebar.jsx
    │   ├── context/          # React Context providers
    │   │   └── AppContext.jsx
    │   ├── pages/            # Page components
    │   │   ├── Dashboard.jsx
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── NotesList.jsx
    │   │   └── NoteEditor.jsx
    │   ├── services/         # API and WebSocket services
    │   │   ├── api.js
    │   │   └── websocket.js
    │   ├── App.jsx           # Main app component
    │   └── main.jsx          # Entry point
    └── package.json
```

## 🔌 API Structure

### Authentication Endpoints
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive JWT token

### Notes Endpoints
- `GET /api/notes` - Get all notes for authenticated user
- `GET /api/notes/search?q=query` - Search notes by title/content
- `GET /api/notes/:id` - Get a specific note
- `GET /api/notes/:id/history` - Get version history for a note
- `GET /api/notes/folder/:folderId` - Get notes in a folder
- `POST /api/notes` - Create a new note
- `PUT /api/notes/:id` - Update a note
- `DELETE /api/notes/:id` - Delete a note

### Folders Endpoints
- `GET /api/folders` - Get all folders for authenticated user
- `POST /api/folders` - Create a new folder
- `DELETE /api/folders/:id` - Delete a folder

All endpoints (except auth) require JWT authentication via `Authorization: Bearer <token>` header.

## 🔄 WebSocket Realtime Design

### Connection
- **URL**: `ws://localhost:5000?token=<JWT_TOKEN>`
- **Authentication**: JWT token required in query string or Authorization header
- **Reconnection**: Automatic reconnection with exponential backoff (max 5 attempts)

### Message Protocol

#### Client → Server Messages

1. **Join Room**
```json
{
  "type": "join",
  "noteId": "uuid"
}
```

2. **Edit Note**
```json
{
  "type": "edit",
  "noteId": "uuid",
  "content": "note content",
  "version": 5
}
```

3. **Leave Room**
```json
{
  "type": "leave",
  "noteId": "uuid"
}
```

#### Server → Client Messages

1. **Joined Confirmation**
```json
{
  "type": "joined",
  "note": {
    "id": "uuid",
    "title": "Note Title",
    "content": "Note content",
    "version": 5
  }
}
```

2. **Edit Broadcast**
```json
{
  "type": "edit",
  "noteId": "uuid",
  "content": "updated content",
  "version": 6
}
```

3. **Edit Acknowledgment**
```json
{
  "type": "edit_ack",
  "noteId": "uuid",
  "version": 6
}
```

4. **Presence Update**
```json
{
  "type": "presence",
  "users": [
    { "userId": "uuid", "name": "User Name" }
  ]
}
```

5. **Resync (Conflict)**
```json
{
  "type": "resync",
  "note": {
    "id": "uuid",
    "title": "Note Title",
    "content": "server content",
    "version": 7
  }
}
```

6. **Error**
```json
{
  "type": "error",
  "message": "Error description"
}
```

### Room-Based Collaboration
- Each note is a separate room (identified by `noteId`)
- Clients join a room when they open a note
- Edits are broadcast to all clients in the same room (except the sender)
- Presence updates are sent when users join/leave

## ⚔️ Conflict Resolution Strategy

### Version-Based Optimistic Locking

1. **Version Field**: Each note has a `version` integer that increments on each update
2. **Client-Side**: Clients track the current version of the note they're editing
3. **Server-Side Check**: When an edit arrives:
   - If `clientVersion < serverVersion`: Conflict detected
   - Server sends `resync` message with latest content
   - Client updates local state and clears undo/redo stacks
4. **No Conflict**: If versions match or client version is newer:
   - Server updates the note
   - Increments version
   - Broadcasts to other clients
   - Sends acknowledgment to sender

### Benefits
- Prevents lost updates
- Handles concurrent edits gracefully
- Simple to implement and understand
- Works well for text-based collaboration

## 🗄️ Database Schema

```prisma
model User {
  id       String   @id @default(uuid())
  name     String
  email    String   @unique
  password String
  notes    Note[]
  folders  Folder[]
}

model Folder {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  notes     Note[]
}

model Note {
  id        String   @id @default(uuid())
  title     String
  content   String
  version   Int      @default(0)
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  folder    Folder?  @relation(fields: [folderId], references: [id])
  folderId  String?
  versions  NoteVersion[]
}

model NoteVersion {
  id        String   @id @default(uuid())
  noteId    String
  title     String
  content   String
  version   Int
  createdAt DateTime @default(now())
  note      Note     @relation(fields: [noteId], references: [id], onDelete: Cascade)
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Git

### Backend Setup

1. Navigate to server directory:
```bash
cd notesApp/server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/notesapp"
JWT_SECRET="your-secret-key-here"
PORT=5000
```

4. Run Prisma migrations:
```bash
npx prisma migrate dev --name init
```

5. Generate Prisma client:
```bash
npx prisma generate
```

6. Start the server:
```bash
npm run dev
```

Server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to client directory:
```bash
cd notesApp/client
```

2. Install dependencies:
```bash
npm install
```

3. Update API base URL in `src/services/api.js` if needed (default: `http://localhost:5000/api`)

4. Start the development server:
```bash
npm run dev
```

Frontend will run on `http://localhost:5173` (or another port if 5173 is taken)

## 📦 Deployment

### Backend Deployment

1. **Environment Variables**: Set in your hosting platform:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `PORT` (optional, defaults to 5000)

2. **Database**: Run migrations on production:
```bash
npx prisma migrate deploy
```

3. **Build**: No build step needed for Node.js, but ensure:
   - Dependencies are installed (`npm install --production`)
   - Node.js version matches (18+)

4. **Start**: Use a process manager like PM2:
```bash
pm2 start src/server.js --name notesapp-backend
```

### Frontend Deployment

1. **Build for production**:
```bash
npm run build
```

2. **Deploy** the `dist` folder to:
   - Static hosting (Vercel, Netlify, etc.)
   - CDN
   - Nginx/Apache server

3. **Update API URL**: Ensure `src/services/api.js` points to your production backend URL

4. **WebSocket URL**: Update WebSocket connection URL in `src/services/websocket.js` for production

### Example Deployment Commands

**Backend (using PM2)**:
```bash
cd notesApp/server
npm install --production
npx prisma migrate deploy
npx prisma generate
pm2 start src/server.js --name notesapp-backend
pm2 save
```

**Frontend (Vercel/Netlify)**:
```bash
cd notesApp/client
npm install
npm run build
# Deploy dist/ folder
```

## 🎨 Features

### Core Features
- ✅ User authentication (register/login)
- ✅ JWT-based session management
- ✅ Folder organization
- ✅ Create, read, update, delete notes
- ✅ Realtime collaborative editing
- ✅ Presence indicators (who's online)
- ✅ Conflict resolution with version control
- ✅ Search across notes
- ✅ Dark mode support
- ✅ Responsive design (mobile + desktop)

### Bonus Features
- ✅ Undo/Redo functionality (client-side)
- ✅ Version history (stored in database)
- ✅ Real-time presence updates

## 🔒 Security Considerations

1. **JWT Tokens**: Stored in localStorage (consider httpOnly cookies for production)
2. **Password Hashing**: Using bcryptjs with salt rounds
3. **CORS**: Configured for development (update for production)
4. **Input Validation**: Server-side validation for all inputs
5. **SQL Injection**: Protected by Prisma ORM
6. **WebSocket Auth**: JWT verified on connection

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Create/edit/delete folders
- [ ] Create/edit/delete notes
- [ ] Open note in multiple browser tabs (realtime sync)
- [ ] Test conflict resolution (edit same note simultaneously)
- [ ] Search functionality
- [ ] Dark mode toggle
- [ ] Presence indicators
- [ ] Undo/redo
- [ ] Version history

## 🐛 Troubleshooting

### WebSocket Connection Issues
- Check JWT token is valid
- Verify server is running on correct port
- Check CORS settings
- Verify WebSocket URL matches server

### Database Issues
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Run `npx prisma migrate dev` to apply migrations

### Build Issues
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version (18+ required)

## 📝 License

This project is provided as-is for educational purposes.

## 👥 Contributing

This is an assignment project. For improvements:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 🙏 Acknowledgments

- Built with Express.js, React, Prisma, and WebSockets
- Styled with Tailwind CSS
- Database: PostgreSQL

---

**Note**: This application uses raw WebSocket implementation (`ws` library) instead of Socket.io as per requirements. All realtime collaboration logic is implemented manually.

