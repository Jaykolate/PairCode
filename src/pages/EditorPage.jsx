import { useEffect, useRef, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import Editor from '../Components/Editor.jsx';
import AIChatPanel from '../Components/AIChatPanel.jsx';
import NotepadPanel from '../Components/NotepadPanel.jsx';
import { initSocket } from '../socket.js';
import ACTIONS from '../../Actions.js';
import { useLocation, useNavigate, Navigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import '../App.css';
import '../EditorLayout.css';

const LANG_VERSION = { javascript: 63, java: 62, python: 71 };

export default function EditorPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const location = useLocation();
  const { token } = useContext(AuthContext);

  const socketRef = useRef(null);
  const codeRef = useRef('');

  const [language, setLanguage] = useState('javascript');
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [isReviewLoad, setIsReviewLoad] = useState(false);
  const [isOutputOpen, setIsOutputOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, ch: 1 });
  const [duration, setDuration] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [notepadContent, setNotepadContent] = useState('');
  const emitTimeoutRef = useRef(null);

  /* Socket setup */
  useEffect(() => {
    if (!location.state) return;

    const onError = () => { toast.error('Socket failed'); navigate('/'); };

    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on('connect_error', onError);
      socketRef.current.on('connect_failed', onError);

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId,
        username: location.state.username,
      });

      socketRef.current.on(ACTIONS.JOINED, ({ clients, socketId }) => {
        setClients(clients);
        if (socketId !== socketRef.current.id && codeRef.current) {
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            socketId,
            code: codeRef.current,
            language,
          });
        }
      });

      socketRef.current.on(ACTIONS.CODE_OUTPUT, ({ output, stderr, isCompiling: compiling }) => {
        if (compiling) {
          setIsCompiling(true);
          setOutput('');
          setIsOutputOpen(true);
        } else {
          setIsCompiling(false);
          setOutput(output || stderr || '');
          setIsOutputOpen(true);
        }
      });

      socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, ({ language }) => setLanguage(language));

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast(`${username} left`);
        setClients(prev => prev.filter(c => c.socketId !== socketId));
      });

      socketRef.current.on('notepad-update', ({ notepadContent }) => {
        setNotepadContent(notepadContent);
      });

      socketRef.current.on('notepad-sync', ({ notepadContent }) => {
        setNotepadContent(notepadContent || '');
      });
    };

    init();
    return () => socketRef.current?.disconnect();
  }, [location.state, roomId, navigate]);

  /* Duration timer */
  useEffect(() => {
    const t = setInterval(() => setDuration(d => d + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  if (!location.state) return <Navigate to="/" />;

  /* Handlers */
  const handleRun = () => {
    setIsOutputOpen(true);
    setIsCompiling(true);
    setOutput('');
    socketRef.current?.emit(ACTIONS.COMPILE_CODE, {
      roomId, code: codeRef.current,
      language, version: LANG_VERSION[language],
    });
  };

  const handleLangChange = (e) => {
    const l = e.target.value;
    setLanguage(l);
    socketRef.current?.emit(ACTIONS.LANGUAGE_CHANGE, { roomId, language: l });
  };

  const handleNotepadChange = (newText) => {
    setNotepadContent(newText);

    if (emitTimeoutRef.current) clearTimeout(emitTimeoutRef.current);
    emitTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('notepad-update', {
        roomId,
        notepadContent: newText,
      });
    }, 400);
  };

  const handleReview = async () => {
    setIsReviewLoad(true);
    setReviewData(null);
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || '';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}/api/review`, {
        method: 'POST', headers,
        body: JSON.stringify({ code: codeRef.current, language }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReviewData(data);
      if (token) {
        if (data.saved) {
          toast.success('AI Review complete (saved to history)');
        } else {
          toast.success('AI Review complete (session expired, log in again to save history)');
        }
      } else {
        toast.success('AI Review complete (log in to save history)');
      }
    } catch {
      toast.error('AI review failed');
    } finally {
      setIsReviewLoad(false);
    }
  };

  const ext = language === 'python' ? 'py' : language === 'java' ? 'java' : 'js';
  const shortRoom = roomId ? roomId.substring(0, 8) + '…' : '—';

  return (
    <div className="ep">

      {/* ── Toolbar ── */}
      <div className="ep-toolbar">
        <div className="ep-room-badge">{shortRoom}</div>

        <select
          className="ep-lang-select"
          value={language}
          onChange={handleLangChange}
        >
          <option value="javascript">JavaScript</option>
          <option value="java">Java</option>
          <option value="python">Python</option>
        </select>

        <div className="ep-spacer" />

        {/* avatars */}
        <div className="ep-avatars">
          {clients.slice(0, 4).map(c => (
            <div key={c.socketId} className="ep-ava" title={c.username}>
              {(c.username || '?')[0].toUpperCase()}
            </div>
          ))}
        </div>

        <button
          className="btn btn-ghost"
          onClick={() => { navigator.clipboard.writeText(roomId); toast.success('Room ID copied'); }}
        >Share</button>
        <button className="btn btn-ghost">Settings</button>
        <button className="btn btn-primary" onClick={handleRun}>▶ Run</button>
        <button
          className="btn btn-ghost"
          onClick={handleReview}
          disabled={isReviewLoad}
        >
          {isReviewLoad ? 'Reviewing…' : 'AI Review'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setIsNotepadOpen(v => !v)}
          title={isNotepadOpen ? 'Hide Notepad' : 'Show Notepad'}
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: 0 }}
        >
          {isNotepadOpen ? '📋 Hide' : '📋 Notepad'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setIsChatOpen(v => !v)}
          title={isChatOpen ? 'Hide AI panel' : 'Show AI panel'}
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: 0 }}
        >
          {isChatOpen ? '⌘ Hide' : '⌘ AI'}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="ep-body">

        {/* sidebar */}
        <div className="ep-sidebar">

          <div className="ep-sb-section">
            <div className="ep-sb-title">Files</div>
            <div className="ep-file active">main.{ext}</div>
          </div>

          <div className="ep-sb-section grow">
            <div className="ep-sb-title">Online — {clients.length}</div>
            {clients.map(c => (
              <div key={c.socketId} className="ep-user">
                <div className="ep-user-ava">
                  {(c.username || '?')[0].toUpperCase()}
                  <div className="ep-user-dot" />
                </div>
                <div className="ep-user-name">{c.username}</div>
              </div>
            ))}
          </div>

          <div className="ep-sb-section">
            <div className="ep-sb-title">Session</div>
            <div className="ep-stats">
              duration&nbsp;<span className="val">{duration}m</span><br />
              lang&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="val">{language}</span><br />
              judge0&nbsp;&nbsp;<span className="val" style={{ color: 'var(--accent)' }}>ready</span>
            </div>
            <button
              className="ep-sb-btn"
              onClick={() => navigate('/')}
            >Leave room</button>
          </div>

        </div>

        {/* center editor */}
        <div className="ep-center">

          <div className="ep-editor-tabs">
            <div className="ep-tab active">main.{ext}</div>
          </div>

          <div className="ep-code-wrap">
            <Editor
              socketRef={socketRef}
              roomId={roomId}
              language={language}
              onCodeChange={code => { codeRef.current = code; }}
              onCursorChange={pos => {
                setCursorPos(pos);
                socketRef.current?.emit(ACTIONS.CURSOR_CHANGE, {
                  roomId,
                  pos: { line: pos.line - 1, ch: pos.ch - 1 },
                  username: location.state?.username || 'Guest',
                });
              }}
            />
          </div>

          {/* output panel */}
          <div className={`ep-output ${isOutputOpen ? 'open' : ''}`}>
            <div className="ep-out-header">
              <span>Terminal — Judge0</span>
              <button className="ep-out-close" onClick={() => setIsOutputOpen(false)}>✕</button>
            </div>
            <div className="ep-out-body">
              {isCompiling ? (
                <p className="ep-out-line wait">Compiling and executing code...</p>
              ) : output ? (
                output.split('\n').map((l, i) => (
                  <p key={i} className="ep-out-line">{l}</p>
                ))
              ) : (
                <p className="ep-out-line wait">Awaiting execution…</p>
              )}
            </div>
          </div>

        </div>

        {/* Notepad panel */}
        {isNotepadOpen && (
          <NotepadPanel
            notepadContent={notepadContent}
            onNotepadChange={handleNotepadChange}
          />
        )}

        {/* AI chat panel */}
        {isChatOpen && (
          <AIChatPanel reviewData={reviewData} codeRef={codeRef} language={language} />
        )}

      </div>

      {/* ── Status bar ── */}
      <div className="ep-status">
        <div className="ep-status-group">
          <div className="ep-status-item">{language.toUpperCase()}</div>
          <div className="ep-status-item">Ln {cursorPos.line}, Col {cursorPos.ch}</div>
          <div className="ep-status-item">UTF-8</div>
        </div>
        <div className="ep-status-group">
          <div className="ep-status-item">
            <span className="ep-status-dot" />Judge0 API
          </div>
          <div className="ep-status-item">
            <span className="ep-status-dot" />Socket.IO
          </div>
        </div>
      </div>

    </div>
  );
}
