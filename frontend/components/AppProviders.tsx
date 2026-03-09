"use client";

import { ClerkProvider, useAuth, useClerk, useUser } from "@clerk/nextjs";
import React, { useEffect } from "react";
import { resetRuntimeAuthState, setRuntimeAuthActions, setRuntimeAuthState } from "../lib/auth";

function AuthRuntimeFallback() {
  useEffect(() => {
    setRuntimeAuthActions({ openSignIn: null, signOut: null });
    resetRuntimeAuthState(true);
  }, []);

  return null;
}

function ClerkRuntimeBridge() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser();
  const primaryEmail =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;

  useEffect(() => {
    setRuntimeAuthActions({
      openSignIn: (redirectUrl: string) => {
        clerk.openSignIn({
          forceRedirectUrl: redirectUrl,
          fallbackRedirectUrl: redirectUrl,
        });
      },
      signOut: async (redirectUrl: string) => {
        await clerk.signOut({ redirectUrl });
      },
    });
    return () => {
      setRuntimeAuthActions({ openSignIn: null, signOut: null });
    };
  }, [clerk]);

  useEffect(() => {
    let active = true;
    let refreshTimer: number | null = null;

    async function syncRuntimeAuth() {
      if (!active) return;
      if (!isLoaded) {
        resetRuntimeAuthState(false);
        return;
      }
      if (!isSignedIn || !userId) {
        resetRuntimeAuthState(true);
        return;
      }
      const token = await getToken({ template: "litopc-api" }).catch(() => null);
      if (!active) return;
      setRuntimeAuthState({
        ready: true,
        signedIn: true,
        token,
        userId,
        email: primaryEmail,
      });
    }

    void syncRuntimeAuth();
    if (isLoaded && isSignedIn && userId) {
      refreshTimer = window.setInterval(() => {
        void syncRuntimeAuth();
      }, 4 * 60 * 1000);
    }

    return () => {
      active = false;
      if (refreshTimer !== null) {
        window.clearInterval(refreshTimer);
      }
    };
  }, [
    getToken,
    isLoaded,
    isSignedIn,
    primaryEmail,
    userId,
  ]);

  return null;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const publishableKey = (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim();
  if (!publishableKey) {
    return (
      <>
        <AuthRuntimeFallback />
        {children}
      </>
    );
  }
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <ClerkRuntimeBridge />
      {children}
    </ClerkProvider>
  );
}
