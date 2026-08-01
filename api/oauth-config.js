const crypto = require("crypto");

function getSiteOrigin() {
  if (process.env.OAUTH_ORIGIN) return process.env.OAUTH_ORIGIN.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") return "https://www.rolcc.in";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://www.rolcc.in";
}

function getOAuthConfig() {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const allowedEmails = process.env.ALLOWED_EDITOR_EMAILS;
  const githubAppId = process.env.GITHUB_APP_ID;
  const githubAppInstallationId = process.env.GITHUB_APP_INSTALLATION_ID;
  const githubAppPrivateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  const origin = getSiteOrigin();
  const redirectUri = `${origin}/api/callback`;

  const isConfigured = Boolean(
    googleClientId &&
    googleClientSecret &&
    allowedEmails &&
    githubAppId &&
    githubAppInstallationId &&
    githubAppPrivateKey
  );

  return {
    googleClientId,
    googleClientSecret,
    allowedEmails,
    githubAppId,
    githubAppInstallationId,
    githubAppPrivateKey,
    origin,
    redirectUri,
    isConfigured,
  };
}

function missingConfigResponse(res) {
  return res.status(503).json({
    error: "CMS Google OAuth is not configured",
    hint: "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_EDITOR_EMAILS, GITHUB_APP_ID, GITHUB_APP_INSTALLATION_ID, and GITHUB_APP_PRIVATE_KEY in Vercel project settings.",
  });
}

