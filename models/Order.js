// models/Order.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  providerOrderId: { type: String, required: true },
  serviceId: { type: Number, required: true },
  serviceName: { type: String, required: true },
  link: { type: String, required: true },
  quantity: { type: Number, required: true },
  charge: { type: Number, required: true },
  status: { type: String, default: "pending" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "JboosterUser", required: true }, // link to user
}, { timestamps: true });

const Order = mongoose.model("JboosterOrder", orderSchema, "jbooster_Order");

export default Order;
