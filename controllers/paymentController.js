import axios from "axios";
import Transaction from "../models/Transaction.js";
import JboosterUser from "../models/User.js";
import Payment from "../models/Payment.js";

// Create Top-Up
export const createTopup = async (req, res) => {
try {
    const { amount, phone } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount is required" });

    // Find user from token
    const user = await JboosterUser.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Create payment entry WITHOUT transactionId yet
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
      orderId: payment._id.toString(),
      description: "Wallet Top-up",
      customer: {
        email: user.email,
        phone: phone || "08000000000",
        firstName: user.name || "User",
        lastName: "",
        metadata: "Wallet Top-up",
      },
    };

    // Call payment provider API to generate virtual account
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

    // Update payment with transactionId, virtual account number, bank code & bank name
    payment.transactionId = data.transactionId;
    payment.virtualAccountNumber = data.virtualBankAccountNumber;
    payment.virtualBankCode = data.virtualBankCode;
    payment.virtualBankName = data.virtualBankName || "Wema Bank";
    await payment.save();

    // Return fully detailed payment info
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
    console.error("Failed to create top-up full error:", error.response?.data || error.message || error);
    res.status(500).json({ error: "Failed to create top-up" });
  }
};

// Check Payment Status
export const checkTopupStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({ reference: transactionId }).populate("user");
    if (!transaction) return res.status(404).json({ error: "Transaction not found" });

    // Call payment provider to check status
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

    // Only credit wallet if successful and not already credited
    if (data.status === "success" && transaction.status !== "success") {
      transaction.user.balance += transaction.amount;
      await transaction.user.save();

      transaction.status = "success";
      await transaction.save();
    } else if (data.status === "failed") {
      transaction.status = "failed";
      await transaction.save();
    }

    res.json({
      success: true,
      status: transaction.status,
      amount: transaction.amount,
      balance: transaction.user.balance,
    });
  } catch (error) {
    console.error("Check top-up status error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to check top-up status" });
  }
};
