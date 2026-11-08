"use client";

import { useAuth } from "@/context/AuthContext";

/** Renders its children only when nobody is logged in. */
export default function GuestOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading || user) return null;
  return <>{children}</>;
}