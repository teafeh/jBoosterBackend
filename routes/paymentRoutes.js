import express from "express";
import { createTopup, checkTopupStatus, paystackWebhook } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/topup", protect, createTopup);
router.get("/:transactionId/status", protect, checkTopupStatus);
router.post("/webhook", express.json({ type: "application/json" }), paystackWebhook);

export default router;
