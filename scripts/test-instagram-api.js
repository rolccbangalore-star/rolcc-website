const path = require("path");
const https = require("https");
const { loadProjectEnv } = require("./load-env");

const ROOT = path.join(__dirname, "..");
loadProjectEnv(ROOT);

function httpsGetJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, body });
          }
        });
      })
      .on("error", reject);
  });
}

async function discoverInstagramUserId(token) {
  const pages = await httpsGetJson(
    `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,instagram_business_account&access_token=${encodeURIComponent(token)}`
  );

  if (pages.status >= 400) {
    throw new Error(pages.body.error ? pages.body.error.message : `HTTP ${pages.status}`);
  }

  const accounts = pages.body.data || [];
  for (const page of accounts) {
    if (page.instagram_business_account && page.instagram_business_account.id) {
      return {
        userId: page.instagram_business_account.id,
        pageName: page.name,
        pageId: page.id,
      };
    }
  }

  throw new Error(
    "No Instagram Business account found on your Facebook Pages. Connect @rolccindia to a Facebook Page first."
  );
}

async function fetchSampleMedia(token, userId, limit) {
  const url =
    `https://graph.facebook.com/v19.0/${encodeURIComponent(userId)}/media` +
    `?fields=id,media_type,permalink,timestamp&limit=${limit}` +
    `&access_token=${encodeURIComponent(token)}`;
  const response = await httpsGetJson(url);
  if (response.status >= 400) {
    throw new Error(response.body.error ? response.body.error.message : `HTTP ${response.status}`);
  }
  return response.body.data || [];
}

async function main() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  let userId = process.env.INSTAGRAM_USER_ID;

  console.log("ROLCC Gallery — Instagram API check\n");

  if (!token) {
    console.error("Missing INSTAGRAM_ACCESS_TOKEN.");
    console.error("Copy .env.example to .env and add your token. See docs/gallery-setup.md");
    process.exit(1);
  }

  console.log("Token found:", token.slice(0, 8) + "…" + token.slice(-4));

  if (!userId) {
    console.log("\nINSTAGRAM_USER_ID not set — discovering from Facebook Pages…");
    const discovered = await discoverInstagramUserId(token);
    userId = discovered.userId;
    console.log("Page:", discovered.pageName);
    console.log("Instagram Business account ID:", userId);
    console.log("\nAdd this to your .env file:");
    console.log(`INSTAGRAM_USER_ID=${userId}`);
  } else {
    console.log("Instagram user ID:", userId);
  }

  console.log("\nFetching latest media…");
  const media = await fetchSampleMedia(token, userId, 3);
  console.log(`Success — ${media.length} recent item(s):`);
  media.forEach((item, index) => {
    console.log(`  ${index + 1}. [${item.media_type}] ${item.permalink}`);
  });

  console.log("\nNext: npm run build:gallery");
}

main().catch((error) => {
  console.error("\nInstagram API check failed:");
  console.error(error.message);
  console.error("\nSee docs/gallery-setup.md for setup steps.");
  process.exit(1);
});
