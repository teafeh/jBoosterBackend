// routes/orderRoutes.js
import express from "express";
import { createOrder, getOrderStatus } from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createOrder); // create new order
router.get("/:id/status", protect, getOrderStatus); // check status by local DB ID

export default router;
