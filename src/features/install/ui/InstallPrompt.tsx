import useInstallPrompt from "../application/useInstallPrompt";
import { FaMobileAlt as MobileIcon } from "react-icons/fa";
import {
  FiShare as ShareIcon,
  FiPlusSquare as AddToHomeIcon,
  FiX as CloseIcon,
} from "react-icons/fi";
import { createPortal } from "react-dom";
import React, { useState } from "react";

interface InstallPromptProps {
  variant?: "banner" | "header";
}

export default function InstallPrompt({
  variant = "banner",
}: InstallPromptProps) {
  const { deferredPrompt, showIosHint, dismissed, dismiss, handleInstall } =
    useInstallPrompt();
  const [hintOpen, setHintOpen] = useState(false);

  if (variant === "header") {
    const handleHeaderInstall = async () => {
      if (deferredPrompt) {
        setHintOpen(false);
        await handleInstall();
        return;
      }
      setHintOpen((prev) => !prev);
    };

    return (
      <div className="install-header-wrap">
        <button
          type="button"
          className="general-header-text-btn install-header-text-btn"
          onClick={() => void handleHeaderInstall()}
          aria-label="Install app"
          title="Install app"
          aria-expanded={hintOpen}
        >
          <span className="general-header-btn-label">Install</span>
          <span className="general-header-btn-icon" aria-hidden="true">
            <MobileIcon />
          </span>
        </button>
        {hintOpen
          ? createPortal(
              <div
                className="install-help-modal-backdrop"
                role="presentation"
                onClick={() => setHintOpen(false)}
              >
                <div
                  className="install-help-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Install help"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="install-help-modal-close"
                    onClick={() => setHintOpen(false)}
                    aria-label="Close install help"
                  >
                    <CloseIcon />
                  </button>
                  <h3 className="install-help-modal-title">Install TerraInk</h3>
                  {showIosHint ? (
                    <ol className="install-help-steps">
                      <li>
                        <span
                          className="install-help-step-icon"
                          aria-hidden="true"
                        >
                          <ShareIcon />
                        </span>
                        <span>
                          Tap <span className="install-help-emphasis">Share</span> in
                          your browser.
                        </span>
                      </li>
                      <li>
                        <span
                          className="install-help-step-icon"
                          aria-hidden="true"
                        >
                          <AddToHomeIcon />
                        </span>
                        <span>
                          Then choose{" "}
                          <span className="install-help-emphasis">
                            Add to Home Screen
                          </span>
                          .
                        </span>
                      </li>
                    </ol>
                  ) : (
                    <p className="install-help-modal-text">
                      Install is not available right now in this browser
                      session.
                    </p>
                  )}
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
    );
  }

  if (dismissed) return null;

  if (deferredPrompt) {
    return (
      <div className="install-prompt" role="complementary">
        <span className="install-prompt-text">
          <MobileIcon
            className="install-prompt-mobile-icon"
            aria-hidden="true"
          />
          Add TerraInk to your home screen for quick access
        </span>
        <div className="install-prompt-actions">
          <button
            type="button"
            className="install-prompt-btn"
            onClick={handleInstall}
          >
            Add to Home Screen
          </button>
          <button
            type="button"
            className="install-prompt-dismiss"
            onClick={dismiss}
          >
            Maybe later
          </button>
        </div>
      </div>
    );
  }

  if (showIosHint) {
    return (
      <div className="install-prompt" role="complementary">
        <span className="install-prompt-text">
          <MobileIcon
            className="install-prompt-mobile-icon"
            aria-hidden="true"
          />
          Tap{" "}
          <span className="install-prompt-share-icon" aria-hidden="true">
            <ShareIcon />
          </span>{" "}
          <span className="install-help-emphasis">Share</span>, then{" "}
          <span className="install-help-emphasis">Add to Home Screen</span> to
          install TerraInk for quick access.
        </span>
        <button
          type="button"
          className="install-prompt-dismiss"
          onClick={dismiss}
        >
          Maybe later
        </button>
      </div>
    );
  }

  return null;
}
