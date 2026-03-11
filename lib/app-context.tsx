"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { UserRole, StaffMember } from "@/lib/types";

interface VKUser {
  id: number;
  first_name?: string;
  last_name?: string;
  photo_100?: string;
}

interface AppContext {
  vkUser: VKUser | null;
  role: UserRole;
  staffMember: StaffMember | null;
  loading: boolean;
  refetchRole: () => void;
}

const AppCtx = createContext<AppContext>({
  vkUser: null,
  role: null,
  staffMember: null,
  loading: true,
  refetchRole: () => {},
});

export function useApp() {
  return useContext(AppCtx);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [vkUser, setVkUser] = useState<VKUser | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async (uid: number) => {
    try {
      const res = await fetch(`/api/role?uid=${uid}`);
      const data = await res.json();
      setRole(data.role);
      setStaffMember(data.member || null);
    } catch {
      setRole(null);
    }
  }, []);

  const initVK = useCallback(async () => {
    try {
      // Try VK Bridge
      const bridge = await import("@vkontakte/vk-bridge");
      await bridge.default.send("VKWebAppInit");
      const userData = await bridge.default.send("VKWebAppGetUserInfo");
      const user: VKUser = {
        id: userData.id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        photo_100: userData.photo_100,
      };
      setVkUser(user);
      await fetchRole(user.id);
    } catch {
      // Fallback: try to get uid from URL params (VK Mini App launch params)
      const params = new URLSearchParams(window.location.search);
      const urlUid = params.get("vk_user_id");
      if (urlUid) {
        const uid = parseInt(urlUid);
        setVkUser({ id: uid });
        await fetchRole(uid);
      } else {
        // Dev mode: use test user
        const devUid = 0;
        setVkUser({ id: devUid });
        await fetchRole(devUid);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchRole]);

  useEffect(() => {
    initVK();
  }, [initVK]);

  const refetchRole = useCallback(() => {
    if (vkUser) fetchRole(vkUser.id);
  }, [vkUser, fetchRole]);

  return (
    <AppCtx.Provider value={{ vkUser, role, staffMember, loading, refetchRole }}>
      {children}
    </AppCtx.Provider>
  );
}
