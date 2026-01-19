import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import ACTIONS from './Actions.js';
import path from 'path';
import fetch from "node-fetch";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true, // Vite frontend
    methods: ["GET", "POST"],
  },
});
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/^(?!\/socket\.io).*/ ,(req,res) =>{
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
  console.log("✅ Socket connected:", socket.id);

 
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

  socket.on(ACTIONS.SYNC_CODE,({socketId,code,language})=>{
    io.to(socketId).emit(ACTIONS.CODE_CHANGE,{code});
    io.to(socketId).emit(ACTIONS.LANGUAGE_CHANGE,{language});
  });

  socket.on(ACTIONS.COMPILE_CODE,async({code,roomId,language,version})=>{
  try{
    const response =await fetch("https://emkc.org/api/v2/piston/execute",{
       method:"POST",
       headers:{
        "Content-Type":"application/json",
       },
       body:JSON.stringify({
        language,
        version,
        files:[{
          content:code,
        },
      ],
       }),
    });

    const result = await response.json();

    io.to(roomId).emit(ACTIONS.CODE_OUTPUT,{
      output:result.run.output,
      stderr:result.run.stderr,
    });
  }catch(error){
    io.to(roomId).emit(ACTIONS.CODE_OUTPUT,{
      output:"",
      stderr:"Error executing code",
    });
  }
});

socket.on(ACTIONS.LANGUAGE_CHANGE,({roomId,language})=>{
  socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE,{language});
})




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



const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on port ${PORT}`);
});
