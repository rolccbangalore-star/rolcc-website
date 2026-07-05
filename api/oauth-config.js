function getSiteOrigin() {
  if (process.env.OAUTH_ORIGIN) return process.env.OAUTH_ORIGIN.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return "https://www.rolcc.in";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://www.rolcc.in";
}

function getOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const origin = getSiteOrigin();
  const redirectUri = `${origin}/api/callback`;

  return { clientId, clientSecret, origin, redirectUri };
}

function missingConfigResponse(res) {
  return res.status(503).json({
    error: "CMS OAuth is not configured",
    hint: "Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in Vercel project settings.",
  });
}

async function exchangeCodeForToken(code) {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed (${response.status})`);
  }

  const data = await response.json();
  if (data.error || !data.access_token) {
    throw new Error(data.error_description || data.error || "Missing access token");
  }

  return data.access_token;
}

function authSuccessPage(token, origin) {
  const authPayload = JSON.stringify({ token, provider: "github" });
  const message = `authorization:github:success:${authPayload}`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ROLCC CMS — Login</title>
  </head>
  <body>
    <p>Login successful. You can close this window.</p>
    <script>
      (function () {
        var message = ${JSON.stringify(message)};
        var allowedOrigin = ${JSON.stringify(origin)};
        if (window.opener) {
          window.opener.postMessage(message, allowedOrigin);
          window.opener.postMessage(message, "*");
        }
        window.close();
      })();
    </script>
  </body>
</html>`;
}

function authErrorPage(message, origin) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>ROLCC CMS — Login failed</title>
  </head>
  <body>
    <p>${message}</p>
    <script>
      (function () {
        var allowedOrigin = ${JSON.stringify(origin)};
        if (window.opener) {
          var errorMessage = "authorization:github:error:" + ${JSON.stringify(message)};
          window.opener.postMessage(errorMessage, allowedOrigin);
          window.opener.postMessage(errorMessage, "*");
        }
      })();
    </script>
  </body>
</html>`;
}

module.exports = {
  getSiteOrigin,
  getOAuthConfig,
  missingConfigResponse,
  exchangeCodeForToken,
  authSuccessPage,
  authErrorPage,
};
