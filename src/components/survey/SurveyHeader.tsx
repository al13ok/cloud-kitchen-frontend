import React from "react";
import Image from "next/image";

const SurveyHeader = () => {
  return (
    <header
      className="w-full relative shadow-lg"
      style={{ 
        minHeight: "var(--survey-header-height)",
        background: "linear-gradient(to right, #3b82f6, #6366f1, #8b5cf6, #a855f7)"
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center px-4 sm:px-6 lg:px-8 py-4 relative">
        {/* Title - Centered */}
        <div className="flex items-center justify-center flex-1">
          <h1
            className="font-semibold text-white drop-shadow-md"
            style={{ fontSize: "var(--survey-title-size)" }}
          >
            Tell us about your experience with{" "}
            <span className="text-white font-bold">Mobiloitte</span>
          </h1>
        </div>

        {/* Logo - Absolute Right Corner */}
        <div className="absolute right-4 sm:right-6 lg:right-8 top-1/2 -translate-y-1/2">
          <Image
            src="/images/logo/M-LOGO_1.png"
            alt="Mobiloitte"
            width={50}
            height={50}
            className="h-12 w-12 object-contain"
            priority
          />
        </div>
      </div>
    </header>
  );
};

export default SurveyHeader;

