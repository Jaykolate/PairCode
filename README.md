# PairCode

**Real-Time Collaborative Code Editor**

PairCode is a real-time collaborative code editor built with React, Vite, Socket.IO and CodeMirror. Multiple users can join the same room via a shared link and code together in real time with language support and synchronized editing.

---

## 🧠 Features

- 🔄 Real-time code collaboration using WebSockets  
- 👩‍💻 Code editor powered by CodeMirror  
- 📍 Rooms identified by unique IDs  
- 📌 Language selection (JavaScript & Java)  
- 📲 Copy room link to share with peers  
- 👤 Connected user list with live join/leave notifications  
- 📡 Simple backend with Express & Socket.IO

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Jaykolate/PairCode.git
cd PairCode
├─ src/
│   ├─ Components/
│   │   ├─ Editor.jsx
│   │   └─ Client.jsx
│   ├─ App.css
│   └─ main.jsx
├─ server.js
├─ Actions.js
├─ vite.config.js
├─ package.json
└─ README.md


💡 How It Works

1.A user enters a room ID and username.

2. Socket.IO connects the user to a room.

3. On join, all other clients receive a JOINED event.

4. Code changes emit CODE_CHANGE events.

5. New users request the current code via SYNC_CODE.