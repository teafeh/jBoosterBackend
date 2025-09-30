import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JboosterUser",
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "NGN" },

    // ID returned by payment gateway
    transactionId: {
      type: String,
      unique: true,
      sparse: true, // allows multiple nulls before provider gives us an ID
      index: true,  // optimize lookups
    },

    // Virtual account details
    virtualAccountNumber: { type: String },
    virtualBankCode: { type: String },
    virtualBankName: { type: String },

    // Status
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },

    description: { type: String, default: "Wallet Top-up" },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema, "jbooster_payments");

export default Payment;
