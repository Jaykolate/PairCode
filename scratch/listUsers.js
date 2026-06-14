import mongoose from 'mongoose';
import User from '../models/User.js';
import 'dotenv/config';

async function listUsers() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/paircode');
  const users = await User.find({});
  console.log('Registered Users:');
  users.forEach(u => {
    console.log(`- Name: ${u.name}, Email: ${u.email}, ID: ${u._id}`);
  });
  await mongoose.disconnect();
}

listUsers();
