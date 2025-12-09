const express = require("express");
const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// GET /login
router.get("/login", (req, res) => {
  if (req.session.userId) return res.redirect("/items");
  res.render("login", { error: null });
});

// POST /login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.render("login", { error: "メールアドレスまたはパスワードが違います" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.render("login", { error: "メールアドレスまたはパスワードが違います" });
  }

  req.session.userId = user.id;
  res.redirect("/items");
});

// GET /register
router.get("/register", (req, res) => {
  if (req.session.userId) return res.redirect("/items");
  res.render("register", { error: null });
});

// POST /register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render("register", { error: "メールアドレスとパスワードは必須です" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.render("register", { error: "このメールアドレスはすでに登録されています" });
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, password: hashed },
  });

  res.redirect("/login");
});

// GET /logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;