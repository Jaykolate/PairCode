# PairCode 🚀

> **Real-Time Collaborative IDE with Gemini AI Review**

PairCode is a full-stack web application where developers can collaborate in a shared code editor in real time, get instant AI-powered code review via Google Gemini and execute code in a secure sandbox — all in the browser.

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://paircode.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-Jaykolate%2FPairCode-blue?logo=github)](https://github.com/Jaykolate/PairCode)

---

## ✨ Features

### 🤝 Real-Time Collaboration
- Multiple developers join a shared room using a unique Room ID
- Code changes, language switches, and cursor positions sync instantly across all participants
- Shared notepad panel for taking notes together during a session
- Live user presence list with join/leave notifications

### 🤖 Gemini AI Code Review
- Click **"AI Review"** to instantly analyze your code with Google Gemini 2.5 Flash
- Detects bugs, complexity issues, and style violations
- Returns structured feedback: `bugs`, `suggestions`, `quality rating (1–10)`, and a `summary`
- Review results auto-saved to your history (when logged in)

### 💬 Gemini AI Chat Panel
- Persistent multi-turn chatbot sidebar in the editor
- Automatically aware of the current code in the editor buffer
- Surfaces AI Review results directly in the chat conversation

### ⚡ Secure Code Execution
- Run code right in the browser via **Judge0** sandboxed execution
- Supports **Python**, **JavaScript**, and **Java**
- Execution output is broadcast to **all room members** simultaneously

### 🔐 Authentication
- Email/password registration & login
- **Google OAuth 2.0** sign-in
- JWT-based stateless authentication (7-day expiry)

### 📊 Dashboard & History
- View all past AI review sessions with ratings and timestamps
- Replay any past review's full feedback
- Delete individual history entries

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| Vite | Build tool & dev server |
| React Router DOM v7 | Client-side routing |
| Socket.IO Client | Real-time communication |
| CodeMirror 5 | Embedded code editor |
| React Hot Toast | Notifications |
| Vanilla CSS | Styling |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | REST API server |
| Socket.IO | WebSocket server |
| MongoDB + Mongoose | Database & ODM |
| Passport.js | Authentication strategies |
| JWT | Stateless auth tokens |
| bcryptjs | Password hashing |
| Google Gemini API | AI code review & chat |
| Judge0 API | Sandboxed code execution |

---

## 🏗️ Project Structure

```
PairCode/
├── server.js               # Express + Socket.IO server (all real-time logic)
├── Actions.js              # Socket event name constants
├── vite.config.js          # Vite configuration
│
├── routes/
│   ├── auth.js             # Register, login, Google OAuth
│   ├── review.js           # Gemini AI code review
│   ├── chat.js             # Gemini AI multi-turn chat
│   ├── history.js          # User session history CRUD
│
├── models/
│   ├── User.js             # User schema
│   ├── Session.js          # AI review history schema
│
├── middleware/
│   └── authMiddleware.js   # JWT verification middleware
│
└── src/                    # React frontend (Vite)
    ├── main.jsx            # Entry point
    ├── App.jsx             # Router & global layout
    ├── socket.js           # Socket.IO client singleton
    │
    ├── context/
    │   └── AuthContext.jsx # Global auth state (user, token, login, logout)
    │
    ├── pages/
    │   ├── LandingPage.jsx     # Marketing homepage
    │   ├── HomePage.jsx        # Join/create room
    │   ├── EditorPage.jsx      # Collaborative code editor
    │   ├── Dashboard.jsx       # User profile & review history
            │   ├── Login.jsx
    │   └── Register.jsx
    │
    └── Components/
        ├── Editor.jsx          # CodeMirror wrapper
        ├── AIChatPanel.jsx     # Gemini AI chat sidebar
        ├── NotepadPanel.jsx    # Shared notepad
        ├── ReviewPanel.jsx     # Displays AI review result
        ├── Client.jsx          # User avatar component
        └── ProtectedRoute.jsx  # Auth guard
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas URI)
- [Google Gemini API Key](https://ai.google.dev/)
- [Google OAuth Credentials](https://console.cloud.google.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/Jaykolate/PairCode.git
cd PairCode
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/paircode

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# URLs
VITE_BACKEND_URL=http://localhost:10000
VITE_FRONTEND_URL=http://localhost:5173

# Server Port
PORT=10000
```

### 5. Run the Application

**Development mode** (run both simultaneously):

```bash
# Terminal 1 — Start the backend server
npm run server:dev

# Terminal 2 — Start the Vite frontend
npm run dev
```

**Production mode:**

```bash
npm run build
npm run server:prod
```

The frontend is served as static files from the Express server at `http://localhost:10000`.

---

## 🔌 API Reference

| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create a new account |
| `POST` | `/api/auth/login` | No | Login, receive JWT |
| `GET` | `/api/auth/google` | No | Start Google OAuth flow |
| `POST` | `/api/review` | Optional | Run Gemini AI code review |
| `POST` | `/api/chat` | No | Send a message to Gemini AI chat |
| `GET` | `/api/history` | Yes | Get user's review history |
| `DELETE` | `/api/history/:id` | Yes | Delete a review session |

---

## 🔄 How Real-Time Works

### Collaborative Editor

```
User types code
    → emits CODE_CHANGE (via Socket.IO)
    → Server broadcasts to all others in the room
    → Their editors update instantly
```

---

## 🛣️ Routes

| Path | Page | Auth |
|---|---|---|
| `/` | Landing Page | No |
| `/join` | Create / Join Room | No |
| `/editor/:roomId` | Collaborative Editor | No |
| `/login` | Login | No |
| `/register` | Register | No |
| `/dashboard` | User Dashboard | ✅ Yes |

---

## 📦 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite frontend dev server |
| `npm run server:dev` | Start backend with nodemon (auto-reload) |
| `npm run server:prod` | Start backend in production mode |
| `npm run build` | Build frontend for production |
| `npm run lint` | Run ESLint |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is open source. See the [LICENSE](LICENSE) file for details.

---

<div align="center">
  Built with ❤️ using React, Node.js, Socket.IO, and Google Gemini AI
</div>