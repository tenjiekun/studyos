/**
 * Dynamically load the Razorpay SDK at runtime.
 * Uses document.createElement to bypass CSP <script> tag restrictions
 * on Vercel's default Content-Security-Policy.
 */
let sdkLoaded = false;
let sdkLoading = false;

export function loadRazorpaySDK(): Promise<boolean> {
  // Already loaded
  if (typeof window !== "undefined" && window.Razorpay) {
    return Promise.resolve(true);
  }

  // Already loaded flag
  if (sdkLoaded) return Promise.resolve(true);

  // Already loading — wait for it
  if (sdkLoading) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (typeof window !== "undefined" && window.Razorpay) {
          clearInterval(check);
          resolve(true);
        }
      }, 200);
      // Timeout after 10s
      setTimeout(() => {
        clearInterval(check);
        resolve(false);
      }, 10000);
    });
  }

  sdkLoading = true;

  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    // Check if script already exists in DOM
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      sdkLoaded = true;
      sdkLoading = false;
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      sdkLoaded = true;
      sdkLoading = false;
      // Wait a tick for the global to be defined
      setTimeout(() => {
        resolve(typeof window.Razorpay === "function");
      }, 100);
    };

    script.onerror = () => {
      sdkLoading = false;
      console.error("Failed to load Razorpay SDK");
      resolve(false);
    };

    // Append to body — works regardless of CSP <script> src restrictions
    document.body.appendChild(script);
  });
}
