"use client";
import dynamic from "next/dynamic";

const PhoneInput2 = dynamic(
  () => import("react-phone-input-2").then(mod => mod.default),
  { ssr: false }
);

export default PhoneInput2; 