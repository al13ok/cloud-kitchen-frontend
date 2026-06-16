import OptimizedSignInForm from "@/components/auth/OptimizedSignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In - Converiqo",
  description: "Sign in to your Converiqo account and experience conversations re-imagined.",
  robots: "noindex, nofollow", // Prevent indexing of login page
};

export default function SignIn() {
  return <OptimizedSignInForm />;
}
