async function claimTokens() {
  const address = document.getElementById("walletAddress").value;
  const messageEl = document.getElementById("message");

  if (!address) {
    messageEl.textContent = "Please enter a wallet address";
    return;
  }

  messageEl.textContent = "Sending...";

  try {
    const response = await fetch("/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", [...response.headers]);

    const data = await response.json();
    console.log("Response data:", data);

    if (response.ok) {
      const txHash = data.txHash || "N/A";
      messageEl.textContent = `${data.message}${
        txHash !== "N/A" ? " Tx: " + txHash.substring(0, 6) + "..." : ""
      }`;
    } else {
      messageEl.textContent = data.message || "Unknown error";
    }
  } catch (error) {
    console.error("Fetch error:", error.message);
    messageEl.textContent = `Fetch failed: ${error.message}`;
  }
}
