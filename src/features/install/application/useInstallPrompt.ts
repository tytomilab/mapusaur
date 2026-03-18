import { useEffect, useState } from "react";
import {
  BeforeInstallPromptEvent,
  INSTALL_DISMISS_KEY,
  WEEK_MS,
} from "../domain/types";

declare global {
  interface Window {
    __terrainkDeferredInstallPrompt?: Event;
  }
}

function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroid(): boolean {
  return /android/i.test(navigator.userAgent);
}

function isInStandaloneMode(): boolean {
  return (
    ("standalone" in window.navigator
      ? (window.navigator as { standalone?: boolean }).standalone === true
      : false) || window.matchMedia("(display-mode: standalone)").matches
  );
}

export default function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [showAndroidHint, setShowAndroidHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;

    const dismissedTs = localStorage.getItem(INSTALL_DISMISS_KEY);
    if (dismissedTs && Date.now() - Number(dismissedTs) < WEEK_MS) {
      setDismissed(true);
      return;
    }

    if (isIos()) {
      setShowIosHint(true);
      return;
    }

    if (window.__terrainkDeferredInstallPrompt) {
      setDeferredPrompt(
        window.__terrainkDeferredInstallPrompt as BeforeInstallPromptEvent,
      );
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidHint(false);
      window.__terrainkDeferredInstallPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", handler);

    const fallbackTimer = window.setTimeout(() => {
      if (isAndroid() && !window.__terrainkDeferredInstallPrompt) {
        setShowAndroidHint(true);
      }
    }, 4000);

    const installedHandler = () => {
      setDeferredPrompt(null);
      setShowAndroidHint(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    setDismissed(true);
    setShowIosHint(false);
    setShowAndroidHint(false);
    setDeferredPrompt(null);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowAndroidHint(false);
      } else {
        setShowAndroidHint(true);
      }
    } catch {
      setShowAndroidHint(true);
    }
  }

  return {
    deferredPrompt,
    showIosHint,
    showAndroidHint,
    dismissed,
    dismiss,
    handleInstall,
  } as const;
}
