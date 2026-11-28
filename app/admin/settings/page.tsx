"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Lock,
  Unlock,
  Clock,
  Save,
  Shield,
  Info,
  Loader2,
  UploadCloud,
  Video,
  Image as ImageIcon,
  X,
  Check,
  Bell,
  BellOff,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { uploadAdminMedia } from "@/lib/imagekitUpload";
import { getPublicMediaUrl } from "@/lib/publicMedia";
import { getOriginalVideoUrl } from "@/lib/videoDelivery";
import { getBackgroundImageUrl } from "@/lib/backgroundImageDelivery";
import { prepareImageKitImage } from "@/lib/prepareImageKitImage";
import AdminPageLoader from "@/components/admin/AdminPageLoader";

type MediaSlot = "home" | "shop" | "cart" | "header";
type BackgroundType = "video" | "image";

type StorefrontMediaState = {
  homeBackgroundType: BackgroundType;
  homeVideoUrl: string;
  homeVideoFileId: string;
  homePosterUrl: string;
  homeImageUrl: string;
  homeCarouselUrls: string[];
  shopBackgroundType: BackgroundType;
  shopVideoUrl: string;
  shopVideoFileId: string;
  shopPosterUrl: string;
  shopImageUrl: string;
  cartBackgroundType: "image";
  cartImageUrl: string;
  headerImageUrl: string;
};

const defaultMedia: StorefrontMediaState = {
  homeBackgroundType: "video",
  homeVideoUrl: getPublicMediaUrl("/placeholder.svg"),
  homeVideoFileId: "",
  homePosterUrl: "",
  homeImageUrl: "",
  homeCarouselUrls: [],
  shopBackgroundType: "video",
  shopVideoUrl: getPublicMediaUrl(""),
  shopVideoFileId: "",
  shopPosterUrl: "",
  shopImageUrl: "",
  cartBackgroundType: "image",
  cartImageUrl: "",
  headerImageUrl: getPublicMediaUrl("/placeholder.svg"),
};

const BACKGROUND_IMAGE_STATE_PREFIX = "storefront-background-image:";

function readBackgroundImageState(value: unknown) {
  if (typeof value !== "string" || !value.startsWith(BACKGROUND_IMAGE_STATE_PREFIX)) {
    return { backgroundType: "video" as const, imageUrl: "", carouselUrls: [] as string[], cartImageUrl: "", headerImageUrl: "", posterUrl: typeof value === "string" ? value : "" };
  }

  try {
    const data = JSON.parse(value.slice(BACKGROUND_IMAGE_STATE_PREFIX.length));
    return {
      backgroundType: data?.backgroundType === "image" ? "image" as const : "video" as const,
      imageUrl: typeof data?.imageUrl === "string" ? data.imageUrl : "",
      carouselUrls: Array.isArray(data?.carouselUrls) ? data.carouselUrls.filter((url: unknown): url is string => typeof url === "string") : [],
      cartImageUrl: typeof data?.cartImageUrl === "string" ? data.cartImageUrl : "",
      headerImageUrl: typeof data?.headerImageUrl === "string" ? data.headerImageUrl : "",
      posterUrl: "",
    };
  } catch {
    return { backgroundType: "video" as const, imageUrl: "", carouselUrls: [] as string[], cartImageUrl: "", headerImageUrl: "", posterUrl: "" };
  }
}

function writeBackgroundImageState(backgroundType: BackgroundType, imageUrl: string, carouselUrls: string[], cartImageUrl: string, headerImageUrl = "") {
  return `${BACKGROUND_IMAGE_STATE_PREFIX}${JSON.stringify({ backgroundType, imageUrl, carouselUrls, cartImageUrl, headerImageUrl })}`;
}

function getBackgroundType(media: StorefrontMediaState, slot: MediaSlot): BackgroundType {
  if (slot === "cart" || slot === "header") return "image";
  return slot === "home" ? media.homeBackgroundType : media.shopBackgroundType;
}

function getBackgroundUrl(media: StorefrontMediaState, slot: MediaSlot) {
  if (slot === "cart") return media.cartImageUrl;
  if (slot === "header") return media.headerImageUrl;
  const type = getBackgroundType(media, slot);
  if (slot === "home") return type === "video" ? media.homeVideoUrl : media.homeImageUrl;
  return type === "video" ? media.shopVideoUrl : media.shopImageUrl;
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) output[index] = raw.charCodeAt(index);
  return output;
}

