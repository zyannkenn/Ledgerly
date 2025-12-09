// routes/items.js
const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// 一覧 + フィルタ + サマリー + カテゴリ別円グラフ
router.get("/", async (req, res) => {
  const userId = req.session.userId;

  const typeFilter = req.query.type || "all"; // all / income / expense
  const startDate = req.query.startDate || "";
  const endDate = req.query.endDate || "";

  const where = { userId };

  if (typeFilter === "income") where.type = "income";
  if (typeFilter === "expense") where.type = "expense";

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const d = new Date(endDate);
      d.setHours(23, 59, 59, 999);
      where.createdAt.lte = d;
    }
  }

  const items = await prisma.item.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = {}; // カテゴリ（event）ごとの合計金額を集計（支出のみ）

  items.forEach((item) => {
    if (item.type === "income") {
      totalIncome += item.amount;
    }
    if (item.type === "expense") {
      totalExpense += item.amount;
      const key = item.event || "未分類";
      categoryTotals[key] = (categoryTotals[key] || 0) + item.amount;
    }
  });

  const balance = totalIncome - totalExpense;

  // 円グラフ用データ
  const chartData = Object.entries(categoryTotals).map(([label, value]) => ({
    label,
    value,
  }));

  res.render("items", {
    items,
    filters: { typeFilter, startDate, endDate },
    summary: { totalIncome, totalExpense, balance },
    chartJson: JSON.stringify(chartData),
  });
});

// 新規作成フォーム
router.get("/new", (req, res) => {
  res.render("itemDetail", { mode: "create", item: null });
});

// 新規作成
router.post("/", async (req, res) => {
  const userId = req.session.userId;
  const { amount, type, event, memo, createdAt } = req.body;

  if (!amount || !type) {
    return res.status(400).send("金額と収支区分は必須です");
  }

  await prisma.item.create({
    data: {
      userId,
      amount: Number(amount),
      type,
      event: event || "",
      memo: memo || "",
      createdAt: createdAt ? new Date(createdAt) : undefined,
    },
  });

  res.redirect("/items");
});

// 編集フォーム
router.get("/:id/edit", async (req, res) => {
  const userId = req.session.userId;
  const id = Number(req.params.id);

  const item = await prisma.item.findFirst({ where: { id, userId } });
  if (!item) return res.status(404).send("データが見つかりません");

  res.render("itemDetail", { mode: "edit", item });
});

// 更新
router.put("/:id", async (req, res) => {
  const userId = req.session.userId;
  const id = Number(req.params.id);
  const { amount, type, event, memo, createdAt } = req.body;

  if (!amount || !type) {
    return res.status(400).send("金額と収支区分は必須です");
  }

  const existing = await prisma.item.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).send("データが見つかりません");

  await prisma.item.update({
    where: { id },
    data: {
      amount: Number(amount),
      type,
      event: event || "",
      memo: memo || "",
      createdAt: createdAt ? new Date(createdAt) : existing.createdAt,
    },
  });

  res.redirect("/items");
});

// 削除
router.delete("/:id", async (req, res) => {
  const userId = req.session.userId;
  const id = Number(req.params.id);

  const existing = await prisma.item.findFirst({ where: { id, userId } });
  if (!existing) return res.status(404).send("データが見つかりません");

  await prisma.item.delete({ where: { id } });
  res.redirect("/items");
});

// 詳細表示
router.get("/detail/view", async (req, res) => {
  const userId = req.session.userId;
  const id = Number(req.query.id);
  if (!id) return res.status(400).send("id が必要です");

  const item = await prisma.item.findFirst({ where: { id, userId } });
  if (!item) return res.status(404).send("データが見つかりません");

  res.render("itemDetail", { mode: "view", item });
});

module.exports = router;