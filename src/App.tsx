import { useState } from "react";
import { AppProviders } from "@/core/AppProviders";
import GeneralHeader from "@/shared/ui/GeneralHeader";
import DesktopNavBar from "@/shared/ui/DesktopNavBar";
import AboutModal from "@/shared/ui/AboutModal";
import FooterNote from "@/shared/ui/FooterNote";
import SettingsPanel from "@/features/poster/ui/SettingsPanel";
import PreviewPanel from "@/features/poster/ui/PreviewPanel";
import AnnouncementModal from "@/features/updates/ui/AnnouncementModal";
import MobileNavBar, { type MobileTab } from "@/shared/ui/MobileNavBar";
import DesktopExportFab from "@/features/export/ui/DesktopExportFab";
import MobileExportFab from "@/features/export/ui/MobileExportFab";
import DesktopLocationBar from "@/shared/ui/DesktopLocationBar";
import StartupLocationModal from "@/features/location/ui/StartupLocationModal";
import InstallPrompt from "@/features/install/ui/InstallPrompt";
import { useSwipeDown } from "@/shared/hooks/useSwipeDown";

function SettingsDrawer({
  mobileTab,
  onClose,
}: {
  mobileTab: MobileTab;
  onClose: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { sheetRef, handleRef, handleProps } = useSwipeDown(onClose, 80, {
    onExpand: () => setIsExpanded(true),
  });

  return (
    <div className="mobile-drawer" role="dialog" aria-label="Settings">
      <div
        className="mobile-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`mobile-drawer-sheet${isExpanded ? " is-expanded" : ""}`}
        ref={sheetRef}
        data-mobile-tab={mobileTab}
      >
        <div
          className="mobile-drawer-handle"
          ref={handleRef}
          aria-hidden="true"
          {...handleProps}
        />
        <div className="mobile-drawer-content">
          <SettingsPanel />
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  // Mobile state
  const [mobileTab, setMobileTab] = useState<MobileTab>("theme");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileLocationRowVisible, setMobileLocationRowVisible] =
    useState(true);

  // Desktop state
  const [desktopTab, setDesktopTab] = useState<MobileTab>("theme");
  const [desktopPanelOpen, setDesktopPanelOpen] = useState(false);
  const [desktopLocationRowVisible, setDesktopLocationRowVisible] =
    useState(true);
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleMobileTabChange = (tab: MobileTab) => {
    if (tab === "location") {
      setMobileLocationRowVisible((isVisible) => !isVisible);
      setMobileDrawerOpen(false);
      return;
    }

    if (tab === mobileTab && mobileDrawerOpen) {
      setMobileDrawerOpen(false);
    } else {
      setMobileTab(tab);
      setMobileDrawerOpen(true);
    }
  };

  const handleDesktopTabChange = (tab: MobileTab) => {
    if (tab === desktopTab && desktopPanelOpen) {
      setDesktopPanelOpen(false);
    } else {
      setDesktopTab(tab);
      setDesktopPanelOpen(true);
    }
  };

  return (
    <div
      className="app-shell"
      data-mobile-tab={mobileTab}
      data-desktop-tab={desktopTab}
    >
      <GeneralHeader onAboutOpen={() => setAboutOpen(true)} />
      <InstallPrompt />
      <StartupLocationModal />

      <DesktopNavBar
        activeTab={desktopTab}
        panelOpen={desktopPanelOpen}
        onTabChange={handleDesktopTabChange}
        isLocationVisible={desktopLocationRowVisible}
        onLocationToggle={() =>
          setDesktopLocationRowVisible((isVisible) => !isVisible)
        }
      />

      <div
        className={`desktop-location-row-wrap${desktopLocationRowVisible ? "" : " is-hidden"}`}
      >
        <DesktopLocationBar />
      </div>

      <div
        className={`mobile-location-row-wrap${mobileLocationRowVisible ? "" : " is-hidden"}`}
      >
        <DesktopLocationBar />
      </div>

      <div className="desktop-left-panel">
        <div
          className={`desktop-settings-slide${desktopPanelOpen ? " is-open" : ""}`}
        >
          <SettingsPanel />
        </div>
      </div>

      <PreviewPanel />

      {mobileDrawerOpen ? (
        <SettingsDrawer
          mobileTab={mobileTab}
          onClose={() => setMobileDrawerOpen(false)}
        />
      ) : null}

      <MobileNavBar
        activeTab={mobileTab}
        drawerOpen={mobileDrawerOpen}
        isLocationVisible={mobileLocationRowVisible}
        onTabChange={handleMobileTabChange}
      />
      <MobileExportFab />

      <FooterNote />
      <AnnouncementModal />

      <DesktopExportFab />
      {aboutOpen ? <AboutModal onClose={() => setAboutOpen(false)} /> : null}
    </div>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}
