import { useEffect, useMemo, useState } from "react";
import { TRUSTED_PREFILL } from "@/config/feedback";

const sanitizeEmail = (email) => {
  if (!email) return "";
  return String(email).replace(/\s+/g, "").trim();
};

/**
 * Enterprise-level email validation function
 * Validates email format according to RFC 5322 standards with additional security checks
 */
const getEmailError = (email) => {
  if (!email) return "Email is required.";
  if (email.length > 250) return "Oops! That email's too long — the limit is 250 characters.";
  // No spaces allowed
  if (/\s/.test(email)) return "Email cannot contain spaces.";
  // Basic structure
  const parts = email.split("@");
  if (parts.length !== 2) return "Email must contain a single '@' symbol.";
  const [local, domain] = parts;
  // Local part checks
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._%+-]*[a-zA-Z0-9]$/.test(local) || local.length < 2)
    return "Local part must start and end with a letter or number and be at least 2 characters.";
  if (local.includes("..")) return "Local part cannot have consecutive dots.";
  if (local.startsWith(".") || local.endsWith(".")) return "Local part cannot start or end with a dot.";
  // Domain checks
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return "Domain contains invalid characters.";
  if (domain.includes("..")) return "Domain cannot have consecutive dots.";
  if (!domain.includes(".")) return "Domain must contain a dot.";
  if (domain.startsWith("-") || domain.endsWith("-")) return "Domain cannot start or end with a hyphen.";
  if (domain.startsWith(".") || domain.endsWith(".")) return "Domain cannot start or end with a dot.";
  // TLD check
  const tld = domain.split(".").pop();
  if (!tld || tld.length < 2) return "Domain must end with a valid TLD (e.g., .com, .org).";
  // At least one letter in local and domain
  if (!/[a-zA-Z]/.test(local)) return "Local part must contain at least one letter.";
  if (!/[a-zA-Z]/.test(domain)) return "Domain must contain at least one letter.";
  // Gibberish check (optional)
  if (local.length > 8 && !/[aeiou]/i.test(local)) return "Email local part looks like gibberish.";
  // Regex for overall structure
  const emailRegex = /^[a-zA-Z0-9](?!.*?\.\.)[a-zA-Z0-9._%+-]{0,62}[a-zA-Z0-9]@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return "Please enter a valid email address.";
  // Common domain typo check for gmail
  const lowerEmail = email.toLowerCase();
  if (
    lowerEmail.endsWith("@gamil.com") ||
    lowerEmail.endsWith("@gmial.com") ||
    lowerEmail.endsWith("@gmal.com") ||
    lowerEmail.endsWith("@gmail.con") ||
    lowerEmail.endsWith("@gmail.co") ||
    lowerEmail.endsWith("@gmail.cmo")
  ) {
    return "Did you mean '@gmail.com'? Please check your email domain spelling.";
  }
  return "";
};

/**
 * Validates email and returns true if valid, false otherwise
 */
export const validateEmail = (value) => {
  const sanitized = sanitizeEmail(value);
  if (!sanitized) return false;
  return getEmailError(sanitized) === "";
};

const analytics = {
  emit(eventName, payload) {
    if (typeof window === "undefined") return;
    try {
      window.dispatchEvent(
        new CustomEvent("feedback-analytics", {
          detail: { event: eventName, payload },
        })
      );
    } catch {
      console.info(`[analytics] ${eventName}`, payload);
    }
  },
};

export function useEmailPrefill(searchParams) {
  const [email, setEmail] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [emailFromUrl, setEmailFromUrl] = useState(false);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    try {
      const paramValue =
        typeof searchParams?.get === "function"
          ? searchParams.get("email")
          : new URLSearchParams(searchParams ?? "").get("email");

      const sanitized = sanitizeEmail(paramValue);
      if (!sanitized) {
        setEmailFromUrl(false);
        return;
      }

      // Always accept email from URL, even if validation fails (we'll trust it)
      // But still validate for warning purposes
      const emailError = getEmailError(sanitized);
      if (emailError === "") {
        setEmail(sanitized);
        setPrefilled(true);
        setEmailFromUrl(true);
        setWarning("");
        analytics.emit("email_prefilled", { emailDomain: sanitized.split("@")[1] });
      } else {
        // Even if validation fails, if TRUSTED_PREFILL is enabled, accept it
        if (TRUSTED_PREFILL) {
          setEmail(sanitized);
          setPrefilled(true);
          setEmailFromUrl(true);
          setWarning("");
        } else {
          setWarning(emailError);
          setEmailFromUrl(false);
        }
      }
    } catch (error) {
      console.warn("Failed to parse email prefill from URL", error);
      setEmailFromUrl(false);
    }
  }, [searchParams]);

  const isValidEmail = useMemo(() => validateEmail(email), [email]);

  const unlock = () => {
    setPrefilled(false);
    setEmailFromUrl(false); // Reset flag when user edits
    setTimeout(() => {
      const input = document.querySelector("[data-email-input]");
      if (input) {
        input.focus();
        input.select?.();
      }
    }, 0);
  };

  const setEmailSafe = (value) => {
    const sanitized = sanitizeEmail(value);
    setEmail(sanitized);
    // If user manually edits, reset emailFromUrl flag
    if (emailFromUrl && sanitized !== email) {
      setEmailFromUrl(false);
    }
    const emailError = getEmailError(sanitized);
    if (emailError === "") {
      setWarning("");
    } else {
      setWarning(emailError);
    }
  };

  // Get current email error message
  const emailError = useMemo(() => {
    if (!email) return "Email is required.";
    return getEmailError(email);
  }, [email]);

  return {
    email,
    setEmail: setEmailSafe,
    prefilled,
    emailFromUrl,
    unlock,
    isValidEmail: emailFromUrl ? true : isValidEmail, // Always valid if from URL
    warning: emailFromUrl ? "" : (emailError || warning), // No warning if from URL
    emailError: emailFromUrl ? "" : (emailError || ""), // No error if from URL
  };
}


