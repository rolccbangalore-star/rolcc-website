const {
  getOAuthConfig,
  missingConfigResponse,
  exchangeCodeForToken,
  authSuccessPage,
  authErrorPage,
} = require("./oauth-config");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { clientId, origin } = getOAuthConfig();
  if (!clientId) return missingConfigResponse(res);

  const code = req.query.code;
  if (!code) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(400).send(authErrorPage("Missing authorization code from GitHub.", origin));
  }

  try {
    const token = await exchangeCodeForToken(code);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(authSuccessPage(token, origin));
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(authErrorPage("Login failed. Please close this window and try again.", origin));
  }
};
