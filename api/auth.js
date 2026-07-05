const { getOAuthConfig, missingConfigResponse } = require("./oauth-config");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { clientId, redirectUri } = getOAuthConfig();
  if (!clientId) return missingConfigResponse(res);

  const scope = String(req.query.scope || "repo");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
  });

  res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?${params.toString()}` });
  res.end();
};