function getGoogleAuthUrl(state) {
  const { googleClientId, redirectUri } = getOAuthConfig();
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state: state || "",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseCookies(header) {
  const out = Object.create(null);
  if (!header) return out;
  String(header)
    .split(";")
    .forEach((part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return;
      const key = part.slice(0, idx).trim();
      const val = part.slice(idx + 1).trim();
      if (!key) return;
      try {
        out[key] = decodeURIComponent(val);
      } catch (_) {
        out[key] = val;
      }
    });
  return out;
}

function oauthStateCookie(value, maxAgeSeconds, origin) {
  const parts = [
    `rolcc_oauth_state=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (String(origin || "").startsWith("https://")) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

function createOAuthState() {
  return crypto.randomBytes(24).toString("hex");
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

async function exchangeGoogleCodeForUser(code) {
  const { googleClientId, googleClientSecret, redirectUri } = getOAuthConfig();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: googleClientId,
      client_secret: googleClientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    // Status only — token responses may contain secrets.
    throw new Error(`Google token exchange failed (${tokenRes.status})`);
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error("Missing Google access token");
  }

  const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!userRes.ok) {
    throw new Error(`Google userinfo fetch failed (${userRes.status})`);
  }

  const userData = await userRes.json();
  if (!userData.email) {
    throw new Error("No email returned from Google user identity");
  }
  // Require explicit true — reject missing/undefined as well as false.
  if (userData.email_verified !== true) {
    throw new Error("Google email address is not verified");
  }

  return {
    email: String(userData.email).toLowerCase().trim(),
    name: userData.name || "",
    picture: userData.picture || "",
  };
}

function isEmailAllowed(email) {
  const { allowedEmails } = getOAuthConfig();
  if (!allowedEmails || !email) return false;

  const allowlist = allowedEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.toLowerCase().trim());
}

function base64url(input) {
  const buf = typeof input === "string" || Buffer.isBuffer(input) ? Buffer.from(input) : Buffer.from(String(input));
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function wrapPemBody(body) {
  const compact = String(body || "").replace(/\s+/g, "");
  const lines = [];
  for (let i = 0; i < compact.length; i += 64) {
    lines.push(compact.slice(i, i + 64));
  }
  return lines.join("\n");
}

function formatPrivateKey(rawKey) {
  if (!rawKey) return "";
  let key = String(rawKey).trim();

  // Vercel / .env paste artifacts
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  key = key.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  // Literal backslash-n sequences from single-line env values
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }

  // Newlines stripped entirely: -----BEGIN …-----MIIE…-----END …-----
  if (!key.includes("\n") && /-----BEGIN [^-]+-----/.test(key)) {
    key = key
      .replace(/(-----BEGIN [^-]+-----)/, "$1\n")
      .replace(/(-----END [^-]+-----)/, "\n$1");
  }

  const beginMatch = key.match(/-----BEGIN ([^-]+)-----/);
  const endMatch = key.match(/-----END ([^-]+)-----/);
  if (beginMatch && endMatch) {
    const label = beginMatch[1].trim();
    const beginIdx = key.indexOf(beginMatch[0]) + beginMatch[0].length;
    const endIdx = key.indexOf(endMatch[0]);
    const body = key.slice(beginIdx, endIdx);
    key = `-----BEGIN ${label}-----\n${wrapPemBody(body)}\n-----END ${label}-----\n`;
  }

  return key;
}

function privateKeyDiagnostics(rawKey, formattedKey) {
  const raw = String(rawKey || "");
  const formatted = String(formattedKey || "");
  return {
    rawLen: raw.length,
    formattedLen: formatted.length,
    hasBegin: /-----BEGIN [^-]+-----/.test(formatted),
    hasEnd: /-----END [^-]+-----/.test(formatted),
    hasRealNewlines: formatted.includes("\n"),
    hadLiteralSlashN: raw.includes("\\n"),
    hadQuotes: /^\s*["']/.test(raw),
    beginLabel: (formatted.match(/-----BEGIN ([^-]+)-----/) || [])[1] || null,
  };
}

// #region agent log
function debugLog(location, message, data, hypothesisId) {
  const payload = {
    sessionId: "da2440",
    location,
    message,
    data,
    hypothesisId,
    timestamp: Date.now(),
  };
  console.error("[debug-da2440]", JSON.stringify(payload));
  try {
    fetch("http://127.0.0.1:7431/ingest/56c1586e-2104-4ec7-8975-c7cdaec785b2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "da2440",
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch (_) {
    /* ignore — production cannot reach local ingest */
  }
}
// #endregion

async function mintGitHubAppInstallationToken() {
  const { githubAppId, githubAppInstallationId, githubAppPrivateKey } = getOAuthConfig();

  const appId = String(githubAppId || "").trim();
  const installationId = String(githubAppInstallationId || "").trim();

  // Installation ID must be a short numeric id from .../installations/12345678 — never the PEM.
  if (!/^\d+$/.test(appId)) {
    throw new Error("GITHUB_APP_ID must be a number (App ID on the GitHub App settings page)");
  }
  if (!/^\d+$/.test(installationId)) {
    throw new Error(
      "GITHUB_APP_INSTALLATION_ID must be a short number from the install URL (.../installations/NUMBER), not the private key PEM"
    );
  }
  if (installationId.length > 20) {
    throw new Error(
      "GITHUB_APP_INSTALLATION_ID looks too long — you may have pasted the PEM into the wrong Vercel variable"
    );
  }

  const formattedKey = formatPrivateKey(githubAppPrivateKey);
  // #region agent log
  const diag = privateKeyDiagnostics(githubAppPrivateKey, formattedKey);
  debugLog("oauth-config.js:mint", "PEM shape before sign", diag, "A");
  debugLog(
    "oauth-config.js:mint",
    "App id fields (lengths only)",
    { appIdLen: appId.length, installationIdLen: installationId.length, installationIdIsDigits: true },
    "C"
  );
  // #endregion

  let keyObject;
  try {
    keyObject = crypto.createPrivateKey(formattedKey);
    // #region agent log
    debugLog(
      "oauth-config.js:mint",
      "createPrivateKey ok",
      { ok: true, asymmetricKeyType: keyObject.asymmetricKeyType || null },
      "A"
    );
    // #endregion
  } catch (err) {
    // #region agent log
    debugLog(
      "oauth-config.js:mint",
      "createPrivateKey failed",
      {
        ok: false,
        errName: err && err.name,
        errCode: err && err.code,
        errMessage: err && err.message ? String(err.message).slice(0, 120) : "unknown",
        ...diag,
      },
      "A"
    );
    // #endregion
    throw new Error(
      `GitHub App private key could not be parsed (${err && err.message ? err.message : "decode error"})`
    );
  }

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({
      iat: now - 60,
      exp: now + 10 * 60,
      iss: Number(appId),
    })
  );

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = base64url(sign.sign(keyObject));
  const jwt = `${header}.${payload}.${signature}`;

  // #region agent log
  debugLog(
    "oauth-config.js:mint",
    "Requesting installation token",
    {
      appIdLen: appId.length,
      installationIdLen: installationId.length,
    },
    "C"
  );
  // #endregion

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "ROLCC-Resources-Auth",
      },
    }
  );

  if (!response.ok) {
    // #region agent log
    debugLog(
      "oauth-config.js:mint",
      "GitHub installation token HTTP error",
      { status: response.status },
      "C"
    );
    // #endregion
    // Status only — response body may include sensitive details.
    throw new Error(`GitHub App token creation failed (${response.status})`);
  }

  const data = await response.json();
  if (!data.token) {
    throw new Error("GitHub App installation response missing token");
  }

  // #region agent log
  debugLog("oauth-config.js:mint", "Installation token minted", { ok: true }, "C");
  // #endregion

  return data.token;
}

function authSuccessPage(token, origin) {
  const authPayload = JSON.stringify({ token, provider: "github" });
  const message = `authorization:github:success:${authPayload}`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Resources — Sign in successful</title>
  </head>
  <body>
    <p>Sign-in successful. You can close this window.</p>
    <script>
      (function () {
        var message = ${JSON.stringify(message)};
        var allowedOrigin = ${JSON.stringify(origin)};
        // Origin-only: never post tokens with "*" — any site could listen.
        if (window.opener) {
          window.opener.postMessage(message, allowedOrigin);
        }
        window.close();
      })();
    </script>
  </body>
</html>`;
}

function authErrorPage(message, origin) {
  const safeMessage = escapeHtml(message);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Resources — Sign in failed</title>
    <style>
      body {
        font-family: system-ui, -apple-system, sans-serif;
        padding: 2rem;
        color: #1e293b;
        background-color: #f8fafc;
        max-width: 480px;
        margin: 0 auto;
        line-height: 1.5;
      }
      h1 { font-size: 1.25rem; font-weight: 600; color: #0f172a; margin-bottom: 0.75rem; }
      p { font-size: 0.95rem; color: #475569; margin-bottom: 1rem; }
    </style>
  </head>
  <body>
    <h1>Sign in failed</h1>
    <p>${safeMessage}</p>
    <script>
      (function () {
        var allowedOrigin = ${JSON.stringify(origin)};
        // Origin-only: never broadcast auth errors with "*".
        if (window.opener) {
          var errorMessage = "authorization:github:error:" + ${JSON.stringify(String(message))};
          window.opener.postMessage(errorMessage, allowedOrigin);
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
  getGoogleAuthUrl,
  exchangeGoogleCodeForUser,
  isEmailAllowed,
  mintGitHubAppInstallationToken,
  authSuccessPage,
  authErrorPage,
  escapeHtml,
  parseCookies,
  oauthStateCookie,
  createOAuthState,
  safeEqual,
};
