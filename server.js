require("dotenv").config();
const ethers = require("ethers");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const db = new sqlite3.Database("./claims.db");
db.run(
  "CREATE TABLE IF NOT EXISTS claims (address TEXT PRIMARY KEY, timestamp INTEGER)"
);

console.log("RPC URL:", process.env.RPC_URL);
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
console.log("Wallet address:", wallet.address);

async function checkBalance() {
  const balance = await provider.getBalance(wallet.address);
  console.log("Wallet balance:", ethers.formatEther(balance), "$MON");
}
checkBalance().catch((err) => console.error("Balance check failed:", err));

async function sendMon(address) {
  console.log("Sending 0.01 $MON to:", address);
  const tx = await wallet.sendTransaction({
    to: address,
    value: ethers.parseEther("0.01"),
  });
  const receipt = await tx.wait();
  console.log("Tx confirmed:", receipt.transactionHash);
  return receipt;
}

app.post("/claim", async (req, res) => {
  const { address } = req.body;
  console.log("Claim request received for:", address);

  if (!ethers.isAddress(address)) {
    console.log("Invalid address detected");
    return res.status(400).json({ message: "Invalid wallet address" });
  }

  try {
    db.get(
      "SELECT timestamp FROM claims WHERE address = ?",
      [address],
      async (err, row) => {
        if (err) {
          console.log("Database error:", err);
          return res.status(500).json({ message: "Database error" });
        }

        const now = Date.now();
        const twelveHours = 12 * 60 * 60 * 1000;

        if (row && now - row.timestamp < twelveHours) {
          console.log("Cooldown active for:", address);
          return res.status(429).json({
            message: "You can only claim once every 12 hours",
          });
        }

        try {
          const tx = await sendMon(address);
          db.run(
            "REPLACE INTO claims (address, timestamp) VALUES (?, ?)",
            [address, now],
            (err) => {
              if (err) console.log("Database update error:", err);
            }
          );
          const responseData = {
            message: "0.01 $MON sent successfully!",
            txHash: tx.transactionHash,
          };
          console.log("Sending response:", responseData);
          res.json(responseData);
        } catch (txError) {
          console.error("Transaction failed:", txError);
          res
            .status(500)
            .json({ message: "Failed to send $MON. Try again later." });
        }
      }
    );
  } catch (error) {
    console.error("Outer error in claim:", error);
    res.status(500).json({ message: "Failed to send $MON. Try again later." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
