import express from "express";
import { createTopup, checkTopupStatus } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js"; // if you have auth

const router = express.Router();

router.post("/topup", protect, createTopup);         // start top-up
router.get("/:transactionId/status", protect, checkTopupStatus); // check status

export default router;
