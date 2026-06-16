import React, { ReactNode } from "react";
import SurveyHeader from "./SurveyHeader";
import SurveyFooter from "./SurveyFooter";
import styles from "@/styles/feedbackTokens.module.css";

interface SurveyLayoutProps {
  children: ReactNode;
}

const SurveyLayout = ({ children }: SurveyLayoutProps) => {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SurveyHeader />
      <main
        className="flex-1 flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(180deg, var(--brand-gradient-start), var(--brand-gradient-end))`,
        }}
      >
        <div className={styles.layout}>
          <div className={styles.panel}>{children}</div>
        </div>
      </main>
      <SurveyFooter />
    </div>
  );
};

export default SurveyLayout;

