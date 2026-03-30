import { useEffect, useRef, type CSSProperties } from "react";
import maplibregl from "maplibre-gl";
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapInstanceRef } from "@/features/map/domain/types";
import {
  MAP_CENTER_SYNC_EPSILON,
  MAP_ZOOM_SYNC_EPSILON,
} from "@/features/map/infrastructure";

const GPX_ROUTE_SOURCE_ID = "uploaded-gpx-route";
const GPX_ROUTE_CASING_LAYER_ID = "uploaded-gpx-route-casing";
const GPX_ROUTE_LAYER_ID = "uploaded-gpx-route-line";
const GPX_ROUTE_ENDPOINTS_SOURCE_ID = "uploaded-gpx-route-endpoints";
const GPX_ROUTE_START_LAYER_ID = "uploaded-gpx-route-start";
const GPX_ROUTE_FINISH_LAYER_ID = "uploaded-gpx-route-finish";
const GPX_MUTED_LAYER_PREFIXES = [
  "road",
  "transportation",
  "street",
  "path",
  "highway",
  "rail",
  "bridge",
  "tunnel",
  "waterway",
  "place",
  "poi",
  "label",
  "boundary",
  "building",
];
const GPX_MUTED_TEXT_KEYS = ["text-color", "text-halo-color", "text-opacity"];
const GPX_MUTED_LINE_KEYS = ["line-color", "line-opacity", "line-width"];
const GPX_MUTED_FILL_KEYS = ["fill-color", "fill-opacity", "fill-outline-color"];
const GPX_MUTED_CIRCLE_KEYS = ["circle-color", "circle-opacity", "circle-radius"];

function shouldMuteLayer(layerId: string): boolean {
  const id = layerId.toLowerCase();
  return GPX_MUTED_LAYER_PREFIXES.some((prefix) => id.includes(prefix));
}

function applyGpxBasemapMute(map: maplibregl.Map, style: StyleSpecification): void {
  for (const layer of style.layers) {
    const layerId = layer.id;
    if (!shouldMuteLayer(layerId)) {
      continue;
    }

    if (layer.type === "symbol") {
      for (const key of GPX_MUTED_TEXT_KEYS) {
        if (key === "text-color") {
          map.setPaintProperty(layerId, key, "#d8d8de");
        } else if (key === "text-halo-color") {
          map.setPaintProperty(layerId, key, "#f5f5f7");
        } else if (key === "text-opacity") {
          map.setPaintProperty(layerId, key, 0.18);
        }
      }
      continue;
    }

    if (layer.type === "line") {
      for (const key of GPX_MUTED_LINE_KEYS) {
        if (key === "line-color") {
          map.setPaintProperty(layerId, key, "#d6d6dc");
        } else if (key === "line-opacity") {
          map.setPaintProperty(layerId, key, 0.22);
        } else if (key === "line-width") {
          map.setPaintProperty(layerId, key, 0.8);
        }
      }
      continue;
    }

    if (layer.type === "fill") {
      for (const key of GPX_MUTED_FILL_KEYS) {
        if (key === "fill-color") {
          map.setPaintProperty(layerId, key, "#ececf1");
        } else if (key === "fill-opacity") {
          map.setPaintProperty(layerId, key, 0.35);
        } else if (key === "fill-outline-color") {
          map.setPaintProperty(layerId, key, "#e2e2e8");
        }
      }
      continue;
    }

    if (layer.type === "circle") {
      for (const key of GPX_MUTED_CIRCLE_KEYS) {
        if (key === "circle-color") {
          map.setPaintProperty(layerId, key, "#d8d8de");
        } else if (key === "circle-opacity") {
          map.setPaintProperty(layerId, key, 0.2);
        } else if (key === "circle-radius") {
          map.setPaintProperty(layerId, key, 1.5);
        }
      }
    }
  }
}

/**
 * Apply style changes incrementally via setPaintProperty / setLayoutProperty
 * instead of calling setStyle() which triggers a full style diff.
 */
