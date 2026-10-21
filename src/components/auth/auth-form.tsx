"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
} from "lucide-react";

type Mode = "signin" | "register";

interface AuthFormProps {
  onSuccess: () => void;
}

const TABS: ReadonlyArray<{ key: Mode; label: string }> = [
  { key: "signin", label: "Sign In" },
  { key: "register", label: "Register" },
];

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      onSuccess();
    } catch {
      setError("Unable to reach the server. Check your connection and retry.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div
        role="tablist"
        aria-label="Authentication mode"
        className="grid grid-cols-2 gap-1 rounded-xl bg-navy-50 p-1"
      >
        {TABS.map((tab) => {
          const active = mode === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => switchMode(tab.key)}
              className={[
                "rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                active
                  ? "bg-white text-navy-800 shadow-sm ring-1 ring-navy-100"
                  : "text-navy-500 hover:text-navy-700",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-navy-500">
            {isRegister
              ? "Set up access for your team to track chemical usage."
              : "Sign in to continue tracking chemical usage."}
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="space-y-2">
          <label
            htmlFor="username"
            className="block text-sm font-medium text-navy-800"
          >
            Username
          </label>
          <div className="relative">
            <User
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300"
              aria-hidden="true"
            />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              className="w-full rounded-lg border border-navy-200 bg-white py-3 pl-11 pr-4 text-sm text-navy-900 placeholder:text-navy-300 outline-none transition focus:border-navy-500 focus:ring-4 focus:ring-navy-500/10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-navy-800"
          >
            Password
          </label>
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300"
              aria-hidden="true"
            />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                isRegister ? "Create a password" : "Enter your password"
              }
              className="w-full rounded-lg border border-navy-200 bg-white py-3 pl-11 pr-12 text-sm text-navy-900 placeholder:text-navy-300 outline-none transition focus:border-navy-500 focus:ring-4 focus:ring-navy-500/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-navy-400 transition hover:bg-navy-50 hover:text-navy-600"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {isRegister ? (
            <p className="text-xs text-navy-400">
              Minimum 6 characters. Use a mix of letters and numbers.
            </p>
          ) : null}
        </div>

        {isRegister ? (
          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-navy-800"
            >
              Confirm password
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-300"
                aria-hidden="true"
              />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your password"
                className="w-full rounded-lg border border-navy-200 bg-white py-3 pl-11 pr-4 text-sm text-navy-900 placeholder:text-navy-300 outline-none transition focus:border-navy-500 focus:ring-4 focus:ring-navy-500/10"
              />
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="group flex w-full items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-navy-900/15 transition hover:bg-navy-900 focus:outline-none focus:ring-4 focus:ring-navy-500/25 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {isRegister ? "Creating account..." : "Signing in..."}
            </>
          ) : (
            <>
              {isRegister ? "Create account" : "Sign in"}
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </>
          )}
        </button>

        <p className="text-center text-xs text-navy-400">
          {isRegister
            ? "Already have an account? "
            : "Don't have an account? "}
          <button
            type="button"
            onClick={() => switchMode(isRegister ? "signin" : "register")}
            className="font-semibold text-navy-700 underline-offset-4 hover:underline"
          >
            {isRegister ? "Sign in" : "Register"}
          </button>
        </p>

      </form>
    </div>
  );
}

