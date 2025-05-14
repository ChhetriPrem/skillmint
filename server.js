const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'https://localhost:5173',
  credentials: true, // If you're using cookies or sessions
}));

// Static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => res.send('SkillMint Backend API Running!'));
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/skillmint'));
// app.use('/api/user', require('./routes/user'));

// Load HTTPS certificate and key
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'localhost+1-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'localhost+1.pem')),
};

// Create HTTPS server
const PORT = process.env.PORT || 443;
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`🚀 SkillMint backend running on https://localhost:${PORT}`);
});
