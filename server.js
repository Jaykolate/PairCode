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
import challengeRouter from './routes/challenge.js';
import jwt from 'jsonwebtoken';
import Match from './models/Match.js';
import Problem from './models/Problem.js';

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
app.use('/api/challenge', challengeRouter);

app.get(/^(?!\/socket\.io|^\/api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));

})

const userSocketMap = {};
const roomNotepadMap = {};

// 1v1 Challenge Mode structures
const userSocketIdMap = {};
const matchmakingQueue = [];
const rematchOffers = {};
const privateMatches = {};

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

  if (socket.user && socket.user.id) {
    userSocketIdMap[socket.user.id.toString()] = socket.id;
  }


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

    if (roomNotepadMap[roomId] !== undefined) {
      socket.emit('notepad-sync', { notepadContent: roomNotepadMap[roomId] });
    }
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code, language }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    io.to(socketId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
  });

  // Duplicate listener consolidated below

  socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
    socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
  });

  socket.on(ACTIONS.CURSOR_CHANGE, ({ roomId, pos, username }) => {
    socket.in(roomId).emit(ACTIONS.CURSOR_CHANGE, { pos, username, socketId: socket.id });
  });

  socket.on('notepad-update', ({ roomId, notepadContent }) => {
    roomNotepadMap[roomId] = notepadContent;
    socket.in(roomId).emit('notepad-update', { notepadContent });
  });

  // --- 1v1 CHALLENGE MATCHMAKING & PVP EVENTS ---
  socket.on('find-match', async () => {
    if (!socket.user) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    const userId = socket.user.id.toString();
    const username = socket.user.name || 'Anonymous';

    // Remove player if already in queue to prevent double registration
    const existingIndex = matchmakingQueue.findIndex(q => q.userId === userId);
    if (existingIndex !== -1) {
      matchmakingQueue.splice(existingIndex, 1);
    }

    // Check if there is another player waiting
    const opponent = matchmakingQueue.find(q => q.userId !== userId);
    if (opponent) {
      // Remove opponent from queue
      const oppIndex = matchmakingQueue.indexOf(opponent);
      if (oppIndex !== -1) {
        matchmakingQueue.splice(oppIndex, 1);
      }

      try {
        // Pick a random problem
        const problemCount = await Problem.countDocuments();
        if (problemCount === 0) {
          socket.emit('error', { message: 'No coding problems found in database.' });
          return;
        }
        const rand = Math.floor(Math.random() * problemCount);
        const problem = await Problem.findOne().skip(rand);

        // Create new Match record
        const match = new Match({
          problemId: problem._id,
          players: [
            { userId: opponent.userId, username: opponent.username, socketId: opponent.socketId, status: 'waiting', testsPassed: 0 },
            { userId: userId, username: username, socketId: socket.id, status: 'waiting', testsPassed: 0 }
          ],
          startTime: new Date(),
          status: 'active'
        });
        await match.save();

        // Emit match-found to both players
        const oppSocket = io.sockets.sockets.get(opponent.socketId);
        if (oppSocket) {
          oppSocket.emit('match-found', {
            matchId: match._id,
            opponentName: username,
            problemId: problem._id
          });
        }
        socket.emit('match-found', {
          matchId: match._id,
          opponentName: opponent.username,
          problemId: problem._id
        });
      } catch (err) {
        console.error('Error creating match:', err);
        socket.emit('error', { message: 'Failed to create match.' });
      }
    } else {
      // Add user to the matchmaking queue
      matchmakingQueue.push({ userId, username, socketId: socket.id });
    }
  });

  socket.on('cancel-match', () => {
    if (!socket.user) return;
    const userId = socket.user.id.toString();
    const idx = matchmakingQueue.findIndex(q => q.userId === userId);
    if (idx !== -1) {
      matchmakingQueue.splice(idx, 1);
    }
  });

  socket.on('create-private-match', ({ roomId }) => {
    console.log(`[create-private-match] Room: ${roomId}, socket.user:`, socket.user);
    if (!socket.user) {
      console.warn(`[create-private-match] Blocked: Socket user is undefined`);
      return;
    }
    privateMatches[roomId] = {
      userId: socket.user.id.toString(),
      username: socket.user.name || 'Anonymous',
      socketId: socket.id
    };
    console.log(`[create-private-match] Success. Room: ${roomId} hosted by: ${socket.user.name}`);
  });

  socket.on('cancel-private-match', ({ roomId }) => {
    delete privateMatches[roomId];
    console.log(`[cancel-private-match] Success. Room ${roomId} removed`);
  });

  socket.on('join-private-match', async ({ roomId }) => {
    console.log(`[join-private-match] Attempting join for Room: ${roomId}, socket.user:`, socket.user);
    if (!socket.user) {
      console.warn(`[join-private-match] Blocked: Socket user is undefined`);
      socket.emit('private-match-error', { message: 'Unauthorized' });
      return;
    }
    const host = privateMatches[roomId];
    if (!host) {
      console.warn(`[join-private-match] Room ${roomId} not found in privateMatches. Current keys:`, Object.keys(privateMatches));
      socket.emit('private-match-error', { message: 'Private room not found or expired.' });
      return;
    }

    const userId = socket.user.id.toString();
    const username = socket.user.name || 'Anonymous';

    if (host.userId === userId) {
      socket.emit('private-match-error', { message: 'You cannot join your own private room.' });
      return;
    }

    try {
      // Pick a random problem
      const problemCount = await Problem.countDocuments();
      if (problemCount === 0) {
        socket.emit('private-match-error', { message: 'No coding problems found in database.' });
        return;
      }
      const rand = Math.floor(Math.random() * problemCount);
      const problem = await Problem.findOne().skip(rand);

      // Create new Match record
      const match = new Match({
        problemId: problem._id,
        players: [
          { userId: host.userId, username: host.username, socketId: host.socketId, status: 'waiting', testsPassed: 0 },
          { userId: userId, username: username, socketId: socket.id, status: 'waiting', testsPassed: 0 }
        ],
        startTime: new Date(),
        status: 'active'
      });
      await match.save();

      // Emit match-found to both players
      const hostSocket = io.sockets.sockets.get(host.socketId);
      if (hostSocket) {
        hostSocket.emit('match-found', {
          matchId: match._id,
          opponentName: username,
          problemId: problem._id
        });
      }
      socket.emit('match-found', {
        matchId: match._id,
        opponentName: host.username,
        problemId: problem._id
      });

      // Clear private match room since pairing completed
      delete privateMatches[roomId];
      console.log(`Private match successfully started for room: ${roomId}. Match ID: ${match._id}`);
    } catch (err) {
      console.error('Error starting private match:', err);
      socket.emit('private-match-error', { message: 'Failed to start private match.' });
    }
  });

  socket.on('join-challenge-room', async ({ matchId }) => {
    socket.join(matchId);
    if (socket.user) {
      try {
        const match = await Match.findById(matchId);
        if (match) {
          const player = match.players.find(p => p.userId.toString() === socket.user.id.toString());
          if (player) {
            player.socketId = socket.id;
            await match.save();
          }
        }
      } catch (err) {
        console.error('Error updating player socketId:', err);
      }
    }
  });

  socket.on('run-code', async ({ matchId, code }) => {
    if (!socket.user) return;
    try {
      const match = await Match.findById(matchId);
      if (!match) return;

      const problem = await Problem.findById(match.problemId);
      if (!problem) return;

      const visibleCases = problem.visibleTestCases;
      let passedCount = 0;
      let summary = '';

      // Run against visible test cases using Judge0
      const runPromises = visibleCases.map(async (tc, index) => {
        try {
          const response = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source_code: code,
              language_id: 71, // Python
              stdin: tc.input
            })
          });
          const res = await response.json();
          const stdout = (res.stdout || "").trim();
          const expected = tc.expectedOutput.trim();
          const stderr = (res.stderr || res.compile_output || "").trim();

          const isPassed = stdout === expected;
          return { index, isPassed, stdout, stderr, error: null };
        } catch (err) {
          return { index, isPassed: false, stdout: "", stderr: "", error: err.message };
        }
      });

      const results = await Promise.all(runPromises);
      results.sort((a, b) => a.index - b.index);

      results.forEach(res => {
        if (res.error) {
          summary += `Test Case ${res.index + 1}: Connection Error - ${res.error}\n`;
        } else if (res.isPassed) {
          passedCount++;
          summary += `Test Case ${res.index + 1}: Passed ✅\n`;
        } else {
          summary += `Test Case ${res.index + 1}: Failed ❌\n   Expected: "${visibleCases[res.index].expectedOutput}"\n   Received: "${res.stdout}"\n`;
          if (res.stderr) {
            summary += `   Stderr: ${res.stderr}\n`;
          }
        }
      });

      socket.emit('run-result', { passed: passedCount, total: visibleCases.length, output: summary });
    } catch (err) {
      console.error('Error running code:', err);
      socket.emit('run-result', { passed: 0, total: 0, error: err.message });
    }
  });

  socket.on('submit-code', async ({ matchId, code }) => {
    if (!socket.user) return;
    const userId = socket.user.id.toString();

    try {
      const match = await Match.findById(matchId);
      if (!match || match.status === 'completed') return;

      const problem = await Problem.findById(match.problemId);
      if (!problem) return;

      const allCases = [...problem.visibleTestCases, ...problem.hiddenTestCases];
      let passedCount = 0;

      // Execute all test cases (visible + hidden) in parallel
      const submissionPromises = allCases.map(async (tc, index) => {
        try {
          const response = await fetch("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              source_code: code,
              language_id: 71, // Python
              stdin: tc.input
            })
          });
          const res = await response.json();
          const stdout = (res.stdout || "").trim();
          const expected = tc.expectedOutput.trim();
          const isPassed = stdout === expected;
          return { index, isPassed };
        } catch (err) {
          return { index, isPassed: false };
        }
      });

      const results = await Promise.all(submissionPromises);
      results.forEach(res => {
        if (res.isPassed) passedCount++;
      });

      const totalTests = allCases.length;
      const passedAll = passedCount === totalTests;

      // Update current player's submission status in match record
      const player = match.players.find(p => p.userId.toString() === userId);
      if (player) {
        player.testsPassed = passedCount;
        player.status = passedAll ? 'passed' : 'failed';
        player.submissionTime = new Date();
      }

      // Save match state
      await match.save();

      // Emit current progress to the room
      io.to(matchId).emit('opponent-progress', {
        userId,
        testsPassed: passedCount,
        total: totalTests,
        status: player.status
      });

      // Determine match resolution
      if (passedAll) {
        // First player to solve all test cases wins immediately!
        match.winner = userId;
        match.status = 'completed';
        match.endTime = new Date();
        await match.save();

        io.to(matchId).emit('match-result', {
          winner: userId,
          results: match.players
        });
      } else {
        // Check if both players have submitted
        const allSubmitted = match.players.every(p => p.status !== 'waiting');
        if (allSubmitted) {
          // Compare scores
          const p1 = match.players[0];
          const p2 = match.players[1];
          let winnerId = null;

          if (p1.testsPassed > p2.testsPassed) {
            winnerId = p1.userId;
          } else if (p2.testsPassed > p1.testsPassed) {
            winnerId = p2.userId;
          } else {
            // Tie-break: earlier submission wins
            if (p1.submissionTime && p2.submissionTime) {
              winnerId = p1.submissionTime < p2.submissionTime ? p1.userId : p2.userId;
            }
          }

          match.winner = winnerId;
          match.status = 'completed';
          match.endTime = new Date();
          await match.save();

          io.to(matchId).emit('match-result', {
            winner: winnerId,
            results: match.players
          });
        }
      }
    } catch (err) {
      console.error('Error submitting code:', err);
    }
  });

  socket.on('rematch-request', async ({ matchId }) => {
    if (!socket.user) return;
    const userId = socket.user.id.toString();

    if (!rematchOffers[matchId]) {
      rematchOffers[matchId] = new Set();
    }
    rematchOffers[matchId].add(userId);

    try {
      const match = await Match.findById(matchId);
      if (!match) return;

      const opponent = match.players.find(p => p.userId.toString() !== userId);
      if (opponent) {
        // Emit rematch-offered to opponent
        const oppSocketId = userSocketIdMap[opponent.userId.toString()];
        if (oppSocketId) {
          io.to(oppSocketId).emit('rematch-offered');
        }
      }
    } catch (err) {
      console.error('Error handling rematch request:', err);
    }
  });

  socket.on('rematch-accept', async ({ matchId }) => {
    if (!socket.user) return;
    const userId = socket.user.id.toString();

    try {
      const match = await Match.findById(matchId);
      if (!match) return;

      const opponent = match.players.find(p => p.userId.toString() !== userId);
      if (!opponent) return;

      const oppSocketId = userSocketIdMap[opponent.userId.toString()];

      // Pick a random problem (different from current if possible, or just random)
      const problemCount = await Problem.countDocuments();
      const rand = Math.floor(Math.random() * problemCount);
      const problem = await Problem.findOne().skip(rand);

      // Create new match
      const newMatch = new Match({
        problemId: problem._id,
        players: [
          { userId: opponent.userId, username: opponent.username, socketId: oppSocketId, status: 'waiting', testsPassed: 0 },
          { userId: userId, username: socket.user.name, socketId: socket.id, status: 'waiting', testsPassed: 0 }
        ],
        startTime: new Date(),
        status: 'active'
      });
      await newMatch.save();

      // Emit new match to both sockets
      if (oppSocketId) {
        io.to(oppSocketId).emit('match-found', {
          matchId: newMatch._id,
          opponentName: socket.user.name,
          problemId: problem._id
        });
      }
      socket.emit('match-found', {
        matchId: newMatch._id,
        opponentName: opponent.username,
        problemId: problem._id
      });

      // Clear rematch offers
      delete rematchOffers[matchId];
    } catch (err) {
      console.error('Error accepting rematch:', err);
    }
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

    if (socket.user && socket.user.id) {
      const userId = socket.user.id.toString();
      delete userSocketIdMap[userId];

      const idx = matchmakingQueue.findIndex(q => q.userId === userId);
      if (idx !== -1) {
        matchmakingQueue.splice(idx, 1);
      }

      // Clean up hosted private rooms by host socket ID
      Object.keys(privateMatches).forEach(roomId => {
        if (privateMatches[roomId].socketId === socket.id) {
          delete privateMatches[roomId];
          console.log(`Cleaned up hosted private room: ${roomId} due to host socket disconnect.`);
        }
      });
    }

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
