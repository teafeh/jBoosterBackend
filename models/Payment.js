import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "JboosterUser", required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "NGN" },
  transactionId: { type: String }, // ID returned by payment gateway
  virtualAccountNumber: { type: String }, // generated virtual account
  virtualBankCode: { type: String },       // bank code of the virtual account
  virtualBankName: { type: String },       // optional bank name
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
  description: { type: String, default: "Wallet Top-up" },
}, { timestamps: true });

const Payment = mongoose.model("Payment", paymentSchema, "jbooster_payments");

export default Payment;
