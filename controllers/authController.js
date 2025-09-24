import jwt from "jsonwebtoken";
import JboosterUser from "../models/User.js";

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// Register
export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const userExists = await JboosterUser.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const user = await JboosterUser.create({ username, email, password });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      balance: user.balance,
      totalOrders: user.totalOrders,
      status: user.status,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Register Error:", error.message); // 👈 add this line
    res.status(500).json({ message: "Error registering user" });
  }
};


// Login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await JboosterUser.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      balance: user.balance,
      totalOrders: user.totalOrders,
      status: user.status,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Login Error:", error.message); // 👈 log real error
    res.status(500).json({ message: "Error logging in" });
  }
};
