import { useCallback, useEffect, useRef, useState } from "react";
import type { MarkerIconDefinition, MarkerItem } from "@/features/markers/domain/types";
import type { MapInstanceRef } from "@/features/map/domain/types";
import { MAP_OVERZOOM_SCALE } from "@/features/map/infrastructure/constants";
import { findMarkerIcon } from "@/features/markers/infrastructure/iconRegistry";
import MarkerVisual from "./MarkerVisual";

interface MarkerOverlayProps {
  markers: MarkerItem[];
  customIcons: MarkerIconDefinition[];
  mapRef: MapInstanceRef;
  isMarkerEditMode?: boolean;
  onMarkerPositionChange?: (markerId: string, lat: number, lon: number) => void;
}

export default function MarkerOverlay({
  markers,
  customIcons,
  mapRef,
  isMarkerEditMode = false,
  onMarkerPositionChange,
}: MarkerOverlayProps) {
  const [, setRenderTick] = useState(0);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const map = mapRef.current;
  const projectedMarkers = map
    ? markers.flatMap((marker) => {
        const icon = findMarkerIcon(marker.iconId, customIcons);
        if (!icon) {
          return [];
        }

        try {
          const point = map.project([marker.lon, marker.lat]);
          return [
            {
              marker,
              icon,
              x: point.x / MAP_OVERZOOM_SCALE,
              y: point.y / MAP_OVERZOOM_SCALE,
            },
          ];
        } catch {
          return [];
        }
      })
    : [];

  const updateMarkerByClientPoint = useCallback(
    (markerId: string, clientX: number, clientY: number) => {
      if (!isMarkerEditMode || !onMarkerPositionChange) {
        return;
      }

      const map = mapRef.current;
      const overlay = overlayRef.current;
      if (!map || !overlay) {
        return;
      }

      const bounds = overlay.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) {
        return;
      }

      const x = Math.max(0, Math.min(bounds.width, clientX - bounds.left));
      const y = Math.max(0, Math.min(bounds.height, clientY - bounds.top));

      try {
        const mapPointX = x * MAP_OVERZOOM_SCALE;
        const mapPointY = y * MAP_OVERZOOM_SCALE;
        const position = map.unproject([mapPointX, mapPointY]);
        onMarkerPositionChange(markerId, position.lat, position.lng);
      } catch {
        // Ignore projection failures during drag.
      }
    },
    [isMarkerEditMode, mapRef, onMarkerPositionChange],
  );

  const handleMarkerPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, markerId: string) => {
      if (!isMarkerEditMode || !onMarkerPositionChange) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      setDraggingMarkerId(markerId);
      updateMarkerByClientPoint(markerId, event.clientX, event.clientY);
    },
    [isMarkerEditMode, onMarkerPositionChange, updateMarkerByClientPoint],
  );

  useEffect(() => {
    if (!draggingMarkerId || !isMarkerEditMode || !onMarkerPositionChange) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      updateMarkerByClientPoint(draggingMarkerId, event.clientX, event.clientY);
    };

    const stopDrag = () => {
      setDraggingMarkerId(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };
  }, [
    draggingMarkerId,
    isMarkerEditMode,
    onMarkerPositionChange,
    updateMarkerByClientPoint,
  ]);

  useEffect(() => {
    if (!isMarkerEditMode && draggingMarkerId) {
      setDraggingMarkerId(null);
    }
  }, [isMarkerEditMode, draggingMarkerId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const sync = () => {
      setRenderTick((value) => value + 1);
    };

    map.on("move", sync);
    map.on("moveend", sync);
    map.on("rotate", sync);
    map.on("resize", sync);
    map.on("load", sync);

    return () => {
      map.off("move", sync);
      map.off("moveend", sync);
      map.off("rotate", sync);
      map.off("resize", sync);
      map.off("load", sync);
    };
  }, [mapRef]);

  if (projectedMarkers.length === 0) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className={`poster-marker-overlay${isMarkerEditMode ? " is-edit-mode" : ""}`}
      aria-hidden={!isMarkerEditMode ? "true" : undefined}
    >
      {projectedMarkers.map(({ marker, icon, x, y }) => (
        <div
          key={marker.id}
          className={`poster-marker${isMarkerEditMode ? " is-draggable" : ""}${
            draggingMarkerId === marker.id ? " is-dragging" : ""
          }`}
          style={{ left: `${x}px`, top: `${y}px` }}
          onPointerDown={(event) => handleMarkerPointerDown(event, marker.id)}
        >
          <MarkerVisual icon={icon} size={marker.size} color={marker.color} />
        </div>
      ))}
    </div>
  );
}
