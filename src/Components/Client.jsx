
import Avatar from 'react-avatar';
export default function Client({username}) {
  return (
    <div className="client">
        <Avatar name={username} size={45} round ="14px" />
        <span className="userName">{username}</span>
    </div>
  )
}