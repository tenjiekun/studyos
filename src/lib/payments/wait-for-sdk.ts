/**
 * Wait for the Razorpay SDK to be available on window.
 * Retries every 200ms up to maxAttempts (default 50 = 10 seconds).
 */
export function waitForRazorpaySDK(maxAttempts = 50): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }

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
