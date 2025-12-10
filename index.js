import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rota de teste
app.get("/", (req, res) => {
  res.send("Re.Power Backend API running 🚀");
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV || "unknown" });
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
