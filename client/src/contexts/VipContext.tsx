import React, { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

interface VipContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionToken: string | null;
  login: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const VipContext = createContext<VipContextType>({
  isAuthenticated: false,
  isLoading: true,
  sessionToken: null,
  login: async () => ({ success: false }),
  logout: async () => {},
});

export function VipProvider({ children }: { children: React.ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(
    () => localStorage.getItem("dib_vip_token")
  );

  const { data: verifyData, isLoading } = trpc.vip.verify.useQuery(undefined, {
    retry: false,
    refetchInterval: 5 * 60 * 1000, // re-verify every 5 min
  });

  const loginMutation = trpc.vip.login.useMutation();
  const logoutMutation = trpc.vip.logout.useMutation();

  const isAuthenticated = verifyData?.authenticated === true;

  const login = async (code: string) => {
    const result = await loginMutation.mutateAsync({ code });
    if (result.success && result.token) {
      setSessionToken(result.token);
      localStorage.setItem("dib_vip_token", result.token);
    }
    return { success: result.success, error: result.error };
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
    setSessionToken(null);
    localStorage.removeItem("dib_vip_token");
  };

  return (
    <VipContext.Provider value={{ isAuthenticated, isLoading, sessionToken, login, logout }}>
      {children}
    </VipContext.Provider>
  );
}

export function useVip() {
  return useContext(VipContext);
}
