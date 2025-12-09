require("dotenv").config();
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const session = require("express-session");
const methodOverride = require("method-override");

const authRouter = require("./routes/auth");
const itemsRouter = require("./routes/items");

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// middlewares
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(express.static(path.join(__dirname, "public")));

// テンプレートでログイン状態を使えるように
app.use((req, res, next) => {
  res.locals.currentUserId = req.session.userId || null;
  next();
});

// ログイン必須ミドルウェア
function ensureAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

// ルーティング
app.use("/", authRouter);            // /login, /register, /logout
app.use("/items", ensureAuth, itemsRouter);

app.get("/", (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  res.redirect("/items");
});

// catch 404
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.send("Error: " + err.message);
});

module.exports = app;