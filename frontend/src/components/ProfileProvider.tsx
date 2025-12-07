'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UserProfile = {
  id: number;
  username: string;
  fullName: string;
  roles: string[];
  group?: { id: number; name: string } | null;
};

type ProfileContextValue = {
  user: UserProfile | null;
  role: string;
  loading: boolean;
  refetch: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export const useProfile = (): ProfileContextValue => {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return ctx;
};

const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      router.push("/login");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Unauthorized");
      }
      const profile = await response.json();
      setUser(profile.user ?? profile);
    } catch {
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      user,
      role: (user?.roles?.[0] ?? "student").toLowerCase(),
      loading,
      refetch: loadProfile,
    }),
    [user, loading, loadProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export default ProfileProvider;
