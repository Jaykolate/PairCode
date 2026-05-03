import { useEffect, useRef, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import Client from "../Components/Client.jsx";
import Editor from "../Components/Editor.jsx";
import ReviewPanel from "../Components/ReviewPanel.jsx";

import { initSocket } from "../socket.js";
import ACTIONS from "../../Actions.js";
import { useLocation, useNavigate, Navigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import "../App.css";

export default function EditorPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();

  const socketRef = useRef(null);
  const codeRef = useRef("");
  const [language, setLanguage] = useState("javascript");
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [reviewData, setReviewData] = useState(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    if (!location.state) return;

    const handleError = (e) => {
      console.error("Socket connection error", e);
      toast.error("Socket connection failed, try again later.");
      navigate("/");
    };

    const init = async () => {
      socketRef.current = await initSocket();

      socketRef.current.on("connect_error", handleError);
      socketRef.current.on("connect_failed", handleError);

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state.username,
      });

      socketRef.current.on(ACTIONS.JOINED, ({ clients, username, socketId }) => {
        setClients(clients);

        // only first client syncs code
        if (socketId !== socketRef.current.id && codeRef.current) {
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            socketId,
            code: codeRef.current,
            language,
          });
        }
      });

      socketRef.current.on(ACTIONS.CODE_OUTPUT, ({ output, stderr }) => {
        setOutput(output || stderr);
      });

      socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, ({ language }) => {
        setLanguage(language);
      });



      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast(`${username} left the room`);
        setClients((prev) =>
          prev.filter((client) => client.socketId !== socketId)
        );
      });

    };

    init();

    return () => {
      socketRef.current?.disconnect();

    };
  }, [location.state, roomId, navigate]);

  const languageVersionMap = {
    javascript: 63,
    java: 62,
    python: 71,
  };

  const handelRunCode = () => {
    socketRef.current.emit(ACTIONS.COMPILE_CODE, {
      roomId,
      code: codeRef.current,
      language,
      version: languageVersionMap[language],
    });
  };
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang); // Update local UI

    // Notify others
    socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
      roomId,
      language: newLang,
    });
  };

  const handleReview = async () => {
    setShowReviewPanel(true);
    setIsReviewLoading(true);
    setReviewData(null);
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${baseUrl}/api/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: codeRef.current,
          language
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch review');
      }

      const data = await response.json();
      setReviewData(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch code review");
      setShowReviewPanel(false);
    } finally {
      setIsReviewLoading(false);
    }
  };


  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <div className="mainWrap">
      <div className="mobile-header">
        <button className="hamburger-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? '✖' : '☰'}
        </button>
        <span className="mobile-title">PairCode</span>
      </div>

      <div className={`aside ${isSidebarOpen ? 'open' : ''}`}>

        <div className="asideinner">
          <div className="logo">
            <img className="logoImage" src="/code.png" alt="logo" />
          </div>

          <h3>Connected</h3>
          <div className="ClientList">
            {clients.map((client) => (
              <Client
                key={client.socketId}
                username={client.username}
              />
            ))}
          </div>
        </div>

        <p className="select-lang">Select Language 🙂</p>
        <select
          className="languageSelect"
          value={language}
          onChange={handleLanguageChange}
        >
          <option value="javascript">JavaScript</option>
          <option value="java">Java</option>
          <option value="python">python</option>
        </select>

        <button
          className="btn copy-btn"
          onClick={() => {
            navigator.clipboard.writeText(roomId);
            toast.success("Room ID copied!");
          }}
        >
          Copy Room ID
        </button>

        <button
          className="btn leave-btn"
          onClick={() => navigate("/")}
        >
          Leave Room
        </button>
      </div>

      <div className="editorWrap">
        <Editor
          socketRef={socketRef}
          roomId={roomId}
          language={language}
          onCodeChange={(code) => {
            codeRef.current = code;
          }}
        />
        <div className="btn-container">
          <button className="btn run-btn" onClick={handelRunCode}>
            ▶ Run Code
          </button>
          <button className="btn ai-review-btn" onClick={handleReview} disabled={isReviewLoading}>
            ⚡ AI Review
          </button>
        </div>
        <textarea className="outputBox"
          value={output}
          readOnly
          placeholder="Output will appear here!"
        />
        {showReviewPanel && (
          <ReviewPanel
            review={reviewData}
            isLoading={isReviewLoading}
            onClose={() => setShowReviewPanel(false)}
          />
        )}

      </div>
    </div>
  );
}
