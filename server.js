require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const adminRoutes = require("./routes/admin");
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/book');
const paymentRoutes = require('./routes/payment');
const { getAllUserBooks } = require("./controllers/bookController");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Security Middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json());

// --- Routes ---
app.use("/admin", adminRoutes);
app.use("/auth", authRoutes);
app.use("/book", bookRoutes);
app.use("/payment", paymentRoutes);

// Health check
app.get("/", (req, res) => res.json({ status: "StoryNest API is running" }));

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);
  const status = err.statusCode || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

app.listen(PORT, () => {
  console.log(`StoryNest backend running on port ${PORT}`);
});
