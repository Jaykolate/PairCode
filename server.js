import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import ACTIONS from './Actions.js';
import path from 'path';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite frontend
    methods: ["GET", "POST"],
  },
});
app.use(express.static('dist'));
app.use((req,res,next) =>{
  res.sendFile(path.join(__dirname,'dist','index.html'));

})

const userSocketMap ={};

function getAllConnectedClients(roomId) {
  const sockets = io.sockets.adapter.rooms.get(roomId) || new Set();

  return Array.from(sockets).map((socketId) => ({
    socketId,
    username: userSocketMap[socketId],
  }));
}

io.on('connection', (socket) => {
 
  socket.on(ACTIONS.JOIN,({roomId,username})=>{
        userSocketMap[socket.id]=username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({socketId})=>{
          io.to(socketId).emit(ACTIONS.JOINED,{
            clients,
            username,
            socketId:socket.id,
          });
        });
  });

  socket.on(ACTIONS.CODE_CHANGE,({roomId,code})=>{
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE,{code});
  });

  socket.on(ACTIONS.SYNC_CODE,({socketId,code})=>{
    io.to(socketId).emit(ACTIONS.CODE_CHANGE,{code});
  });




  socket.on('disconnecting',()=>{
    const rooms = [...socket.rooms];
    rooms.forEach((roomId)=>{
      socket.in(roomId).emit(ACTIONS.DISCONNECTED,{
        socketId:socket.id,
        username:userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});



const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
