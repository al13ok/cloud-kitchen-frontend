// Email Configuration Constants
// These can be overridden by environment variables or API responses

export const EMAIL_CONFIG = {
    // Default SMTP Configuration
    DEFAULT_SMTP_HOST: process.env.NEXT_PUBLIC_AWS_SMTP_HOST || process.env.NEXT_PUBLIC_DEFAULT_SMTP_HOST || "",
    DEFAULT_SMTP_PORT: parseInt(process.env.NEXT_PUBLIC_AWS_SMTP_PORT || process.env.NEXT_PUBLIC_DEFAULT_SMTP_PORT || "587"),
    DEFAULT_AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION || process.env.NEXT_PUBLIC_DEFAULT_AWS_REGION || "",
    DEFAULT_FROM_EMAIL: process.env.NEXT_PUBLIC_DEFAULT_FROM_EMAIL || process.env.NEXT_PUBLIC_AWS_FROM_EMAIL || "",
    DEFAULT_FROM_NAME: process.env.NEXT_PUBLIC_DEFAULT_FROM_NAME || "System",
    DEFAULT_COMPANY_DOMAIN: process.env.NEXT_PUBLIC_DEFAULT_COMPANY_DOMAIN || "",
    DEFAULT_EMAIL_MODULE: process.env.NEXT_PUBLIC_DEFAULT_EMAIL_MODULE || "default",
    
    // No default modules - all modules are created dynamically by users
  
    // No predefined module icons - users can add any emoji or text
  
    // No predefined module colors - all modules use default blue theme
  
    // Security Options
    SECURITY_OPTIONS: [
      { value: "tls", label: "STARTTLS (TLS)" },
      { value: "ssl", label: "TLS Wrapper (SSL)" }
    ],
  
    // Dynamic configuration getter
    getDynamicConfig: () => ({
      smtpHost: process.env.NEXT_PUBLIC_AWS_SMTP_HOST || process.env.NEXT_PUBLIC_DEFAULT_SMTP_HOST || "",
      smtpPort: parseInt(process.env.NEXT_PUBLIC_AWS_SMTP_PORT || process.env.NEXT_PUBLIC_DEFAULT_SMTP_PORT || "587"),
      awsRegion: process.env.NEXT_PUBLIC_AWS_REGION || process.env.NEXT_PUBLIC_DEFAULT_AWS_REGION || "",
      fromEmail: process.env.NEXT_PUBLIC_DEFAULT_FROM_EMAIL || process.env.NEXT_PUBLIC_AWS_FROM_EMAIL || "",
      fromName: process.env.NEXT_PUBLIC_DEFAULT_FROM_NAME || "System",
      companyDomain: process.env.NEXT_PUBLIC_DEFAULT_COMPANY_DOMAIN || "",
      defaultModule: process.env.NEXT_PUBLIC_DEFAULT_EMAIL_MODULE || "default",
      testModule: process.env.NEXT_PUBLIC_TEST_EMAIL_MODULE || process.env.NEXT_PUBLIC_DEFAULT_EMAIL_MODULE || "default"
    })
  };
  
  export default EMAIL_CONFIG;
  