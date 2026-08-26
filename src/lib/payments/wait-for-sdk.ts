/**
 * Wait for the Razorpay SDK to be available on window.Razorpay.
 * The SDK is loaded by next/script beforeInteractive in layout.tsx.
 * This function polls until it's ready.
 */
export async function waitForRazorpaySDK(maxAttempts = 50, intervalMs = 200): Promise<boolean> {
  if (typeof window === "undefined") return false;

  // Immediately available
  if (window.Razorpay) return true;

  return new Promise((resolve) => {
    let attempts = 0;
    const check = setInterval(() => {
      attempts++;
      if (window.Razorpay) {
        clearInterval(check);
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(check);
        console.error("[StudyOS] Razorpay SDK failed to load after", maxAttempts * intervalMs, "ms");
        resolve(false);
      }
    }, intervalMs);
  });
}
