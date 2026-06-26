import { useState, useContext, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';
import { ThemeContext } from '../context/ThemeContext.jsx';
import '../LandingPage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  let [roomId, setRoomId] = useState('');
  let [username, setUsername] = useState('');

  useEffect(() => {
    if (user?.name) {
      setUsername(user.name);
    }
  }, [user]);


  const createNewRoom = (e) => {
    e.preventDefault();
    const id = uuidv4();
    setRoomId(id);
    toast.success('Created a new Room');
    console.log(id);
    //naviagte to editor page
  }
  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error('ROOM ID & username is required');
      return;
    }
    //naviagte
    navigate(`/editor/${roomId}`, {
      state: {
        username,
      }
    })

  }
  const handleInputEnter = (e) => {
    if (e.code === 'Enter') {
      joinRoom();
    }
  }


  return (
    <div className="homePageWrapper">
      {/* Background Grid & Glowing Aura */}
      <div className="lp-bg-grid-full" />
      <div className="lp-glow-full lp-glow-1" />
      <div className="lp-glow-full lp-glow-2" />

      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px' }}>
        {user ? (
          <>
            <Link to="/dashboard" className="btn run-btn" style={{ textDecoration: 'none' }}>Dashboard</Link>
            <button className="btn leave-btn" style={{ width: 'auto' }} onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn run-btn" style={{ textDecoration: 'none' }}>Login</Link>
          </>
        )}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span className="theme-toggle-icon">
            {theme === 'dark' ? '☀️' : '🌙'}
          </span>
        </button>
      </div>
      <div className="formWrapper">
        <div className="logo-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px' }}>
          <svg className="logo-svg" viewBox="0 0 100 100" width="48" height="48" style={{ filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.4))' }}>
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#00f2fe" />
              </linearGradient>
            </defs>
            {/* Linked / Overlapping brackets representing collaboration */}
            <path d="M 35,25 C 20,25 20,40 20,50 C 20,60 20,75 35,75" fill="none" stroke="url(#logoGrad)" strokeWidth="6" strokeLinecap="round" />
            <path d="M 65,25 C 80,25 80,40 80,50 C 80,60 80,75 65,75" fill="none" stroke="url(#logoGrad)" strokeWidth="6" strokeLinecap="round" />
            {/* A glowing connection line in the center */}
            <line x1="42" y1="50" x2="58" y2="50" stroke="url(#logoGrad)" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 8" style={{ animation: 'pulseLine 2s infinite' }} />
          </svg>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: '800', color: 'var(--brand-color)', letterSpacing: '-1px' }}>paircode</span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#6366f1', marginLeft: '3px', boxShadow: '0 0 6px #6366f1' }}></span>
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: '500' }}>Collaborative IDE</span>
        </div>

        <div className="formHeader">
          <h2 className="formTitle">Join Coding Room</h2>
          <p className="formSubtitle">Paste an invitation room ID or create a new workspace to start programming together.</p>
        </div>

        <div className="inputGroup">
          <div className="inputBlock">
            <label htmlFor="roomIdInput" className="inputLabel">Room ID</label>
            <input
              id="roomIdInput"
              type="text"
              className="inputBox"
              placeholder="Paste invitation ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyUp={handleInputEnter}
            />
          </div>

          <div className="inputBlock">
            <label htmlFor="usernameInput" className="inputLabel">Username</label>
            <input
              id="usernameInput"
              type="text"
              className="inputBox"
              placeholder="Choose your moniker"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyUp={handleInputEnter}
            />
          </div>

          <button className="btn joinBtn" onClick={joinRoom}>Join Workspace</button>

          <div className="formDivider" />

          <div className="formFooter">
            <span className="footerText">Need a new workspace?</span>
            <button type="button" onClick={createNewRoom} className="createRoomBtn">
              Create Room
            </button>
          </div>
        </div>
      </div>
      <footer>
        <h4>Built with 💖 by <a href="https://github.com/Jaykolate">Jay Kolate</a></h4>
      </footer>

    </div>


  )
}
