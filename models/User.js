import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  status: { type: String, default: "newbie" }
}, { timestamps: true });


userSchema.pre("save", async function(next) {
  if (!this.isModified("password")) return next(); // only hash if password is new/changed
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Explicitly set collection name "jbooster_users"
const JboosterUser = mongoose.model("JboosterUser", userSchema, "jbooster_users");

export default JboosterUser;


