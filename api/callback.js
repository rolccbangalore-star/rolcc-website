const {
  getOAuthConfig,
  missingConfigResponse,
  exchangeGoogleCodeForUser,
  isEmailAllowed,
  mintGitHubAppInstallationToken,
  authSuccessPage,
  authErrorPage,
  parseCookies,
  oauthStateCookie,
  safeEqual,
} = require("./oauth-config");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { isConfigured, origin } = getOAuthConfig();
  if (!isConfigured) return missingConfigResponse(res);

  const clearState = () => {
    res.setHeader("Set-Cookie", oauthStateCookie("", 0, origin));
  };

  const cookies = parseCookies(req.headers.cookie);
  const stateCookie = cookies.rolcc_oauth_state || "";
  const stateQuery = typeof req.query.state === "string" ? req.query.state : "";

  if (!stateCookie || !stateQuery || !safeEqual(stateCookie, stateQuery)) {
    // #region agent log
    console.error(
      "[debug-da2440]",
      JSON.stringify({
        sessionId: "da2440",
        location: "callback.js:state",
        message: "OAuth state mismatch",
        data: {
          host: req.headers.host || null,
          hasStateCookie: Boolean(stateCookie),
          stateCookieLen: stateCookie.length,
          stateQueryLen: stateQuery.length,
          lengthsMatch: stateCookie.length === stateQuery.length,
        },
        hypothesisId: "D",
        timestamp: Date.now(),
      })
    );
    // #endregion
    clearState();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res
      .status(400)
      .send(authErrorPage("Invalid or missing OAuth state. Please close this window and try signing in again.", origin));
  }
  clearState();

  const code = req.query.code;
  if (!code) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(400).send(authErrorPage("Missing authorization code from Google.", origin));
  }

  try {
    // #region agent log
    console.error(
      "[debug-da2440]",
      JSON.stringify({
        sessionId: "da2440",
        location: "callback.js:exchange",
        message: "Starting Google code exchange",
        data: { host: req.headers.host || null, hasCode: Boolean(code) },
        hypothesisId: "B",
        timestamp: Date.now(),
      })
    );
    // #endregion
    const user = await exchangeGoogleCodeForUser(code);

    if (!user || !user.email) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(400).send(authErrorPage("Could not retrieve user email from Google.", origin));
    }

    if (!isEmailAllowed(user.email)) {
      // #region agent log
      console.error(
        "[debug-da2440]",
        JSON.stringify({
          sessionId: "da2440",
          location: "callback.js:allowlist",
          message: "Allowlist rejected",
          data: { emailDomain: String(user.email).split("@")[1] || null },
          hypothesisId: "E",
          timestamp: Date.now(),
        })
      );
      // #endregion
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res
        .status(403)
        .send(
          authErrorPage(
            `Account (${user.email}) is not authorized to access ROLCC Resources. Please contact church web administrators.`,
            origin
          )
        );
    }

    // #region agent log
    console.error(
      "[debug-da2440]",
      JSON.stringify({
        sessionId: "da2440",
        location: "callback.js:allowlist",
        message: "Allowlist passed; minting GitHub App token",
        data: { emailDomain: String(user.email).split("@")[1] || null },
        hypothesisId: "A",
        timestamp: Date.now(),
      })
    );
    // #endregion

    const installationToken = await mintGitHubAppInstallationToken();

    // #region agent log
    console.error(
      "[debug-da2440]",
      JSON.stringify({
        sessionId: "da2440",
        location: "callback.js:success",
        message: "Sign-in success page sent",
        data: { ok: true },
        hypothesisId: "C",
        timestamp: Date.now(),
      })
    );
    // #endregion

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(authSuccessPage(installationToken, origin));
  } catch (err) {
    const errMessage = err && err.message ? String(err.message) : "unknown";
    // Message only — avoid logging API response bodies that may contain secrets.
    console.error("OAuth callback error:", errMessage);
    // #region agent log
    console.error(
      "[debug-da2440]",
      JSON.stringify({
        sessionId: "da2440",
        location: "callback.js:catch",
        message: "Callback failed",
        data: { errMessage: errMessage.slice(0, 160) },
        hypothesisId: "A",
        timestamp: Date.now(),
      })
    );
    // #endregion

    let userMessage = "Sign-in failed. Please close this window and try again.";
    if (/GitHub App token creation failed \(401\)/.test(errMessage)) {
      userMessage =
        "GitHub App authentication failed (401). Check that GITHUB_APP_ID matches this app and GITHUB_APP_PRIVATE_KEY was generated for the same app, then redeploy.";
    } else if (/GitHub App token creation failed \(404\)/.test(errMessage)) {
      userMessage =
        "GitHub App installation not found (404). Confirm GITHUB_APP_INSTALLATION_ID is 83515162 and the app is installed on rolcc-website.";
    } else if (/private key could not be parsed/i.test(errMessage)) {
      userMessage =
        "GitHub App private key could not be read. Re-paste GITHUB_APP_PRIVATE_KEY from the .pem file and redeploy.";
    } else if (/INSTALLATION_ID|GITHUB_APP_ID must be/i.test(errMessage)) {
      userMessage = errMessage;
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(authErrorPage(userMessage, origin));
  }
};
