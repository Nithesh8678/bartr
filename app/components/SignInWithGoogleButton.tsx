"use client";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/hooks/client-auth-actions"; // Updated import
import React from "react";

const SignInWithGoogleButton = () => {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => {
        signInWithGoogle();
      }}
    >
      Login with Google
    </Button>
  );
};

export default SignInWithGoogleButton;