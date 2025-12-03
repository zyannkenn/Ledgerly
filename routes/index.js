var express = require("express");
var router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// メインページ: ブログ一覧 + 新規投稿フォーム + 検索フォーム
router.get("/", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { postedAt: "desc" },
    });

    res.render("index", {
      title: "ブログ",
      posts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("サーバーエラー");
  }
});

// 新しいブログ投稿
router.post("/create", async (req, res) => {
  try {
    const { title, postedAt, content } = req.body;

    await prisma.post.create({
      data: {
        title,
        postedAt: new Date(postedAt),
        content,
      },
    });

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("サーバーエラー");
  }
});

// 検索結果表示ページ（POSTのみ）
router.post("/search", async (req, res) => {
  try {
    const keyword = (req.body.keyword || "").trim();

    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: keyword } },
          { content: { contains: keyword } },
        ],
      },
      orderBy: { postedAt: "desc" },
    });

    res.render("search", {
      title: "検索結果",
      keyword,
      posts,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("サーバーエラー");
  }
});

module.exports = router;