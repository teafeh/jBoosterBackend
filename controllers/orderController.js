// controllers/orderController.js
import axios from "axios";
import Order from "../models/Order.js";

export const createOrder = async (req, res) => {
  try {
    const { serviceId, serviceName, link, quantity } = req.body;

    // Call wholesale API
    const response = await axios.post(process.env.PROVIDER_API, {
      key: process.env.API_KEY,
      action: "add",
      service: serviceId,
      link,
      quantity,
    });
    
    if (!serviceId) {
  return res.status(400).json({ error: "Provider did not return an order ID" });
}

    const providerOrderId = response.data.order; // returned by wholesale

    // Save to DB
    const order = await Order.create({
      providerOrderId,
      serviceId,
      serviceName,
      link,
      quantity,
      charge: (quantity / 1000) * req.body.rate, // rate passed from frontend
      status: "pending",
      user: req.user._id,
    });

    res.json(order);
  } catch (error) {
    console.error("Error creating order:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to create order" });
  }
};

export const getOrderStatus = async (req, res) => {
  try {
    const { id } = req.params; // local DB order ID
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Fetch latest status from wholesale API
    const response = await axios.post("https://the-owlet.com/api/v2", {
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
