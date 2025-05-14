const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route for exchanging GitHub code for an access token
router.post('/github/exchange', authController.exchangeGithubCode);

// Route for initiating GitHub account linking with wallet
router.post('/github/challenge', authController.getChallenge);

// Route for linking GitHub account and wallet
router.post('/github/link', authController.linkGithub);

// Route to fetch user's GitHub profile and associated badges
router.get('/profile/github/:username', authController.getGithubProfile);

module.exports = router;
