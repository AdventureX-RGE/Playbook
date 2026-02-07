import { Hono } from "hono";
import github from "./github";

const router = new Hono();

router.route("/github", github);

export const apiRouter = router;
