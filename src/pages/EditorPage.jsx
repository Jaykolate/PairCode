import { useEffect, useRef, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { ThemeContext } from '../context/ThemeContext.jsx';

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
  const { token, user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);

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

  // Multi-file state
  const [files, setFiles] = useState([{ filename: 'main.js', language: 'javascript', content: '' }]);
  const [activeFile, setActiveFile] = useState('main.js');

  // Settings & Room Info state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [roomName, setRoomName] = useState('Collaboration Room');
  const [roomPrivacy, setRoomPrivacy] = useState(false);

  const activeFileRef = useRef(activeFile);
  useEffect(() => {
    activeFileRef.current = activeFile;
  }, [activeFile]);

  // Output Resizer State & Handlers
  const [outputHeight, setOutputHeight] = useState(180);
  const isResizingRef = useRef(false);

  const startResizing = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizingRef.current) return;
      const epCenter = document.querySelector('.ep-center');
      if (epCenter) {
        const rect = epCenter.getBoundingClientRect();
        const newHeight = rect.bottom - e.clientY;
        const minHeight = 60;
        const maxHeight = rect.height * 0.8;
        if (newHeight >= minHeight && newHeight <= maxHeight) {
          setOutputHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);


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

      socketRef.current.on(ACTIONS.JOINED, ({ clients }) => {
        setClients(clients);
      });

      socketRef.current.on('room:sync', ({ files: syncedFiles, activeFile: syncedActiveFile, name, isPrivate }) => {
        setFiles(syncedFiles);
        setActiveFile(syncedActiveFile);
        if (name) setRoomName(name);
        if (isPrivate !== undefined) setRoomPrivacy(isPrivate);
        const actFileObj = syncedFiles.find(f => f.filename === syncedActiveFile);
        if (actFileObj) {
          setLanguage(actFileObj.language);
          codeRef.current = actFileObj.content || '';
        }
      });


      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ filename, code }) => {
        setFiles(prev => prev.map(f => f.filename === filename ? { ...f, content: code } : f));
        if (filename === activeFileRef.current) {
          codeRef.current = code;
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

  /* File Handlers */
  const handleCreateFile = () => {
    const filename = prompt('Enter filename (e.g., script.js, utils.py):');
    if (!filename) return;

    if (files.some(f => f.filename === filename)) {
      toast.error('File already exists');
      return;
    }

    const ext = filename.split('.').pop();
    let lang = 'javascript';
    if (ext === 'py') lang = 'python';
    else if (ext === 'java') lang = 'java';

    // Optimistically update locally
    setFiles(prev => [...prev, { filename, language: lang, content: '' }]);
    setActiveFile(filename);
    setLanguage(lang);
    codeRef.current = '';

    socketRef.current?.emit('file:create', { roomId, filename, language: lang });
  };

  const handleDeleteFile = (filename) => {
    if (files.length <= 1) {
      toast.error('Cannot delete the last remaining file');
      return;
    }

    if (confirm(`Are you sure you want to delete ${filename}?`)) {
      // Optimistically update locally
      const updatedFiles = files.filter(f => f.filename !== filename);
      setFiles(updatedFiles);
      if (activeFile === filename) {
        const nextActive = updatedFiles[0]?.filename || '';
        setActiveFile(nextActive);
        const actFileObj = updatedFiles[0];
        if (actFileObj) {
          setLanguage(actFileObj.language);
          codeRef.current = actFileObj.content || '';
        }
      }

      socketRef.current?.emit('file:delete', { roomId, filename });
    }
  };

  const handleRenameFile = (oldFilename) => {
    const newFilename = prompt('Enter new filename:', oldFilename);
    if (!newFilename || newFilename === oldFilename) return;

    if (files.some(f => f.filename === newFilename)) {
      toast.error('A file with that name already exists');
      return;
    }

    // Determine language from new extension
    const ext = newFilename.split('.').pop();
    let lang = 'javascript';
    if (ext === 'py') lang = 'python';
    else if (ext === 'java') lang = 'java';

    // Optimistically update locally
    setFiles(prev => prev.map(f => f.filename === oldFilename ? { ...f, filename: newFilename, language: lang } : f));
    if (activeFile === oldFilename) {
      setActiveFile(newFilename);
      setLanguage(lang);
    }

    socketRef.current?.emit('file:rename', { roomId, oldFilename, newFilename, language: lang });
  };

  const handleSelectFile = (filename) => {
    setActiveFile(filename);
    const actFileObj = files.find(f => f.filename === filename);
    if (actFileObj) {
      setLanguage(actFileObj.language);
      codeRef.current = actFileObj.content || '';
    }
    socketRef.current?.emit('file:select', { roomId, filename });
  };

  /* Handlers */
  const handleRun = () => {
    setIsOutputOpen(true);
    setIsCompiling(true);
    setOutput('');
    socketRef.current?.emit(ACTIONS.COMPILE_CODE, {
      roomId,
      code: codeRef.current,
      language,
      version: LANG_VERSION[language],
    });
  };

  const handleLangChange = (e) => {
    const l = e.target.value;
    setLanguage(l);
    
    // Automatically rename the active file's extension to match the new language
    const extMap = { javascript: 'js', python: 'py', java: 'java' };
    const targetExt = extMap[l];
    if (targetExt) {
      const dotIndex = activeFile.lastIndexOf('.');
      const baseName = dotIndex !== -1 ? activeFile.substring(0, dotIndex) : activeFile;
      const newFilename = `${baseName}.${targetExt}`;
      
      setFiles(prev => prev.map(f => f.filename === activeFile ? { ...f, filename: newFilename, language: l } : f));
      setActiveFile(newFilename);
      
      socketRef.current?.emit('file:rename', { roomId, oldFilename: activeFile, newFilename, language: l });
    }
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
        method: 'POST',
        headers,
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

  const shortRoom = roomId ? roomId.substring(0, 8) + '…' : '—';

  return (
    <div className="ep">

      {/* ── Toolbar ── */}
      <div className="ep-toolbar">
        <div className="ep-room-badge" title={`Room ID: ${roomId}`}>{roomName}</div>

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
        
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-ghost"
            onClick={() => setIsSettingsOpen(v => !v)}
          >⚙️ Settings</button>
          
          {isSettingsOpen && (
            <div className="ep-settings-card">
              {/* Header */}
              <div className="ep-settings-header">
                <span>Room Settings</span>
                <button className="ep-settings-close-btn" onClick={() => setIsSettingsOpen(false)}>✕</button>
              </div>

              {/* Account/Profile Section */}
              <div className="ep-settings-sec">
                <div className="ep-settings-sec-title">Account</div>
                {user ? (
                  <div className="ep-settings-profile">
                    <div className="ep-settings-avatar">
                      {(user.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="ep-settings-profile-info">
                      <div className="ep-settings-profile-name">{user.name}</div>
                      <div className="ep-settings-profile-email">{user.email}</div>
                    </div>
                    <button className="btn btn-ghost ep-settings-profile-btn" onClick={() => { logout(); toast.success('Logged out successfully'); navigate('/login'); }}>Logout</button>
                  </div>
                ) : (
                  <div className="ep-settings-auth-btns">
                    <button className="btn btn-ghost ep-settings-auth-btn" onClick={() => { setIsSettingsOpen(false); navigate('/login'); }}>Login</button>
                    <button className="btn btn-primary ep-settings-auth-btn" onClick={() => { setIsSettingsOpen(false); navigate('/register'); }}>Sign Up</button>
                  </div>
                )}
              </div>

              {/* Room Config Section */}
              <div className="ep-settings-sec">
                <div className="ep-settings-sec-title">Room Customization</div>
                <div className="ep-settings-row">
                  <label className="ep-settings-label">Name</label>
                  <input
                    type="text"
                    className="ep-settings-input"
                    value={roomName}
                    onChange={(e) => {
                      setRoomName(e.target.value);
                      socketRef.current?.emit('room:update-settings', { roomId, name: e.target.value });
                    }}
                  />
                </div>
                <div className="ep-settings-row ep-settings-row-checkbox">
                  <span className="ep-settings-label">Private Room</span>
                  <input
                    type="checkbox"
                    className="ep-settings-checkbox"
                    checked={roomPrivacy}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setRoomPrivacy(checked);
                      socketRef.current?.emit('room:update-settings', { roomId, isPrivate: checked });
                      toast.success(checked ? 'Room visibility set to Private' : 'Room visibility set to Public');
                    }}
                  />
                </div>
              </div>

              {/* Preferences Section */}
              <div className="ep-settings-sec">
                <div className="ep-settings-sec-title">Preferences</div>
                <div className="ep-settings-row ep-settings-row-theme">
                  <span className="ep-settings-label">Theme ({theme === 'dark' ? 'Dark' : 'Light'})</span>
                  <button className="ep-settings-theme-btn" onClick={toggleTheme}>
                    {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                  </button>
                </div>
              </div>

              {/* Navigation Section */}
              <div className="ep-settings-sec ep-settings-sec-nav">
                <button className="btn btn-ghost ep-settings-nav-btn" onClick={() => { setIsSettingsOpen(false); navigate('/dashboard'); }}>
                  🏠 Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

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
            <div className="ep-sb-title-wrap">
              <div className="ep-sb-title">Files</div>
              <button className="ep-add-file-btn" onClick={handleCreateFile} title="New File">+</button>
            </div>
            <div className="ep-files-list">
              {files.map(f => (
                <div
                  key={f.filename}
                  className={`ep-file ${activeFile === f.filename ? 'active' : ''}`}
                  onClick={() => handleSelectFile(f.filename)}
                >
                  <span className="ep-file-name-txt">{f.filename}</span>
                  <div className="ep-file-actions">
                    <button
                      className="ep-file-btn"
                      onClick={(e) => { e.stopPropagation(); handleRenameFile(f.filename); }}
                      title="Rename"
                    >✏️</button>
                    {files.length > 1 && (
                      <button
                        className="ep-file-btn"
                        onClick={(e) => { e.stopPropagation(); handleDeleteFile(f.filename); }}
                        title="Delete"
                      >✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
            {files.map(f => (
              <div
                key={f.filename}
                className={`ep-tab ${activeFile === f.filename ? 'active' : ''}`}
                onClick={() => handleSelectFile(f.filename)}
              >
                <span>{f.filename}</span>
                {files.length > 1 && (
                  <span
                    className="ep-tab-close-btn"
                    onClick={(e) => { e.stopPropagation(); handleDeleteFile(f.filename); }}
                  >✕</span>
                )}
              </div>
            ))}
          </div>

          <div className="ep-code-wrap">
            <Editor
              socketRef={socketRef}
              roomId={roomId}
              activeFile={files.find(f => f.filename === activeFile)}
              onCodeChange={code => {
                codeRef.current = code;
                setFiles(prev => prev.map(f => f.filename === activeFile ? { ...f, content: code } : f));
              }}
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
          <div className={`ep-output ${isOutputOpen ? 'open' : ''}`} style={{ height: `${outputHeight}px` }}>
            <div className="ep-output-resizer" onMouseDown={startResizing} />
            <div className="ep-out-header">
              <span>Terminal</span>
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
