const {
  getOAuthConfig,
  missingConfigResponse,
  getGoogleAuthUrl,
  createOAuthState,
  oauthStateCookie,
} = require("./oauth-config");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { isConfigured, origin } = getOAuthConfig();
  if (!isConfigured) return missingConfigResponse(res);

  // CSRF: bind the Google redirect to an httpOnly state cookie.
  const state = createOAuthState();
  const googleUrl = getGoogleAuthUrl(state);
  res.setHeader("Set-Cookie", oauthStateCookie(state, 600, origin));

  // Decap CMS expects a postMessage handshake before the redirect.
  // We keep provider string "github" so Decap's github backend accepts the handshake.
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Signing in with Google…</title>
  </head>
  <body>
    <p>Redirecting to Google…</p>
    <script>
      (function () {
        var googleUrl = ${JSON.stringify(googleUrl)};
        var allowedOrigin = ${JSON.stringify(origin)};
        // Origin-only: never use "*" for auth handshake messages.
        if (window.opener) {
          window.opener.postMessage("authorizing:github", allowedOrigin);
        }
        window.location.replace(googleUrl);
      })();
    </script>
  </body>
</html>`);
};
