import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "JboosterUser", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "NGN" },

    transactionId: { type: String, index: true }, // Paystack reference
    txRef: { type: String, index: true },

    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },

    description: { type: String, default: "Wallet Top-up" },
    rawResponse: { type: Object }, // Store raw Paystack response
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema, "jbooster_payments");
export default Payment;
