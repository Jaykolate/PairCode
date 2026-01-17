import { useEffect, useRef, useState } from "react";
import Client from "../Components/Client.jsx";
import Editor from "../Components/Editor.jsx";
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
  const codeRef = useRef(null);
  const [language, setLanguage] = useState("javascript");
  const [clients, setClients] = useState([]);

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

      socketRef.current.on(ACTIONS.JOINED, ({ clients, username,socketId }) => {
        if (username !== location.state.username) {
          toast.success(`${username} joined the room`);
        }
        setClients(clients);
        socketRef.current.emit(ACTIONS.SYNC_CODE, {
          code:codeRef.current,
          socketId,
        }
        );
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
      socketRef.current?.off();
    };
  }, [location.state, roomId, navigate]);

  if (!location.state) {
    return <Navigate to="/" />;
  }

  return (
    <div className="mainWrap">
      <div className="aside">
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
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="javascript">JavaScript</option>
          <option value="java">Java</option>
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
          onCodeChange={(code)=>{
            codeRef.current = code;
          }}
        />
      </div>
    </div>
  );
}
