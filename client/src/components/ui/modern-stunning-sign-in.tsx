"use client";

import * as React from "react";
import { useState } from "react";
import { useLocation } from "wouter";
import { validateEmail } from "@/lib/utils";

const SignIn1 = () => {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [secretKey, setSecretKey] = React.useState("");
  const [showOwnerFields, setShowOwnerFields] = React.useState(false);
  const [error, setError] = React.useState("");
  const [, setLocation] = useLocation();

  // Check URL parameters and handle owner authentication
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isOwnerParam = urlParams.get("owner");
    const messageParam = urlParams.get("message");

    // If coming from Google OAuth as owner, pre-fill email and show message
    if (isOwnerParam === "true") {
      const ownerEmail = "shajith240@gmail.com";
      setEmail(ownerEmail);
      setShowOwnerFields(true);

      if (messageParam) {
        setError(decodeURIComponent(messageParam));
        // Clear the error after 5 seconds
        setTimeout(() => setError(""), 5000);
      }
    }
  }, []);

  // Check if email is owner email to show secret key field
  React.useEffect(() => {
    const ownerEmail = "shajith240@gmail.com";
    setShowOwnerFields(email.toLowerCase() === ownerEmail.toLowerCase());
    if (email.toLowerCase() !== ownerEmail.toLowerCase()) {
      setSecretKey(""); // Clear secret key if not owner email
    }
  }, [email]);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");

    try {
      // Prepare request body with optional secret key for owner authentication
      const requestBody: any = { email, password };

      // If owner email and secret key provided, include for owner authentication
      if (showOwnerFields && secretKey) {
        requestBody.ownerSecretKey = secretKey;
      }

      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();

        // Check if this is owner authentication with valid secret key
        if (data.isOwner && data.redirectToOwnerDashboard) {
          setLocation("/owner/dashboard");
        } else {
          setLocation("/dashboard");
        }
      } else {
        const data = await response.json();
        setError(data.message || "Sign in failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const handleGoogleSignIn = () => {
    // Directly redirect to Google OAuth
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden w-full rounded-xl">
      {/* Animated background */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#38B6FF] rounded-full filter blur-[150px] opacity-20 z-0"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#C1FF72] rounded-full filter blur-[150px] opacity-20 z-0"></div>

      {/* Centered glass card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-gradient-to-r from-[#ffffff10] to-[#12121210] backdrop-blur-sm shadow-2xl p-8 flex flex-col items-center border border-border/30">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <div className="bg-black p-2 rounded-md border-2 border-[#38B6FF]">
            <div className="text-[#C1FF72] font-bold text-2xl tracking-wider">
              ARTI<span className="text-white">VANCE</span>
            </div>
          </div>
        </div>
        {/* Title */}
        <h2 className="text-2xl font-semibold text-foreground mb-6 text-center">
          Sign in to your account
        </h2>
        {/* Form */}
        <div className="flex flex-col w-full gap-4">
          <div className="w-full flex flex-col gap-3">
            <input
              placeholder="Email"
              type="email"
              value={email}
              className="w-full px-5 py-3 rounded-xl bg-white/10 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              className="w-full px-5 py-3 rounded-xl bg-white/10 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Owner Secret Key Field - Only shown for owner email */}
            {showOwnerFields && (
              <div className="space-y-3 p-4 rounded-xl bg-gradient-to-r from-[#C1FF72]/5 to-[#38B6FF]/5 border border-[#C1FF72]/20">
                <div className="flex items-center gap-2 text-[#C1FF72] text-sm font-medium">
                  <span className="text-lg">👑</span>
                  Owner Authentication Detected
                </div>
                <input
                  placeholder="Enter your secret key to access Owner Dashboard"
                  type="password"
                  value={secretKey}
                  className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-[#C1FF72]/10 to-[#38B6FF]/10 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-[#C1FF72] border border-[#C1FF72]/30"
                  onChange={(e) => setSecretKey(e.target.value)}
                />
                <div className="text-xs text-gray-400 text-left">
                  <div className="flex items-start gap-2">
                    <span>🔐</span>
                    <div>
                      <p className="text-[#C1FF72]">With secret key:</p>
                      <p>
                        → Access Owner Dashboard (customer management, setup
                        workflow)
                      </p>
                      <p className="text-gray-500 mt-1">Without secret key:</p>
                      <p className="text-gray-500">
                        → Access regular User Dashboard
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm text-red-400 text-left">{error}</div>
            )}
          </div>
          <hr className="opacity-10" />
          <div>
            <button
              onClick={handleSignIn}
              className="w-full bg-primary text-primary-foreground font-medium px-5 py-3 rounded-full shadow hover:bg-primary/90 transition mb-3 text-sm"
            >
              Sign in
            </button>
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-card to-background rounded-full px-5 py-3 font-medium text-foreground shadow hover:brightness-110 transition mb-2 text-sm border border-border"
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Continue with Google
            </button>
            <div className="w-full text-center mt-2">
              <span className="text-xs text-muted-foreground">
                Don&apos;t have an account?{" "}
                <a
                  href="/sign-up"
                  className="underline text-foreground/80 hover:text-foreground"
                >
                  Sign up, it&apos;s free!
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* User count and avatars */}
      <div className="relative z-10 mt-12 flex flex-col items-center text-center">
        <p className="text-muted-foreground text-sm mb-2">
          Join <span className="font-medium text-foreground">thousands</span> of
          businesses already using ARTIVANCE.
        </p>
        <div className="flex">
          <img
            src="https://randomuser.me/api/portraits/men/32.jpg"
            alt="user"
            className="w-8 h-8 rounded-full border-2 border-background object-cover"
          />
          <img
            src="https://randomuser.me/api/portraits/women/44.jpg"
            alt="user"
            className="w-8 h-8 rounded-full border-2 border-background object-cover -ml-2"
          />
          <img
            src="https://randomuser.me/api/portraits/men/54.jpg"
            alt="user"
            className="w-8 h-8 rounded-full border-2 border-background object-cover -ml-2"
          />
          <img
            src="https://randomuser.me/api/portraits/women/68.jpg"
            alt="user"
            className="w-8 h-8 rounded-full border-2 border-background object-cover -ml-2"
          />
        </div>
      </div>
    </div>
  );
};

export { SignIn1 };
