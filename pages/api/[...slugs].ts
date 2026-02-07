import { Hono } from "hono";
import type { APIRoute } from "astro";
import { apiRouter } from "../../routes";

export const prerender = false;

const app = new Hono().basePath("/api/");

app.route("/", apiRouter);

export const ALL: APIRoute = (ctx) => app.fetch(ctx.request);
