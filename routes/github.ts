import { Hono } from "hono";

const CLIENT_ID = import.meta.env.GITHUB_CLIENT_ID ?? "";
const CLIENT_SECRET = import.meta.env.GITHUB_CLIENT_SECRET ?? "";
const SITE_ORIGIN = import.meta.env.SITE_URL ?? "https://playbook.adventure-x.org";
const CALLBACK_URI = `${SITE_ORIGIN}/api/github/callback`;

export default new Hono()
  .get("/login", (c) => {
    const redirect = c.req.query("redirect") || "/";

    return c.redirect(
      `https://github.com/login/oauth/authorize?${new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: CALLBACK_URI,
        scope: "public_repo",
        state: redirect,
      })}`,
    );
  })

  .get("/callback", async (c) => {
    const code = c.req.query("code");
    const redirect = c.req.query("state") || "/";

    if (!code) return c.text("Missing authorization code", 400);

    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: CALLBACK_URI,
      }),
    });

    const { access_token, error, error_description } = (await res.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (error || !access_token) {
      return c.text(`GitHub OAuth error: ${error_description ?? error}`, 400);
    }

    return c.redirect(`${new URL(redirect, SITE_ORIGIN).pathname}#github_token=${access_token}`);
  });
