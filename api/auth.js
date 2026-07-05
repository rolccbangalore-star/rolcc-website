const { getOAuthConfig, missingConfigResponse } = require("./oauth-config");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { clientId, redirectUri, origin } = getOAuthConfig();
  if (!clientId) return missingConfigResponse(res);

  const scope = String(req.query.scope || "repo");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
  });
  const githubUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  // Decap CMS expects a postMessage handshake before the GitHub redirect.
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Signing in with GitHub…</title>
  </head>
  <body>
    <p>Redirecting to GitHub…</p>
    <script>
      (function () {
        var githubUrl = ${JSON.stringify(githubUrl)};
        var allowedOrigin = ${JSON.stringify(origin)};
        if (window.opener) {
          window.opener.postMessage("authorizing:github", allowedOrigin);
          window.opener.postMessage("authorizing:github", "*");
        }
        window.location.replace(githubUrl);
      })();
    </script>
  </body>
</html>`);
};
