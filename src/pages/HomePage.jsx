import { useState, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.jsx';

export default function HomePage() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  let [roomId, setRoomId] = useState('');
  let [username, setUsername] = useState('');


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
      <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
        {user ? (
          <>
            <Link to="/history" className="btn run-btn" style={{ textDecoration: 'none', marginRight: '10px' }}>History</Link>
            <button className="btn leave-btn" style={{ width: 'auto' }} onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn run-btn" style={{ textDecoration: 'none', marginRight: '10px' }}>Login</Link>
          </>
        )}
      </div>
      <div className="formWrapper">
        <img className="image" src="./code.png" alt="paircode" />
        <h4 className="mainLabel">Paste invitation ROOM ID</h4>
        <div className="inputGroup">
          <input type="text" className="inputBox" placeholder="ROOM ID" value={roomId} onChange={(e) => setRoomId(e.target.value)} onKeyUp={handleInputEnter} />
          <input type="text" className="inputBox" placeholder="USERNAME" value={username} onChange={(e) => setUsername(e.target.value)} onKeyUp={handleInputEnter} />
          <button className="btn joinBtn" onClick={joinRoom}>Join</button>
          <span className="createInfo">
            If you don't have an invite then create <a onClick={createNewRoom} href="" className="createNewBtn">new Room</a>
          </span>
        </div>
      </div>
      <footer>
        <h4>Built with 💖 by <a href="https://github.com/Jaykolate">Jay Kolate</a></h4>
      </footer>

    </div>


  )
}
