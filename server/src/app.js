import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const localDevOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const corsOptions = {
  origin(origin, callback) {
    if (
      !origin ||
      configuredOrigins.includes(origin) ||
      localDevOriginPattern.test(origin)
    ) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

app.use(cors(corsOptions));

//configurations
app.use(
  express.json({
    limit: "16kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    // allows complex objects and arrays to be encoded into the URL-encoded format.

    limit: "16kb",
  })
);

app.use(express.static("public")); //serves static files from the public directory

app.use(cookieParser()); //parse cookies from incoming requests

//import routes
import userRouter from "./routes/user.routes.js";
import projectRouter from "./routes/project.routes.js";
import likeRouter from "./routes/like.routes.js";
import collaborationRouter from "./routes/collaboration.routes.js";
import commentRouter from "./routes/comment.routes.js";
import authRouter from "./routes/auth.routes.js";
import adminRouter from "./routes/admin.routes.js";
import workspaceRouter from "./routes/workspace.routes.js";
import hackathonRouter from "./routes/hackathon.routes.js";

//define routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/collaboration-requests", collaborationRouter);
// legacy alias: the original client called /contributions
app.use("/api/v1/contributions", collaborationRouter);
app.use("/api/v1/workspace", workspaceRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/hackathons", hackathonRouter);
export { app };
