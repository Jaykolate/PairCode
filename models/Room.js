import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    default: '',
  },
});

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },
  files: [FileSchema],
  activeFile: {
    type: String,
    default: 'main.js',
  },
}, { timestamps: true });

export default mongoose.model('Room', RoomSchema);
