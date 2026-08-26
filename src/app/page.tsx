"use client";

import dynamic from "next/dynamic";

const LandingExperience = dynamic(
  () => import("@/components/landing/LandingExperience"),
  { ssr: false }
);

export default function LandingPage() {
  return <LandingExperience />;
}