function applyIncrementalStyleUpdate(
  map: maplibregl.Map,
  prev: StyleSpecification,
  next: StyleSpecification,
): void {
  const prevLayerMap = new Map(
    prev.layers.map((l) => [l.id, l] as [string, LayerSpecification]),
  );

  for (const layer of next.layers) {
    const prevLayer = prevLayerMap.get(layer.id);
    if (!prevLayer) continue;

    // Diff paint properties
    const nextPaint = (layer as Record<string, unknown>).paint as
      | Record<string, unknown>
      | undefined;
    const prevPaint = (prevLayer as Record<string, unknown>).paint as
      | Record<string, unknown>
      | undefined;
    if (nextPaint) {
      for (const key of Object.keys(nextPaint)) {
        if (JSON.stringify(nextPaint[key]) !== JSON.stringify(prevPaint?.[key])) {
          map.setPaintProperty(layer.id, key, nextPaint[key]);
        }
      }
    }

    // Diff layout properties
    const nextLayout = (layer as Record<string, unknown>).layout as
      | Record<string, unknown>
      | undefined;
    const prevLayout = (prevLayer as Record<string, unknown>).layout as
      | Record<string, unknown>
      | undefined;
    if (nextLayout) {
      for (const key of Object.keys(nextLayout)) {
        if (
          JSON.stringify(nextLayout[key]) !== JSON.stringify(prevLayout?.[key])
        ) {
          map.setLayoutProperty(layer.id, key, nextLayout[key]);
        }
      }
    }

    // Diff minzoom / maxzoom
    const nextAny = layer as Record<string, unknown>;
    const prevAny = prevLayer as Record<string, unknown>;
    if (nextAny.minzoom !== prevAny.minzoom || nextAny.maxzoom !== prevAny.maxzoom) {
      map.setLayerZoomRange(
        layer.id,
        (nextAny.minzoom as number) ?? 0,
        (nextAny.maxzoom as number) ?? 24,
      );
    }
  }
}

interface MapPreviewProps {
  style: StyleSpecification;
  center: [lon: number, lat: number];
  zoom: number;
  mapRef: MapInstanceRef;
  posterMode: "location" | "gpxRoute";
  gpxRouteCoordinates?: [lon: number, lat: number][];
  interactive?: boolean;
  allowRotation?: boolean;
  minZoom?: number;
  maxZoom?: number;
  onMoveEnd?: (center: [number, number], zoom: number) => void;
  onMove?: (center: [number, number], zoom: number) => void;
  containerStyle?: CSSProperties;
  overzoomScale?: number;
}

/**
 * MapLibre preview wrapper.
 *
 * - Keeps `preserveDrawingBuffer` enabled for export snapshots.
 * - Syncs controlled style/center/zoom from form state.
 * - Exposes full map instance via a shared ref for export/controls.
 */
