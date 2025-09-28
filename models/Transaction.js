// models/Transaction.js
import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "JboosterUser", required: true },
  type: { type: String, enum: ["credit", "debit"], required: true }, // inflow/outflow
  amount: { type: Number, required: true },
  currency: { type: String, default: "NGN" },
  description: { type: String }, // e.g. "Wallet funding", "Order #123"
  reference: { type: String }, // transactionId, orderId, or gateway ref
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
}, { timestamps: true });

const Transaction = mongoose.model("Transaction", transactionSchema, "jbooster_transactions");
export default Transaction;
