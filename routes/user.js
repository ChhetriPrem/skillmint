const express = require('express');
const router = express.Router();

// In backend/routes/github.js
const { mintBadgeForUser } = require('../controllers/mintBageController');

// Inside an endpoint
router.post('/mint/badge', async (req, res) => {
  const { github_username, wallet_address, badge_name } = req.body;
  const result = await mintBadgeForUser(wallet_address, badge_name);
  res.json(result);
});

module.exports = router;