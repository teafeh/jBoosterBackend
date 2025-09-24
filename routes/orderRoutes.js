// routes/orderRoutes.js
import express from "express";
import { createOrder, getOrderStatus } from "../controllers/orderController.js";

const router = express.Router();

router.post("/", createOrder); // create new order
router.get("/:id/status", getOrderStatus); // check status by local DB ID

export default router;
