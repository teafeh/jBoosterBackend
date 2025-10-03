import axios from "axios";
import Payment from "../models/Payment.js";
import JboosterUser from "../models/User.js";

/**
 * Create Top-up
 */
export const createTopup = async (req, res) => {
  try {
    const { amount, email } = req.body;
    if (!amount) return res.status(400).json({ error: "Amount is required" });

    const user = await JboosterUser.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Create pending payment record
    const payment = await Payment.create({
      user: user._id,
      amount,
      currency: "NGN",
      status: "pending",
      description: "Wallet Top-up",
    });

    const tx_ref = `tx-${payment._id}-${Date.now()}`;

    const payload = {
      email: email || user.email,
      amount: amount * 100, // Paystack accepts amount in kobo
      reference: tx_ref,
      callback_url: "http://j-booster.vercel.app/dashboard",
      currency: "NGN",
    };

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data;

    if (!data?.data) {
      return res.status(500).json({ error: "Failed to create top-up" });
    }

    const psPayment = data.data;

    // ✅ Update DB with details
    payment.transactionId = psPayment.reference;
    payment.txRef = tx_ref;
    payment.rawResponse = psPayment;
    await payment.save();

    res.json({
      success: true,
      payment: {
        _id: payment._id,
        user: payment.user,
        amount: payment.amount,
        currency: payment.currency,
        tx_ref,
        transactionId: payment.transactionId,
        status: payment.status,
        description: payment.description,
        createdAt: payment.createdAt,
        checkoutUrl: psPayment.authorization_url, // frontend should redirect user here
      },
    });
  } catch (error) {
    console.error(
      "Failed to create top-up error:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to create top-up" });
  }
};

/**
 * Verify Payment
 */
export const checkTopupStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const payment = await Payment.findOne({ transactionId }).populate("user");
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Verify with Paystack
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${transactionId}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );

    const data = response.data.data;

    if (data.status === "success" && payment.status !== "success") {
      payment.user.balance += payment.amount; // add wallet balance
      await payment.user.save();

      payment.status = "success";
      payment.rawResponse = data;
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

/**
 * Webhook (automatic confirmation from Paystack)
 */
export const paystackWebhook = async (req, res) => {
  try {
    const event = req.body;

    if (event.event === "charge.success") {
      const data = event.data;

      const payment = await Payment.findOne({
        transactionId: data.reference,
      }).populate("user");

      if (payment && data.status === "success" && payment.status !== "success") {
        payment.user.balance += payment.amount / 100; // convert back from kobo
        await payment.user.save();

        payment.status = "success";
        payment.rawResponse = data;
        await payment.save();
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error.message);
    res.sendStatus(500);
  }
};

/**
 * ✅ Get all user orders/payments
 */
export const getUserOrders = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      orders: payments,
    });
  } catch (error) {
    console.error("Get orders error:", error.message);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
};
