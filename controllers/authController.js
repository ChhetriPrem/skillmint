  // controllers/authController.js
  const supabase = require('../services/supabaseClient');
  const { verifySignature } = require('../utils/verifySignature');
  const axios = require('axios');
console.log("env",process.env.GITHUB_CLIENT_ID)
  // POST /api/auth/github/exchange
  exports.exchangeGithubCode = async (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "No code" });

    try {
      // Exchange code for access token
      const tokenRes = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        { headers: { Accept: "application/json" } }
      );
      const accessToken = tokenRes.data.access_token;
      if (!accessToken) return res.status(401).json({ error: "No access token" });

      // Fetch user profile
      const userRes = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const { login: username, avatar_url } = userRes.data;
      return res.json({ username, avatar_url, accessToken });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "GitHub OAuth failed" });
    }
  };
  // In-memory challenge store (use Redis/DB for prod)
  const challengeStore = new Map();

  /**
   * POST /api/auth/github/challenge
   * Body: { github_username }
   * Returns: { challenge }
   */
  exports.getChallenge = async (req, res) => {
    const { github_username } = req.body;
    if (!github_username) {
      return res.status(400).json({ error: 'Missing github_username' });
    }
    const challenge = `SkillMint-Link:${github_username}:${Math.random().toString(36).slice(2)}:${Date.now()}`;
    challengeStore.set(github_username, { challenge, expires: Date.now() + 5 * 60 * 1000 });
    return res.json({ challenge });
  };

  /**
   * POST /api/auth/github/link
   * Body: { github_username, wallet_address, signature, challenge }
   * Returns: { message, user, badges }
   */
  exports.linkGithub = async (req, res) => {
    const { github_username, wallet_address, signature, challenge } = req.body;
    if (!github_username || !wallet_address || !signature || !challenge) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    const stored = challengeStore.get(github_username);
    if (!stored || stored.challenge !== challenge || stored.expires < Date.now()) {
      return res.status(400).json({ error: 'Invalid or expired challenge' });
    }
    challengeStore.delete(github_username);

    const isValid = verifySignature(wallet_address, challenge, signature);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Upsert user by github_username, update wallet_address if exists
    const { data, error } = await supabase
  .from('users')
  .upsert(
    { github_username, wallet_address },
    { onConflict: 'github_username' }
  );

const { data: user, error: fetchError } = await supabase
  .from('users')
  .select('*')
  .eq('github_username', github_username)
  .single();

if (fetchError) {
  console.error('Supabase fetch error:', fetchError);
  return res.status(500).json({ error: fetchError.message });
}

    if (error) {
      console.error('Supabase upsert error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Fetch badges for this user
    let badges = [];
    try {
      const { data: badgeData, error: badgeError } = await supabase
        .from('badges')
        .select('*')
        .eq('github_username', github_username);

      if (badgeError) {
        console.error('Supabase badges fetch error:', badgeError);
      } else {
        badges = badgeData || [];
      }
    } catch (e) {
      console.error('Unexpected error fetching badges:', e);
    }

   return res.json({ message: 'Linked successfully', user, badges });

  };

  /**
   * GET /api/auth/profile/github/:username
   * Returns: { profile, badges }
   */
  exports.getGithubProfile = async (req, res) => {
    const username = req.params.username;
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('github_username', username)
        .single();

      if (userError || !user) {
        console.error('User not found:', userError);
        return res.status(404).json({ error: 'User not found' });
      }

      const { data: badges, error: badgeError } = await supabase
        .from('badges')
        .select('*')
        .eq('github_username', username);

      if (badgeError) {
        console.error('Error fetching badges:', badgeError);
        return res.status(500).json({ error: badgeError.message });
      }

      return res.json({ profile: user, badges });
    } catch (e) {
      console.error('Unexpected error:', e);
      return res.status(500).json({ error: 'Internal server error' });
    }

  };
