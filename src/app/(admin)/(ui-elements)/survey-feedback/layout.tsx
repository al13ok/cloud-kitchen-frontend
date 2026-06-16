import React from "react";

interface SurveyFeedbackLayoutProps {
  children: React.ReactNode;
}

// Minimal layout: rely on the global app header and sidebar only
const SurveyFeedbackLayout: React.FC<SurveyFeedbackLayoutProps> = ({ children }) => {
  return (
    <>{children}</>
  );
};

export default SurveyFeedbackLayout;
