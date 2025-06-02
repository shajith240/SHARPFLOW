"use client";

import * as React from "react";
import { useState } from "react";
import { useLocation } from "wouter";
import { validateEmail, validatePassword } from "@/lib/utils";

const SignUp = () => {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [, setLocation] = useLocation();

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors[0]);
      return;
    }
    setError("");

    try {
      const [firstName, ...lastNameParts] = name.split(" ");
      const lastName = lastNameParts.join(" ");

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
        }),
      });

      if (response.ok) {
        setLocation("/");
      } else {
        const data = await response.json();
        setError(data.message || "Sign up failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  const handleGoogleSignUp = () => {
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
          Create an Account
        </h2>
        {/* Form */}
        <div className="flex flex-col w-full gap-4">
          <div className="w-full flex flex-col gap-3">
            <input
              placeholder="Full Name"
              type="text"
              value={name}
              className="w-full px-5 py-3 rounded-xl bg-white/10 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={(e) => setName(e.target.value)}
            />
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
            <input
              placeholder="Confirm Password"
              type="password"
              value={confirmPassword}
              className="w-full px-5 py-3 rounded-xl bg-white/10 text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error && (
              <div className="text-sm text-red-400 text-left">{error}</div>
            )}
          </div>
          <hr className="opacity-10" />
          <div>
            <button
              onClick={handleSignUp}
              className="w-full bg-primary text-primary-foreground font-medium px-5 py-3 rounded-full shadow hover:bg-primary/90 transition mb-3 text-sm"
            >
              Sign up
            </button>
            {/* Google Sign Up */}
            <button
              onClick={handleGoogleSignUp}
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
                Already have an account?{" "}
                <a
                  href="/sign-in"
                  className="underline text-foreground/80 hover:text-foreground"
                >
                  Sign in
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

export { SignUp };
