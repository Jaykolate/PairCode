import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import ACTIONS from './Actions.js';
import path from 'path';
import fetch from "node-fetch";
import { fileURLToPath } from 'url';
import 'dotenv/config';
import mongoose from 'mongoose';
import passport from 'passport';
import reviewRouter from './routes/review.js';
import authRouter from './routes/auth.js';
import historyRouter from './routes/history.js';
import chatRouter from './routes/chat.js';
import jwt from 'jsonwebtoken';
import Room from './models/Room.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// Enable CORS for frontend requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/paircode')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('MongoDB Connection Error:', err));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true, // Vite frontend
    methods: ["GET", "POST"],
  },
});

// Socket.io JWT authentication middleware (optional, doesn't block guests in collab rooms)
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  console.log(`[Socket Auth] Connection handshake. Token:`, token ? `${token.substring(0, 25)}...` : 'None');
  if (token) {
    try {
      const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET || 'secret');
      socket.user = decoded;
      console.log(`[Socket Auth] JWT Verified. User:`, decoded.name, decoded.id);
    } catch (err) {
      console.warn("[Socket Auth] JWT verification failed:", err.message);
    }
  } else {
    console.log(`[Socket Auth] No token provided in handshake`);
  }
  next();
});
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json());
app.use(passport.initialize());
app.use('/api/review', reviewRouter);
app.use('/api/auth', authRouter);
app.use('/api/history', historyRouter);
app.use('/api/chat', chatRouter);

app.get(/^(?!\/socket\.io|^\/api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));

})

const userSocketMap = {};
const roomNotepadMap = {};


function getAllConnectedClients(roomId) {
  const sockets = io.sockets.adapter.rooms.get(roomId) || new Set();

  return Array.from(sockets).map((socketId) => ({
    socketId,
    username: userSocketMap[socketId],
  }));
}
const languageIdMap = {
  javascript: 63,
  java: 62,
  python: 71,
};

io.on('connection', (socket) => {
  console.log("✅ Socket connected:", socket.id);


  socket.on(ACTIONS.JOIN, async ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });

    try {
      let room = await Room.findOne({ roomId });
      if (!room) {
        room = new Room({
          roomId,
          files: [{ filename: 'main.js', language: 'javascript', content: '' }],
          activeFile: 'main.js'
        });
        await room.save();
      }
      socket.emit('room:sync', { files: room.files, activeFile: room.activeFile, name: room.name, isPrivate: room.isPrivate });
    } catch (err) {
      console.error('Error in ACTIONS.JOIN database operation:', err);
    }

    if (roomNotepadMap[roomId] !== undefined) {
      socket.emit('notepad-sync', { notepadContent: roomNotepadMap[roomId] });
    }
  });

  socket.on(ACTIONS.CODE_CHANGE, async ({ roomId, filename, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { filename, code });
    try {
      await Room.updateOne(
        { roomId, 'files.filename': filename },
        { $set: { 'files.$.content': code } }
      );
    } catch (err) {
      console.error('Error saving code change:', err);
    }
  });

  socket.on('file:create', async ({ roomId, filename, language }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (room) {
        const exists = room.files.some(f => f.filename === filename);
        if (!exists) {
          room.files.push({ filename, language, content: '' });
          room.activeFile = filename;
          await room.save();
          io.to(roomId).emit('room:sync', { files: room.files, activeFile: room.activeFile, name: room.name, isPrivate: room.isPrivate });
        }
      }
    } catch (err) {
      console.error('Error creating file:', err);
    }
  });

  socket.on('file:delete', async ({ roomId, filename }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (room) {
        room.files = room.files.filter(f => f.filename !== filename);
        if (room.activeFile === filename) {
          room.activeFile = room.files[0]?.filename || '';
        }
        await room.save();
        io.to(roomId).emit('room:sync', { files: room.files, activeFile: room.activeFile, name: room.name, isPrivate: room.isPrivate });
      }
    } catch (err) {
      console.error('Error deleting file:', err);
    }
  });

  socket.on('file:rename', async ({ roomId, oldFilename, newFilename, language }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (room) {
        const file = room.files.find(f => f.filename === oldFilename);
        if (file) {
          file.filename = newFilename;
          if (language) {
            file.language = language;
          } else {
            const ext = newFilename.split('.').pop();
            if (ext === 'py') file.language = 'python';
            else if (ext === 'java') file.language = 'java';
            else if (ext === 'js') file.language = 'javascript';
          }
        }
        if (room.activeFile === oldFilename) {
          room.activeFile = newFilename;
        }
        await room.save();
        io.to(roomId).emit('room:sync', { files: room.files, activeFile: room.activeFile, name: room.name, isPrivate: room.isPrivate });
      }
    } catch (err) {
      console.error('Error renaming file:', err);
    }
  });

  socket.on('file:select', async ({ roomId, filename }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (room) {
        room.activeFile = filename;
        await room.save();
        io.to(roomId).emit('room:sync', { files: room.files, activeFile: room.activeFile, name: room.name, isPrivate: room.isPrivate });
      }
    } catch (err) {
      console.error('Error selecting active file:', err);
    }
  });

  socket.on('room:update-settings', async ({ roomId, name, isPrivate }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (room) {
        if (name !== undefined) room.name = name;
        if (isPrivate !== undefined) room.isPrivate = isPrivate;
        await room.save();
        io.to(roomId).emit('room:sync', {
          files: room.files,
          activeFile: room.activeFile,
          name: room.name,
          isPrivate: room.isPrivate
        });
      }
    } catch (err) {
      console.error('Error updating room settings:', err);
    }
  });


  socket.on(ACTIONS.CURSOR_CHANGE, ({ roomId, pos, username }) => {
    socket.in(roomId).emit(ACTIONS.CURSOR_CHANGE, { pos, username, socketId: socket.id });
  });

  socket.on('notepad-update', ({ roomId, notepadContent }) => {
    roomNotepadMap[roomId] = notepadContent;
    socket.in(roomId).emit('notepad-update', { notepadContent });
  });
  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });

      // Clean up in-memory notepad state if this is the last user leaving
      const clients = io.sockets.adapter.rooms.get(roomId);
      if (clients && clients.size <= 1) {
        delete roomNotepadMap[roomId];
      }
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
  socket.on(ACTIONS.COMPILE_CODE, async ({ code, roomId, language, version }) => {
    // Broadcast compiling start indicator to all session participants
    io.to(roomId).emit(ACTIONS.CODE_OUTPUT, { output: '', stderr: '', isCompiling: true });
    try {
      const response = await fetch(
        "https://ce.judge0.com/submissions?base64_encoded=false&wait=true",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_code: code,
            language_id: languageIdMap[language],
            stdin: "",
          }),
        }
      );


      const result = await response.json();
     

      io.to(roomId).emit(ACTIONS.CODE_OUTPUT, {
        output: result.stdout || "",
        stderr: result.stderr || result.compile_output || "",
      });

    } catch (error) {
     
      io.to(roomId).emit(ACTIONS.CODE_OUTPUT, {
        output: "",
        stderr: "Error executing code: " + error.message,
      });
    }
  });

});




const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on port ${PORT}`);
});