export default function AdminSettings() {
  const [isLocked, setIsLocked] = useState(false);
  const [unlockAt, setUnlockAt] = useState("");
  const [lockPassword, setLockPassword] = useState("shealteredherego");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lockSaving, setLockSaving] = useState(false);
  const [media, setMedia] = useState<StorefrontMediaState>(defaultMedia);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [activeMediaSlot, setActiveMediaSlot] = useState<MediaSlot>("home");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingCarousel, setUploadingCarousel] = useState(false);
  const [pushStatus, setPushStatus] = useState<"checking" | "unsupported" | "disabled" | "enabled" | "denied" | "misconfigured">("checking");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get",
            collection: "settings",
            id: "global_settings",
          }),
        });

        if (response.status === 404) return;

        const settings = await response.json();

        if (settings) {
          const homeImageState = readBackgroundImageState(settings.homePosterUrl);
          const shopImageState = readBackgroundImageState(settings.shopPosterUrl);
          setIsLocked(
            typeof settings.isLocked === "string"
              ? settings.isLocked === "true"
              : Boolean(settings.isLocked)
          );
          setUnlockAt(
            settings.unlockAt
              ? new Date(settings.unlockAt).toISOString().slice(0, 16)
              : ""
          );
          setLockPassword(settings.lockPassword || "shealteredherego");
          setMedia({
            homeBackgroundType: homeImageState.backgroundType,
            homeVideoUrl: getOriginalVideoUrl(settings.homeVideoUrl || defaultMedia.homeVideoUrl),
            homeVideoFileId: settings.homeVideoFileId || "",
            homePosterUrl: homeImageState.posterUrl,
            homeImageUrl: homeImageState.imageUrl,
            homeCarouselUrls: homeImageState.carouselUrls,
            shopBackgroundType: shopImageState.backgroundType,
            shopVideoUrl: getOriginalVideoUrl(settings.shopVideoUrl || defaultMedia.shopVideoUrl),
            shopVideoFileId: settings.shopVideoFileId || "",
            shopPosterUrl: shopImageState.posterUrl,
            shopImageUrl: shopImageState.imageUrl,
            cartBackgroundType: "image",
            cartImageUrl: homeImageState.cartImageUrl,
            headerImageUrl: shopImageState.headerImageUrl || defaultMedia.headerImageUrl,
          });
        }
      } catch (err) {
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  useEffect(() => {
    async function checkPushStatus() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setPushStatus("unsupported");
        return;
      }
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setPushStatus("misconfigured");
        return;
      }
      if (Notification.permission === "denied") {
        setPushStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      setPushStatus(subscription ? "enabled" : "disabled");
    }

    void checkPushStatus();
  }, []);

  const enablePushNotifications = async () => {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setPushStatus("misconfigured");
      toast.error("Web Push is not configured yet.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setPushStatus("unsupported");
      toast.error("Push notifications are not supported by this browser/device.");
      return;
    }

    try {
      setPushBusy(true);
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("denied");
        toast.error("Notification permission was not granted.");
        return;
      }
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }
      const response = await fetch("/api/admin/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON(), userAgent: navigator.userAgent }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save this device.");
      setPushStatus("enabled");
      toast.success("Push notifications are enabled on this device.");
    } catch (error: any) {
      toast.error(error.message || "Could not enable push notifications.");
    } finally {
      setPushBusy(false);
    }
  };

  const disablePushNotifications = async () => {
    try {
      setPushBusy(true);
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/admin/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPushStatus("disabled");
      toast.success("Push notifications are disabled on this device.");
    } catch (error: any) {
      toast.error(error.message || "Could not disable push notifications.");
    } finally {
      setPushBusy(false);
    }
  };

  const sendTestPushNotification = async () => {
    try {
      setPushBusy(true);
      const response = await fetch("/api/admin/push/test", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send a test notification.");
      if (!result.sent) {
        toast.error("No active push subscriptions were found for this admin.");
        return;
      }
      toast.success("Test notification sent.");
    } catch (error: any) {
      toast.error(error.message || "Could not send a test notification.");
    } finally {
      setPushBusy(false);
    }
  };

  const replayRecentOrderNotifications = async () => {
    try {
      setPushBusy(true);
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) {
        setPushStatus("disabled");
        throw new Error("Enable push notifications on this device before replaying orders.");
      }
      const response = await fetch("/api/admin/push/test-recent-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not replay recent order notifications.");
      if (!result.sent) {
        toast.error("No active push subscriptions were found for this admin.");
        return;
      }
      toast.success(`${result.notifications} notifications replayed on this device from ${result.orders} Spectrum drop orders.`);
    } catch (error: any) {
      toast.error(error.message || "Could not replay recent order notifications.");
    } finally {
      setPushBusy(false);
    }
  };

  const sendTodayVisitorUpdate = async () => {
    try {
      setPushBusy(true);
      const response = await fetch("/api/admin/push/visitor-update", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send today’s visitor update.");
      if (!result.delivery?.sent) {
        toast.error("No active push subscriptions were found for this admin.");
        return;
      }
      toast.success(`Visitor update sent: ${result.count} today, next milestone ${result.nextMilestone}.`);
    } catch (error: any) {
      toast.error(error.message || "Could not send today’s visitor update.");
    } finally {
      setPushBusy(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const data = {
        isLocked,
        unlockAt: unlockAt ? new Date(unlockAt).toISOString() : null,
        lockPassword,
      };

      let response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          collection: "settings",
          id: "global_settings",
          data,
        }),
      });

      if (!response.ok && response.status === 404) {
        response = await fetch("/api/admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            collection: "settings",
            data: { ...data, $id: "global_settings" },
          }),
        });
      }

      if (!response.ok) throw new Error("Save failed");

      toast.success("Settings updated successfully");
    } catch (err: any) {
      toast.error(err.message || "System error");
    } finally {
      setSaving(false);
    }
  };

  const handleLockToggle = async () => {
    if (lockSaving) return;

    const previousValue = isLocked;
    const nextValue = !previousValue;
    const scheduledUnlock = unlockAt ? new Date(unlockAt) : null;
    const hasExpiredUnlock = Boolean(
      nextValue &&
      scheduledUnlock &&
      Number.isFinite(scheduledUnlock.getTime()) &&
      scheduledUnlock.getTime() <= Date.now()
    );

    setIsLocked(nextValue);
    setLockSaving(true);

    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          collection: "settings",
          id: "global_settings",
          data: {
            isLocked: nextValue,
            ...(hasExpiredUnlock ? { unlockAt: null } : {}),
          },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not update site visibility");

      const persistedValue = typeof result.isLocked === "string"
        ? result.isLocked === "true"
        : Boolean(result.isLocked);
      if (persistedValue !== nextValue) throw new Error("Appwrite did not save the new lock state");

      if (hasExpiredUnlock) setUnlockAt("");
      toast.success(nextValue ? "Storefront locked" : "Storefront is live");
    } catch (error: any) {
      setIsLocked(previousValue);
      toast.error(error.message || "Could not update site visibility");
    } finally {
      setLockSaving(false);
    }
  };

  const openMediaModal = (slot: MediaSlot) => {
    setActiveMediaSlot(slot);
    setUploadProgress(0);
    setMediaModalOpen(true);
  };

  const handleMediaUpload = async (file?: File) => {
    if (!file) return;
    const backgroundType = getBackgroundType(media, activeMediaSlot);
    if (backgroundType === "video" && !file.type.startsWith("video/")) {
      toast.error("Choose an MP4, WebM, or MOV video file");
      return;
    }
    if (backgroundType === "image" && !file.type.startsWith("image/")) {
      toast.error("Choose a JPG, PNG, or WebP image file");
      return;
    }

    setUploadingMedia(true);
    setUploadProgress(0);
    try {
      const prepared = backgroundType === "image"
        ? await prepareImageKitImage(file)
        : { file, optimized: false };
      if (prepared.optimized && "originalWidth" in prepared) {
        toast.info(
          `Large image optimized from ${prepared.originalWidth}×${prepared.originalHeight} to ${prepared.width}×${prepared.height}`,
        );
      }

      const result = await uploadAdminMedia({
        file: prepared.file,
        folder: `/storefront/storefront/${activeMediaSlot}`,
        tags: ["storefront", "storefront", activeMediaSlot, `background-${backgroundType}`],
        onProgress: setUploadProgress,
      });

      const mediaName = backgroundType === "video" ? "Video" : "Image";
      const urlKey = `${activeMediaSlot}${mediaName}Url` as const;
      setMedia((current) => ({
        ...current,
        [urlKey]: backgroundType === "video" ? getOriginalVideoUrl(result.url) : result.url,
        ...(backgroundType === "video" ? { [`${activeMediaSlot}${mediaName}FileId`]: result.fileId } : {}),
      }));
      setUploadProgress(100);
      toast.success(`${backgroundType === "video" ? "Video" : "Image"} uploaded to ImageKit`);
    } catch (error: any) {
      toast.error(error.message || "ImageKit upload failed");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleMediaSave = async () => {
    setSavingMedia(true);
    try {
      const normalizedMedia = {
        homeVideoUrl: getOriginalVideoUrl(media.homeVideoUrl),
        homeVideoFileId: media.homeVideoFileId,
        homePosterUrl: writeBackgroundImageState(media.homeBackgroundType, media.homeImageUrl, media.homeCarouselUrls, media.cartImageUrl),
        shopVideoUrl: getOriginalVideoUrl(media.shopVideoUrl),
        shopVideoFileId: media.shopVideoFileId,
        shopPosterUrl: writeBackgroundImageState(media.shopBackgroundType, media.shopImageUrl, [], "", media.headerImageUrl),
      };
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          collection: "settings",
          id: "global_settings",
          data: normalizedMedia,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save media");

      setMedia((current) => ({
        ...current,
        homeVideoUrl: normalizedMedia.homeVideoUrl,
        shopVideoUrl: normalizedMedia.shopVideoUrl,
      }));
      toast.success("Storefront background updated");
      setMediaModalOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Could not save storefront media");
    } finally {
      setSavingMedia(false);
    }
  };

  const handleCarouselUpload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a JPG, PNG, or WebP image file");
      return;
    }
    if (media.homeCarouselUrls.length >= 6) {
      toast.error("A maximum of six carousel images is allowed");
      return;
    }

    setUploadingCarousel(true);
    try {
      const prepared = await prepareImageKitImage(file);
      const result = await uploadAdminMedia({
        file: prepared.file,
        folder: "/storefront/storefront/home-carousel",
        tags: ["storefront", "home", "carousel"],
      });
      setMedia((current) => ({ ...current, homeCarouselUrls: [...current.homeCarouselUrls, result.url] }));
      toast.success("Carousel image uploaded. Save carousel to publish it.");
    } catch (error: any) {
      toast.error(error.message || "ImageKit upload failed");
    } finally {
      setUploadingCarousel(false);
    }
  };

  const saveCarousel = async () => {
    setSavingMedia(true);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          collection: "settings",
          id: "global_settings",
          data: {
            homePosterUrl: writeBackgroundImageState(media.homeBackgroundType, media.homeImageUrl, media.homeCarouselUrls, media.cartImageUrl),
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save carousel");
      toast.success("Homepage carousel updated");
    } catch (error: any) {
      toast.error(error.message || "Could not save carousel");
    } finally {
      setSavingMedia(false);
    }
  };

  if (loading) {
    return <AdminPageLoader label="Loading settings" />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* HEADER */}
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">System Settings</h1>
        <p className="text-sm text-zinc-500">
          Manage site access, lock rules, and global configuration.
        </p>
      </header>

      {/* STATUS BANNER */}
      <div
        className={`rounded-2xl p-4 flex items-center gap-3 border ${
          isLocked
            ? "bg-red-50 border-red-100"
            : "bg-green-50 border-green-100"
        }`}
      >
        {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
        <p className="text-sm font-medium">
          Site is currently{" "}
          <span className="font-bold">
            {isLocked ? "LOCKED" : "LIVE"}
          </span>
        </p>
      </div>

      <section className="border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="max-w-xl">
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <Bell size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Admin alerts</span>
            </div>
            <h2 className="text-xl font-semibold">Push Notifications</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Receive instant notifications for orders, emails, stock alerts, and important admin events on this device.
            </p>
          </div>
          <div className={`w-fit rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${
            pushStatus === "enabled" ? "bg-emerald-50 text-emerald-700" :
            pushStatus === "denied" ? "bg-red-50 text-red-700" :
            "bg-zinc-100 text-zinc-500"
          }`}>
            {pushStatus === "checking" ? "Checking" :
              pushStatus === "enabled" ? "Notifications enabled" :
              pushStatus === "denied" ? "Permission denied" :
              pushStatus === "unsupported" ? "Unsupported device" :
              pushStatus === "misconfigured" ? "Configuration needed" : "Notifications not enabled"}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          {pushStatus === "enabled" ? (
            <>
              <button
                type="button"
                onClick={sendTestPushNotification}
                disabled={pushBusy}
                className="inline-flex h-11 items-center justify-center gap-2 bg-black px-5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-zinc-800 disabled:opacity-40"
              >
                {pushBusy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Send Test Notification
              </button>
              <button
                type="button"
                onClick={replayRecentOrderNotifications}
                disabled={pushBusy}
                className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-300 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-600 transition hover:border-black hover:text-black disabled:opacity-40"
              >
                {pushBusy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Replay Spectrum Drop Orders
              </button>
              <button
                type="button"
                onClick={sendTodayVisitorUpdate}
                disabled={pushBusy}
                className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-300 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-600 transition hover:border-black hover:text-black disabled:opacity-40"
              >
                {pushBusy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Send Today’s Visitor Update
              </button>
              <button
                type="button"
                onClick={disablePushNotifications}
                disabled={pushBusy}
                className="inline-flex h-11 items-center justify-center gap-2 border border-zinc-300 px-5 text-[10px] font-bold uppercase tracking-widest text-zinc-600 transition hover:border-black hover:text-black disabled:opacity-40"
              >
                <BellOff size={15} />
                Disable on this device
              </button>
            </>
          ) : pushStatus === "denied" ? (
            <p className="text-sm text-zinc-500">Allow notifications in your browser or iPhone app settings, then return here and enable them.</p>
          ) : pushStatus === "unsupported" ? (
            <p className="text-sm text-zinc-500">Use a supported browser. On iPhone, install the admin site to the Home Screen and open that installed app.</p>
          ) : pushStatus === "misconfigured" ? (
            <p className="text-sm text-zinc-500">Add the VAPID environment variables, deploy, then return here to enable notifications.</p>
          ) : (
            <button
              type="button"
              onClick={enablePushNotifications}
              disabled={pushBusy || pushStatus === "checking"}
              className="inline-flex h-11 items-center justify-center gap-2 bg-black px-5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-zinc-800 disabled:opacity-40"
            >
              {pushBusy ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
              Enable Notifications
            </button>
          )}
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-400">Visitor alerts are sent automatically at 50, 100, 150, and every additional 50 unique storefront visitors each Lagos day. “Send Today’s Visitor Update” initializes today’s count and sends the current total immediately. On iPhone: add the admin site to your Home Screen first, launch the installed app, then enable notifications here.</p>
      </section>

      <section className="border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <Video size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">ImageKit Media</span>
            </div>
            <h2 className="text-xl font-semibold">Storefront backgrounds</h2>
          </div>
          <span className="w-fit border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase text-emerald-700">
            CDN delivery
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(["home", "shop", "cart", "header"] as MediaSlot[]).map((slot) => {
            const backgroundType = getBackgroundType(media, slot);
            const url = getBackgroundUrl(media, slot);
            return (
              <button
                key={slot}
                type="button"
                onClick={() => openMediaModal(slot)}
                className="group overflow-hidden border border-zinc-200 bg-black text-left transition hover:border-black"
              >
                <div className="relative aspect-video bg-zinc-950">
                  {backgroundType === "video" ? (
                    <video
                      src={getOriginalVideoUrl(url)}
                      muted
                      loop
                      playsInline
                      autoPlay={!mediaModalOpen}
                      preload="metadata"
                      className="h-full w-full object-cover opacity-75 transition group-hover:opacity-100"
                    />
                  ) : url ? (
                    <img
                      src={getBackgroundImageUrl(url)}
                      alt={`${slot} page background preview`}
                      className="h-full w-full object-cover opacity-75 transition group-hover:opacity-100"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/50">
                      <ImageIcon size={32} />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black via-black/70 to-transparent p-4 pt-10 text-white">
                    <div>
                      <p className="text-sm font-bold capitalize">{slot === "header" ? "Header" : `${slot} page`}</p>
                      <p className="mt-1 text-[9px] uppercase tracking-widest text-white/50">
                        {slot === "header" ? "transparent image" : backgroundType} · {url?.includes("ik.imagekit.io") ? "ImageKit active" : backgroundType === "video" ? "Local fallback" : "Upload an image"}
                      </p>
                    </div>
                    <UploadCloud size={18} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-zinc-500">
              <ImageIcon size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Homepage</span>
            </div>
            <h2 className="text-xl font-semibold">Hero carousel</h2>
            <p className="mt-1 text-sm text-zinc-500">Upload up to six images. They rotate automatically on the homepage in this order.</p>
          </div>
          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 bg-black px-5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-zinc-800">
            {uploadingCarousel ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
            {uploadingCarousel ? "Uploading" : "Add image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploadingCarousel || media.homeCarouselUrls.length >= 6}
              onChange={(event) => {
                handleCarouselUpload(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        {media.homeCarouselUrls.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {media.homeCarouselUrls.map((url, index) => (
              <div key={url} className="overflow-hidden border border-zinc-200 bg-zinc-50">
                <img src={getBackgroundImageUrl(url)} alt={`Carousel image ${index + 1}`} className="aspect-[4/3] w-full object-cover" />
                <div className="flex items-center justify-between gap-2 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Slide {index + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Move slide ${index + 1} earlier`}
                      disabled={index === 0}
                      onClick={() => setMedia((current) => {
                        const urls = [...current.homeCarouselUrls];
                        [urls[index - 1], urls[index]] = [urls[index], urls[index - 1]];
                        return { ...current, homeCarouselUrls: urls };
                      })}
                      className="h-8 w-8 border border-zinc-200 text-sm disabled:opacity-30"
                    >←</button>
                    <button
                      type="button"
                      aria-label={`Move slide ${index + 1} later`}
                      disabled={index === media.homeCarouselUrls.length - 1}
                      onClick={() => setMedia((current) => {
                        const urls = [...current.homeCarouselUrls];
                        [urls[index], urls[index + 1]] = [urls[index + 1], urls[index]];
                        return { ...current, homeCarouselUrls: urls };
                      })}
                      className="h-8 w-8 border border-zinc-200 text-sm disabled:opacity-30"
                    >→</button>
                    <button
                      type="button"
                      aria-label={`Remove slide ${index + 1}`}
                      onClick={() => setMedia((current) => ({ ...current, homeCarouselUrls: current.homeCarouselUrls.filter((_, itemIndex) => itemIndex !== index) }))}
                      className="h-8 w-8 border border-zinc-200 text-sm text-red-600"
                    >×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-36 items-center justify-center border border-dashed border-zinc-300 bg-zinc-50 px-5 text-center text-sm text-zinc-500">Add your first carousel image to replace the plain homepage background.</div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={saveCarousel}
            disabled={savingMedia || uploadingCarousel}
            className="inline-flex h-11 items-center justify-center gap-2 bg-black px-5 text-[10px] font-bold uppercase tracking-widest text-white transition hover:bg-zinc-800 disabled:opacity-40"
          >
            {savingMedia ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save carousel
          </button>
        </div>
      </section>

      {/* MAIN CARD */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 md:p-10 space-y-10 shadow-sm">

        {/* TOGGLE */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isLocked ? "bg-red-100" : "bg-green-100"
              }`}
            >
              {isLocked ? (
                <Lock size={18} />
              ) : (
                <Unlock size={18} />
              )}
            </div>

            <div>
              <h2 className="font-semibold">Site Visibility</h2>
              <p className="text-xs text-zinc-400">
                Toggle public access
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLockToggle}
            disabled={lockSaving}
            aria-label={isLocked ? "Make storefront live" : "Lock storefront"}
            aria-pressed={isLocked}
            className={`w-14 h-7 rounded-full transition ${
              isLocked ? "bg-red-500" : "bg-zinc-200"
            } disabled:cursor-wait disabled:opacity-60`}
          >
            {lockSaving ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-zinc-600" />
            ) : (
              <motion.div
                animate={{ x: isLocked ? 28 : 4 }}
                className="w-5 h-5 bg-white rounded-full shadow"
              />
            )}
          </button>
        </div>

        {/* SETTINGS GRID */}
        <div className="grid md:grid-cols-2 gap-8">

          {/* SCHEDULE */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-500">
              <Clock size={14} />
              <label className="text-xs uppercase tracking-widest">
                Scheduled Unlock
              </label>
            </div>

            <input
              type="datetime-local"
              value={unlockAt}
              onChange={(e) => setUnlockAt(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-white shadow-sm focus:ring-2 focus:ring-black/10 outline-none"
            />

            <p className="text-xs text-zinc-400">
              Optional auto-unlock time.
            </p>
          </div>

          {/* PASSWORD */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-500">
              <Shield size={14} />
              <label className="text-xs uppercase tracking-widest">
                Bypass Code
              </label>
            </div>

            <input
              value={lockPassword}
              onChange={(e) => setLockPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-white shadow-sm focus:ring-2 focus:ring-black/10 outline-none"
            />

            <p className="text-xs text-zinc-400">
              Admin unlock password
            </p>
          </div>
        </div>

        {/* SAVE BUTTON */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-14 rounded-xl bg-black text-white font-medium flex items-center justify-center gap-3 hover:bg-zinc-900 transition disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Saving..." : "Update Settings"}
          </button>

          <p className="text-xs text-center text-zinc-400 mt-2">
            Changes apply instantly to live site configuration
          </p>
        </div>

        {/* CLEAR ADMIN AUTH BUTTON */}
        <div className="pt-6 border-t border-zinc-100">
          <button
            onClick={async () => {
              await fetch("/api/site-lock/unlock", { method: "DELETE" }).catch(() => null);
              await fetch("/api/admin/session", { method: "DELETE" }).catch(() => null);
              localStorage.removeItem("admin_auth");
              document.cookie = "admin_auth=; path=/; max-age=0";
              document.cookie = "admin_auth_timestamp=; path=/; max-age=0";
              toast.success("Admin authorization cleared! Now you can test site lock.");
            }}
            className="w-full h-12 rounded-xl border border-zinc-300 text-zinc-600 font-medium flex items-center justify-center gap-3 hover:bg-zinc-50 transition"
          >
            <Shield size={16} />
            Clear Admin Authorization (Test Site Lock)
          </button>
        </div>
      </div>

      {/* INFO CARD */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-3">
        <Info size={16} />
        <p className="text-xs text-zinc-600 leading-relaxed">
          When locked, users cannot access storefront pages. Admins remain
          unaffected and can bypass restrictions using the admin panel.
        </p>
      </div>

      {/* FOOTER */}
      <footer className="pt-8 border-t border-zinc-200 flex flex-col md:flex-row justify-between gap-3 text-xs text-zinc-400">
        <p>One Stop Shop Admin Panel</p>
        <p>System v1.0 • Secure Mode Enabled</p>
      </footer>

      <AnimatePresence>
        {mediaModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !uploadingMedia) {
                setMediaModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="max-h-[92vh] w-full max-w-3xl overflow-y-auto bg-white p-6 text-black shadow-2xl sm:p-8"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Storefront Media</p>
                  <h2 className="mt-1 text-2xl font-bold capitalize text-black">
                    {activeMediaSlot === "header" ? "Header" : `${activeMediaSlot} background`}
                  </h2>
                </div>
                <button
                  type="button"
                  title="Close"
                  onClick={() => setMediaModalOpen(false)}
                  disabled={uploadingMedia}
                  className="p-2 text-zinc-400 transition hover:text-black disabled:opacity-40"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="aspect-video overflow-hidden bg-black">
                {getBackgroundType(media, activeMediaSlot) === "video" ? (
                  <video
                    key={getBackgroundUrl(media, activeMediaSlot)}
                    src={getOriginalVideoUrl(getBackgroundUrl(media, activeMediaSlot))}
                    controls
                    muted
                    loop
                    playsInline
                    autoPlay
                    className="h-full w-full object-cover"
                  />
                ) : getBackgroundUrl(media, activeMediaSlot) ? (
                  <img
                    src={getBackgroundImageUrl(getBackgroundUrl(media, activeMediaSlot))}
                    alt={`${activeMediaSlot} background preview`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-white/50">Upload an image to preview it here</div>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <div className={`grid border border-zinc-200 p-1 ${activeMediaSlot === "cart" || activeMediaSlot === "header" ? "grid-cols-1" : "grid-cols-2"}`}>
                  {(activeMediaSlot === "cart" || activeMediaSlot === "header" ? ["image"] as BackgroundType[] : ["video", "image"] as BackgroundType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setMedia((current) => activeMediaSlot === "home"
                          ? { ...current, homeBackgroundType: type }
                          : activeMediaSlot === "shop"
                            ? { ...current, shopBackgroundType: type }
                            : current
                        )
                      }
                      disabled={uploadingMedia}
                      className={`flex h-11 items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest transition ${
                        getBackgroundType(media, activeMediaSlot) === type
                          ? "bg-black text-white"
                          : "text-zinc-500 hover:text-black"
                      }`}
                    >
                      {type === "video" ? <Video size={15} /> : <ImageIcon size={15} />}
                      {type}
                    </button>
                  ))}
                </div>
                <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center border border-dashed border-zinc-300 bg-zinc-50 px-5 py-6 text-center transition hover:border-black hover:bg-white">
                  <input
                    type="file"
                    accept={getBackgroundType(media, activeMediaSlot) === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp"}
                    className="hidden"
                    disabled={uploadingMedia}
                    onChange={(event) => {
                      handleMediaUpload(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                  {uploadingMedia ? (
                    <Loader2 className="mb-3 animate-spin" size={24} />
                  ) : (
                    <UploadCloud className="mb-3" size={24} />
                  )}
                  <span className="text-sm font-semibold">
                    {uploadingMedia ? `Uploading ${uploadProgress}%` : `Choose ${getBackgroundType(media, activeMediaSlot) === "video" ? "replacement video" : "background image"}`}
                  </span>
                  <span className="mt-1 text-xs text-zinc-400">
                    {getBackgroundType(media, activeMediaSlot) === "video"
                      ? "MP4, WebM, or MOV"
                      : "JPG, PNG, or WebP · oversized images are optimized before upload"}
                  </span>
                  {uploadingMedia && (
                    <span className="mt-4 h-1 w-full max-w-sm overflow-hidden bg-zinc-200">
                      <span
                        className="block h-full bg-black transition-[width]"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </span>
                  )}
                </label>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    ImageKit URL
                  </label>
                  <input
                    value={getBackgroundUrl(media, activeMediaSlot)}
                    onChange={(event) =>
                      setMedia((current) => {
                        const type = getBackgroundType(current, activeMediaSlot);
                        if (activeMediaSlot === "cart") return { ...current, cartImageUrl: event.target.value };
                        if (activeMediaSlot === "header") return { ...current, headerImageUrl: event.target.value };
                        if (activeMediaSlot === "home") {
                          return type === "video"
                            ? { ...current, homeVideoUrl: event.target.value }
                            : { ...current, homeImageUrl: event.target.value };
                        }
                        return type === "video"
                          ? { ...current, shopVideoUrl: event.target.value }
                          : { ...current, shopImageUrl: event.target.value };
                      })
                    }
                    className="h-12 w-full border border-zinc-200 px-4 text-sm outline-none focus:border-black"
                    placeholder="/placeholder.svg"
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setMediaModalOpen(false)}
                  disabled={uploadingMedia || savingMedia}
                  className="h-12 border border-zinc-300 px-6 text-xs font-bold uppercase tracking-widest disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMediaSave}
                  disabled={uploadingMedia || savingMedia}
                  className="flex h-12 items-center justify-center gap-2 bg-black px-7 text-xs font-bold uppercase tracking-widest text-white disabled:opacity-40"
                >
                  {savingMedia ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {savingMedia ? "Saving" : `Use this ${getBackgroundType(media, activeMediaSlot)}`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
