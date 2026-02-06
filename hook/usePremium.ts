// hooks/usePremium.ts
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; // 기존 인증 방식에 맞게 수정
import { checkPremium, getSubscriptionInfo } from "@/lib/checkPremium";

interface SubscriptionInfo {
  plan: string;
  price: number;
  startedAt: Date;
  expiresAt: Date;
  daysLeft: number;
}

export function usePremium() {
  const { data: session } = useSession();
  const [isPremium, setIsPremium] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      if (!session?.user) {
        setIsPremium(false);
        setSubscription(null);
        setLoading(false);
        return;
      }

      try {
        const userId = (session.user as any).id;
        const [premium, info] = await Promise.all([
          checkPremium(userId),
          getSubscriptionInfo(userId),
        ]);

        setIsPremium(premium);
        setSubscription(info);
      } catch (error) {
        console.error("프리미엄 체크 에러:", error);
        setIsPremium(false);
        setSubscription(null);
      } finally {
        setLoading(false);
      }
    }

    check();
  }, [session]);

  return { isPremium, subscription, loading };
}
