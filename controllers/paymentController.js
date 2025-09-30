import axios from "axios";
import Payment from "../models/Payment.js";   // <-- use this instead of Transaction
import JboosterUser from "../models/User.js";

// Create Top-Up
export const createTopup = async (req, res) => {
  try {
    const { amount, phone } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount is required" });

    // Find user from token
    const user = await JboosterUser.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Create payment entry (pending, no transactionId yet)
    const payment = await Payment.create({
      user: user._id,
      amount,
      currency: "NGN",
      status: "pending",
      description: "Wallet Top-up",
    });

    // Prepare provider payload
    const payload = {
      businessId: process.env.BUSINESS_ID,
      amount,
      currency: "NGN",
      orderId: payment._id.toString(), // tie back to our DB entry
      description: "Wallet Top-up",
      customer: {
        email: user.email,
        phone: phone || "08000000000",
        firstName: user.name || "User",
        lastName: "",
        metadata: "Wallet Top-up",
      },
    };

    // Call provider to generate virtual account
    const response = await axios.post(
      `${process.env.PAYMENT_BASE_URL}/bank-transfer/api/v1/bankTransfer/virtualAccount`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": process.env.PAYMENT_API_KEY,
        },
      }
    );

    const data = response.data.data;

    if (!data || !data.transactionId) {
      return res.status(500).json({ error: "Failed to create top-up" });
    }

    // Update payment with provider details
    payment.transactionId = data.transactionId;
    payment.virtualAccountNumber = data.virtualBankAccountNumber;
    payment.virtualBankCode = data.virtualBankCode;
    payment.virtualBankName = data.virtualBankName || "Wema Bank";
    await payment.save();

    res.json({
      success: true,
      payment: {
        _id: payment._id,
        user: user._id,
        amount: payment.amount,
        currency: payment.currency,
        transactionId: payment.transactionId,
        status: payment.status,
        virtualAccountNumber: payment.virtualAccountNumber,
        virtualBankCode: payment.virtualBankCode,
        virtualBankName: payment.virtualBankName,
        description: payment.description,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    console.error(
      "Failed to create top-up full error:",
      error.response?.data || error.message || error
    );
    res.status(500).json({ error: "Failed to create top-up" });
  }
};

// Check Payment Status
export const checkTopupStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    // 🔑 Look up from Payment model instead of Transaction
    const payment = await Payment.findOne({ transactionId }).populate("user");
    if (!payment) return res.status(404).json({ error: "Transaction not found" });

    // Call provider to check status
    const response = await axios.get(
      `${process.env.PAYMENT_BASE_URL}/bank-transfer/api/v1/bankTransfer/transactions/${transactionId}`,
      {
        headers: {
          "Content-Type": "application/json",
          "Ocp-Apim-Subscription-Key": process.env.PAYMENT_API_KEY,
        },
      }
    );

    const data = response.data.data;

    // Update status + wallet balance
    if (data.status === "success" && payment.status !== "success") {
      payment.user.balance += payment.amount;
      await payment.user.save();

      payment.status = "success";
      await payment.save();
    } else if (data.status === "failed") {
      payment.status = "failed";
      await payment.save();
    }

    res.json({
      success: true,
      status: payment.status,
      amount: payment.amount,
      balance: payment.user.balance,
    });
  } catch (error) {
    console.error(
      "Check top-up status error:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to check top-up status" });
  }
};
