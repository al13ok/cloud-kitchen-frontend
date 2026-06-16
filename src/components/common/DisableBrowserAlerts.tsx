"use client";

import { useEffect } from "react";

const DisableBrowserAlerts = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalAlert = window.alert;
    window.alert = () => undefined;

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  return null;
};

export default DisableBrowserAlerts;

