const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://localhost:5173', // Update to your frontend's URL in production!
  credentials: true,
}));

// Static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => res.send('SkillMint Backend API Running!'));
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/skillmint'));
// app.use('/api/user', require('./routes/user'));


if (process.env.VERCEL) {
  module.exports = app;
} else {
  // --- Local Development (HTTPS) ---
  const fs = require('fs');
  const https = require('https');

  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'localhost+1-key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'localhost+1.pem')),
  };

  const PORT = process.env.PORT || 443;
  https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`🚀 SkillMint backend running locally on https://localhost:${PORT}`);
  });
}