export default function MapPreview({
  style,
  center,
  zoom,
  mapRef,
  posterMode,
  gpxRouteCoordinates = [],
  interactive = false,
  allowRotation = false,
  minZoom,
  maxZoom,
  onMoveEnd,
  onMove,
  containerStyle,
  overzoomScale = 1,
}: MapPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isSyncing = useRef(false);
  const hasMountedStyleRef = useRef(false);
  const prevStyleRef = useRef<StyleSpecification | null>(null);
  const lastFittedRouteRef = useRef<string | null>(null);
  const onMoveEndRef = useRef(onMoveEnd);
  const onMoveRef = useRef(onMove);
  const isGpxRouteMode = posterMode === "gpxRoute";
  onMoveEndRef.current = onMoveEnd;
  onMoveRef.current = onMove;

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center,
      zoom,
      interactive: false,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });

    mapRef.current = map;

    map.on("moveend", () => {
      if (isSyncing.current) return;
      const currentCenter = map.getCenter();
      onMoveEndRef.current?.([currentCenter.lng, currentCenter.lat], map.getZoom());
    });
    map.on("move", () => {
      if (isSyncing.current) return;
      const currentCenter = map.getCenter();
      onMoveRef.current?.([currentCenter.lng, currentCenter.lat], map.getZoom());
    });

    return () => {
      mapRef.current = null;
      map.remove();
    };
    // Mount once; follow-up updates are handled by effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (interactive) {
      map.scrollZoom.enable();
      map.dragPan.enable();
      map.touchZoomRotate.enable();
      map.doubleClickZoom.enable();
      map.keyboard.enable();
      if (allowRotation) {
        map.dragRotate.enable();
        map.touchZoomRotate.enableRotation();
      } else {
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();
      }
    } else {
      map.scrollZoom.disable();
      map.dragPan.disable();
      map.touchZoomRotate.disable();
      map.doubleClickZoom.disable();
      map.keyboard.disable();
      map.touchZoomRotate.disableRotation();
      map.dragRotate.disable();
    }
  }, [interactive, allowRotation, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (typeof minZoom === "number") {
      map.setMinZoom(minZoom);
    }
    if (typeof maxZoom === "number") {
      map.setMaxZoom(maxZoom);
    }
  }, [minZoom, maxZoom, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Initial style is already provided in map constructor — record it and skip.
    if (!hasMountedStyleRef.current) {
      hasMountedStyleRef.current = true;
      prevStyleRef.current = style;
      return;
    }

    // If the map hasn't finished loading the initial style yet, queue a full setStyle.
    if (!map.isStyleLoaded()) {
      const applyWhenReady = () => {
        map.setStyle(style);
        prevStyleRef.current = style;
      };
      map.once("load", applyWhenReady);
      return () => {
        map.off("load", applyWhenReady);
      };
    }

    // Fast path: apply only the changed paint/layout/zoom properties directly,
    // avoiding a full setStyle diff and any risk of source re-initialisation.
    if (
      prevStyleRef.current &&
      JSON.stringify(prevStyleRef.current.sources) ===
        JSON.stringify(style.sources)
    ) {
      applyIncrementalStyleUpdate(map, prevStyleRef.current, style);
    } else {
      map.setStyle(style);
    }

    prevStyleRef.current = style;
  }, [style, mapRef]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const syncBasemapAppearance = () => {
      if (!isGpxRouteMode) {
        if (prevStyleRef.current) {
          map.setStyle(prevStyleRef.current);
        }
        return;
      }

      if (!map.isStyleLoaded()) {
        return;
      }

      applyGpxBasemapMute(map, style);
    };

    if (!map.isStyleLoaded()) {
      map.once("load", syncBasemapAppearance);
      return () => {
        map.off("load", syncBasemapAppearance);
      };
    }

    syncBasemapAppearance();
  }, [isGpxRouteMode, mapRef, style]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const routeFeature = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: gpxRouteCoordinates,
      },
    };
    const endpointFeatures = gpxRouteCoordinates.length > 1
      ? [
          {
            type: "Feature" as const,
            properties: { role: "start" },
            geometry: {
              type: "Point" as const,
              coordinates: gpxRouteCoordinates[0],
            },
          },
          {
            type: "Feature" as const,
            properties: { role: "finish" },
            geometry: {
              type: "Point" as const,
              coordinates: gpxRouteCoordinates[gpxRouteCoordinates.length - 1],
            },
          },
        ]
      : [];

    const ensureRouteLayer = () => {
      if (!map.getSource(GPX_ROUTE_SOURCE_ID)) {
        map.addSource(GPX_ROUTE_SOURCE_ID, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [routeFeature],
          },
        });
      }

      if (!map.getLayer(GPX_ROUTE_CASING_LAYER_ID)) {
        map.addLayer({
          id: GPX_ROUTE_CASING_LAYER_ID,
          type: "line",
          source: GPX_ROUTE_SOURCE_ID,
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#fff4d6",
            "line-width": 12,
            "line-opacity": 0.96,
          },
        });
      }

      if (!map.getLayer(GPX_ROUTE_LAYER_ID)) {
        map.addLayer({
          id: GPX_ROUTE_LAYER_ID,
          type: "line",
          source: GPX_ROUTE_SOURCE_ID,
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "#ff5a36",
            "line-width": 6,
            "line-opacity": 1,
          },
        });
      }

      if (!map.getSource(GPX_ROUTE_ENDPOINTS_SOURCE_ID)) {
        map.addSource(GPX_ROUTE_ENDPOINTS_SOURCE_ID, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: endpointFeatures,
          },
        });
      }

      if (!map.getLayer(GPX_ROUTE_START_LAYER_ID)) {
        map.addLayer({
          id: GPX_ROUTE_START_LAYER_ID,
          type: "circle",
          source: GPX_ROUTE_ENDPOINTS_SOURCE_ID,
          filter: ["==", ["get", "role"], "start"],
          paint: {
            "circle-radius": 7,
            "circle-color": "#22c55e",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 3,
          },
        });
      }

      if (!map.getLayer(GPX_ROUTE_FINISH_LAYER_ID)) {
        map.addLayer({
          id: GPX_ROUTE_FINISH_LAYER_ID,
          type: "circle",
          source: GPX_ROUTE_ENDPOINTS_SOURCE_ID,
          filter: ["==", ["get", "role"], "finish"],
          paint: {
            "circle-radius": 9,
            "circle-color": "#111111",
            "circle-stroke-color": "#ff5a36",
            "circle-stroke-width": 4,
          },
        });
      }
    };

    const clearRouteLayer = () => {
      if (map.getLayer(GPX_ROUTE_FINISH_LAYER_ID)) {
        map.removeLayer(GPX_ROUTE_FINISH_LAYER_ID);
      }
      if (map.getLayer(GPX_ROUTE_START_LAYER_ID)) {
        map.removeLayer(GPX_ROUTE_START_LAYER_ID);
      }
      if (map.getLayer(GPX_ROUTE_LAYER_ID)) {
        map.removeLayer(GPX_ROUTE_LAYER_ID);
      }
      if (map.getLayer(GPX_ROUTE_CASING_LAYER_ID)) {
        map.removeLayer(GPX_ROUTE_CASING_LAYER_ID);
      }
      if (map.getSource(GPX_ROUTE_ENDPOINTS_SOURCE_ID)) {
        map.removeSource(GPX_ROUTE_ENDPOINTS_SOURCE_ID);
      }
      if (map.getSource(GPX_ROUTE_SOURCE_ID)) {
        map.removeSource(GPX_ROUTE_SOURCE_ID);
      }
      lastFittedRouteRef.current = null;
    };

    const syncRoute = () => {
      if (!isGpxRouteMode || gpxRouteCoordinates.length < 2) {
        clearRouteLayer();
        return;
      }

      ensureRouteLayer();

      const source = map.getSource(GPX_ROUTE_SOURCE_ID) as maplibregl.GeoJSONSource;
      source.setData({
        type: "FeatureCollection",
        features: [routeFeature],
      });
      const endpointsSource = map.getSource(
        GPX_ROUTE_ENDPOINTS_SOURCE_ID,
      ) as maplibregl.GeoJSONSource;
      endpointsSource.setData({
        type: "FeatureCollection",
        features: endpointFeatures,
      });

      const routeSignature = JSON.stringify(gpxRouteCoordinates);
      if (lastFittedRouteRef.current === routeSignature) {
        return;
      }

      const bounds = gpxRouteCoordinates.reduce(
        (acc, [lon, lat]) => acc.extend([lon, lat]),
        new maplibregl.LngLatBounds(gpxRouteCoordinates[0], gpxRouteCoordinates[0]),
      );

      lastFittedRouteRef.current = routeSignature;
      map.fitBounds(bounds, {
        padding: {
          top: 104,
          right: 28,
          bottom: 44,
          left: 28,
        },
        duration: 800,
        maxZoom: 15.5,
      });
    };

    if (!map.isStyleLoaded()) {
      map.once("load", syncRoute);
      return () => {
        map.off("load", syncRoute);
      };
    }

    syncRoute();
  }, [gpxRouteCoordinates, isGpxRouteMode, mapRef, style]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentCenter = map.getCenter();
    const centerDelta = Math.max(
      Math.abs(currentCenter.lng - center[0]),
      Math.abs(currentCenter.lat - center[1]),
    );
    const zoomDelta = Math.abs(map.getZoom() - zoom);

    if (
      centerDelta < MAP_CENTER_SYNC_EPSILON &&
      zoomDelta < MAP_ZOOM_SYNC_EPSILON
    ) {
      return;
    }

    isSyncing.current = true;
    map.jumpTo({ center, zoom });
    requestAnimationFrame(() => {
      isSyncing.current = false;
    });
  }, [center, zoom, mapRef]);

  const normalizedOverzoomScale = Math.max(1, overzoomScale);
  const innerStyle: CSSProperties =
    normalizedOverzoomScale === 1
      ? { width: "100%", height: "100%" }
      : {
          width: `${normalizedOverzoomScale * 100}%`,
          height: `${normalizedOverzoomScale * 100}%`,
          transform: `scale(${1 / normalizedOverzoomScale})`,
          transformOrigin: "top left",
        };

  return (
    <div className="map-container" style={{ ...containerStyle, overflow: "hidden" }}>
      <div ref={containerRef} style={innerStyle} />
    </div>
  );
}
