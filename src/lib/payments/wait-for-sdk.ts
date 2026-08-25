import { loadRazorpaySDK } from "./load-razorpay-sdk";

/**
 * Ensure the Razorpay SDK is loaded and available on window.Razorpay.
 * First tries to dynamically inject the script, then polls until ready.
 */
export async function waitForRazorpaySDK(maxAttempts = 50): Promise<boolean> {
  // Already available
  if (typeof window !== "undefined" && window.Razorpay) {
    return true;
  }

  // Dynamically load the SDK
  const loaded = await loadRazorpaySDK();
  if (loaded) return true;

  // Fallback: poll in case the script was loaded by another path
  return new Promise((resolve) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (typeof window !== "undefined" && window.Razorpay) {
        clearInterval(interval);
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        resolve(false);
      }
    }, 200);
  });
}
