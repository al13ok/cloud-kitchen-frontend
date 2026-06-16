import React from "react";

const SurveyFooter = () => {
  return (
    <footer
      className="w-full text-white"
      style={{
        background: `linear-gradient(90deg, var(--brand-gradient-start), var(--brand-gradient-end))`,
      }}
    >
      <div
        className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-2 text-sm sm:px-6 lg:px-8"
        style={{ minHeight: "var(--survey-footer-height)" }}
      >
        <p className="font-semibold text-white">
          @Powered by <span className="text-base font-bold">Mobiloitte</span>
        </p>
      </div>
    </footer>
  );
};

export default SurveyFooter;

