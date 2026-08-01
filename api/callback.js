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
    const user = await exchangeGoogleCodeForUser(code);

    if (!user || !user.email) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(400).send(authErrorPage("Could not retrieve user email from Google.", origin));
    }

    if (!isEmailAllowed(user.email)) {
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

    const installationToken = await mintGitHubAppInstallationToken();

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(authSuccessPage(installationToken, origin));
  } catch (err) {
    // Message only — avoid logging API response bodies that may contain secrets.
    console.error("OAuth callback error:", err && err.message ? err.message : "unknown");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res
      .status(500)
      .send(authErrorPage("Sign-in failed. Please close this window and try again.", origin));
  }
};
