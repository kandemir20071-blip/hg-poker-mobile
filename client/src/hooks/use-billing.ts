import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const WEB_PRICE = "$5.00/mo";
const NATIVE_PRICE = "$6.99/mo";

export function useBilling() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const isNative = Capacitor.isNativePlatform();
  const priceLabel = isNative ? NATIVE_PRICE : WEB_PRICE;

  const handleUpgrade = async () => {
    setIsLoading(true);

    if (isNative) {
      try {
        const { Purchases } = await import("@revenuecat/purchases-capacitor");
        const offerings = await Purchases.getOfferings();
        const pkg = offerings.current?.availablePackages?.[0];

        if (!pkg) {
          toast({
            title: "Unavailable",
            description: "No subscription packages found. Please try again later.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const result = await Purchases.purchasePackage({ aPackage: pkg });
        const isPro = result.customerInfo.entitlements.active["pro"] !== undefined;

        if (isPro) {
          const res = await fetch("/api/revenuecat-activate", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              appUserId: result.customerInfo.originalAppUserId,
            }),
          });
          const data = await res.json();
          if (data.success) {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          } else {
            toast({
              title: "Activation issue",
              description: "Purchase succeeded but activation failed. Please contact support.",
              variant: "destructive",
            });
          }
        }
      } catch (err: any) {
        if (err?.code !== "PURCHASE_CANCELLED_ERROR") {
          toast({
            title: "Purchase failed",
            description: err?.message || "Something went wrong with the purchase.",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          toast({
            title: "Error",
            description: data.message || "Failed to start checkout",
            variant: "destructive",
          });
          setIsLoading(false);
        }
      } catch {
        toast({
          title: "Error",
          description: "Failed to connect to payment service",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    }
  };

  return { handleUpgrade, isLoading, isNative, priceLabel };
}
