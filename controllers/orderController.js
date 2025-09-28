// controllers/orderController.js
import axios from "axios";
import Order from "../models/Order.js";
import JboosterUser from "../models/User.js"; // 👈 import user model

// Helper to update user status
const updateUserStatus = (user) => {
  if (user.totalOrders >= 500 || user.totalSpent >= 2000000) {
    user.status = "Diamond";
  } else if (user.totalOrders >= 200 || user.totalSpent >= 500000) {
    user.status = "Gold";
  } else if (user.totalOrders >= 50 || user.totalSpent >= 100000) {
    user.status = "Silver";
  } else if (user.totalOrders >= 10 || user.totalSpent >= 20000) {
    user.status = "Bronze";
  } else {
    user.status = "Newbie";
  }
  return user.status;
};

// Create Order
export const createOrder = async (req, res) => {
  try {
    const { serviceId, serviceName, link, quantity, rate } = req.body;

    // Find user
    const user = await JboosterUser.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Calculate charge
    const charge = (quantity / 1000) * rate;

    // Check balance
    if (user.balance < charge) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Call wholesale API
    const response = await axios.post(process.env.PROVIDER_API, {
      key: process.env.API_KEY,
      action: "add",
      service: serviceId,
      link,
      quantity,
    });

    const providerOrderId = response.data.order;
    if (!providerOrderId) {
      return res.status(400).json({ error: "Provider did not return an order ID" });
    }

    // Deduct balance
    user.balance -= charge;

    // Save order
    const order = await Order.create({
      providerOrderId,
      serviceId,
      serviceName,
      link,
      quantity,
      charge,
      status: "pending",
      user: user._id,
    });

    // Update user stats
    user.totalOrders += 1;
    user.totalSpent += charge;
    updateUserStatus(user);
    await user.save();

    res.json(order);
  } catch (error) {
    console.error("Error creating order:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create order" });
  }
};

// Get Order Status
export const getOrderStatus = async (req, res) => {
  try {
    const { id } = req.params; // local DB order ID
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Fetch latest status from wholesale API
    const response = await axios.post(process.env.PROVIDER_API, {
      key: process.env.API_KEY,
      action: "status",
      order: order.providerOrderId,
    });

    const newStatus = response.data.status;

    // Update DB
    order.status = newStatus;
    await order.save();

    res.json(order);
  } catch (error) {
    console.error("Error fetching order status:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch order status" });
  }
};
