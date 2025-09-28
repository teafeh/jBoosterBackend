// controllers/paymentController.js
import Transaction from "../models/Transaction.js";
import JboosterUser from "../models/User.js";
import Payment from "../models/Payment.js";

// Check payment status (extended)
export const checkPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const payment = await Payment.findOne({ transactionId }).populate("user");

    if (!payment) return res.status(404).json({ error: "Payment not found" });

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
    payment.status = data.status;
    await payment.save();

    if (data.status === "success") {
      // 1️⃣ Credit wallet if not already done
      if (!await Transaction.findOne({ reference: transactionId })) {
        payment.user.balance += payment.amount;
        await payment.user.save();

        // 2️⃣ Log credit transaction
        await Transaction.create({
          user: payment.user._id,
          type: "credit",
          amount: payment.amount,
          description: "Wallet funding",
          reference: transactionId,
          status: "success",
        });
      }
    }

    res.json({ success: true, status: payment.status });
  } catch (error) {
    console.error("Payment status check error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to check payment status" });
  }
};
