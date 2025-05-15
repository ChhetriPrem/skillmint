// server.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://skillmint-fe.vercel.app', 
  credentials: true,
}));
console.log(process.env.SUPABASE_KEY , process.env.SUPABASE_URL);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.send('SkillMint Backend API Running!'));
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/skillmint'));
module.exports = app;
