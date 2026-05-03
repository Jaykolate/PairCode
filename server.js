import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import ACTIONS from './Actions.js';
import path from 'path';
import fetch from "node-fetch";
import { fileURLToPath } from 'url';
import 'dotenv/config';
import mongoose from 'mongoose';
import reviewRouter from './routes/review.js';
import authRouter from './routes/auth.js';
import historyRouter from './routes/history.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

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
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.json());
app.use('/api/review', reviewRouter);
app.use('/api/auth', authRouter);
app.use('/api/history', historyRouter);

app.get(/^(?!\/socket\.io|^\/api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));

})

const userSocketMap = {};

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


  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
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
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code, language }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    io.to(socketId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
  });

  socket.on(ACTIONS.COMPILE_CODE, async ({ code, roomId, language, version }) => {
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
        stderr: "Error executing code",
      });
    }
  });

  socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
    socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
  })




  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
  socket.on(ACTIONS.COMPILE_CODE, async ({ code, roomId, language, version }) => {
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
      console.log("Judge0 result:", result); // 👈 add this

      io.to(roomId).emit(ACTIONS.CODE_OUTPUT, {
        output: result.stdout || "",
        stderr: result.stderr || result.compile_output || "",
      });

    } catch (error) {
      console.error("Judge0 error:", error); // 👈 and this
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
