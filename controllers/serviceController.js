import axios from "axios";

export const getServices = async (req, res) => {
    const PROFIT_MARGINS = {
  "🎁 Free Services { ❤️ Likes, 👀views }": 0.8, // 80%
  "💝 99.99% Free Services { Max : 2B }": 0.6,   // 60%
  "🎖️ Instafluencer’s Pack": 0.7,               // 70%
  default: 0.5,                                  // fallback if category not listed
};

const CATEGORY_LABELS = {
  "🎁 Free Services { ❤️ Likes, 👀views }": "Free Starter Boosts",
  "💝 99.99% Free Services { Max : 2B }": "Exclusive Free Boosts",
  "🎖️ Instafluencer’s Pack": "Pro Influencer Pack",
};

function cleanServiceName(name) {
  // Example cleanup: strip special characters & rates
  return name
    .replace(/[\d.,$]+/g, "") // remove numbers & rates
    .replace(/\|.*/g, "") // remove everything after "|"
    .trim();
}

  try {
    // Example: Replace with your provider’s API URL
    const response = await axios.post(process.env.PROVIDER_API, {
      key: process.env.API_KEY,
      action: "services",
    });
    const adjustedServices = response.data.map((s) => {
      const providerRate = parseFloat(s.rate);
      const margin = PROFIT_MARGINS[s.category] ?? PROFIT_MARGINS.default;
      const sellingRate = providerRate + providerRate * margin;

      return {
        id: s.service,
        name: cleanServiceName(s.name), // sanitized name
        category: CATEGORY_LABELS[s.category] ?? s.category,
        min: s.min,
        max: s.max,
        rate: sellingRate.toFixed(2),
      };
    });

    res.json(adjustedServices);
  } catch (err) {
    console.error("Error fetching services:", err.message);
    res.status(500).json({ message: "Failed to fetch services" });
  }
};
