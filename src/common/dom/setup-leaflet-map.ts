import type { Map, TileLayer } from "leaflet";

// Sets up a Leaflet map on the provided DOM element
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type LeafletModuleType = typeof import("leaflet");
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
export type LeafletDrawModuleType = typeof import("leaflet-draw");

export interface WMSOptions {
  layers: string;
  format?: string;
  transparent?: boolean;
  version?: string;
  // EPSG identifier, e.g. "EPSG:3857". Resolved client-side to L.CRS.*.
  crs?: string;
  uppercase?: boolean;
}

interface CommonLayerOptions {
  url: string;
  attribution?: string;
  maxZoom?: number;
}

export interface XYZLayerOptions extends CommonLayerOptions {
  type?: "xyz";
}

export interface WMSLayerOptions extends CommonLayerOptions {
  type: "wms";
  wms: WMSOptions;
}

export type BaseLayerOptions = XYZLayerOptions | WMSLayerOptions;

export type OverlayLayerOptions = BaseLayerOptions & { opacity?: number };

export interface MapTileLayerConfig {
  base: BaseLayerOptions;
  overlays?: OverlayLayerOptions[];
}

declare global {
  interface Window {
    __HA_MAP_TILE_LAYER__?: MapTileLayerConfig;
  }
}

export interface LeafletMapHandles {
  map: Map;
  Leaflet: LeafletModuleType;
  baseLayer: TileLayer;
  overlays: TileLayer[];
}

export const setupLeafletMap = async (
  mapElement: HTMLElement,
  initialView?: { latitude: number; longitude: number; zoom?: number },
  baseLayerOptions?: BaseLayerOptions,
  overlayOptions?: OverlayLayerOptions[]
): Promise<LeafletMapHandles> => {
  if (!mapElement.parentNode) {
    throw new Error("Cannot setup Leaflet map on disconnected element");
  }
  // eslint-disable-next-line
  const Leaflet = (await import("leaflet")).default as LeafletModuleType;
  Leaflet.Icon.Default.imagePath = "/static/images/leaflet/images/";

  await import("leaflet.markercluster");

  const map = Leaflet.map(mapElement);
  const style = document.createElement("link");
  style.setAttribute("href", "/static/images/leaflet/leaflet.css");
  style.setAttribute("rel", "stylesheet");
  mapElement.parentNode.appendChild(style);

  const markerClusterStyle = document.createElement("link");
  markerClusterStyle.setAttribute(
    "href",
    "/static/images/leaflet/MarkerCluster.css"
  );
  markerClusterStyle.setAttribute("rel", "stylesheet");
  mapElement.parentNode.appendChild(markerClusterStyle);

  if (initialView) {
    map.setView(
      [initialView.latitude, initialView.longitude],
      initialView.zoom ?? 13
    );
  }

  const baseLayer = createBaseLayer(Leaflet, baseLayerOptions, "base").addTo(
    map
  );
  const overlays = createOverlayLayers(Leaflet, overlayOptions).map((l) =>
    l.addTo(map)
  );

  return { map, Leaflet, baseLayer, overlays };
};

const DEFAULT_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>';

const DEFAULT_WMS_MAX_ZOOM = 18;
const DEFAULT_XYZ_MAX_ZOOM = 20;

const createCartoFallback = (leaflet: LeafletModuleType): TileLayer =>
  leaflet.tileLayer(
    `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}${
      leaflet.Browser.retina ? "@2x.png" : ".png"
    }`,
    {
      attribution: DEFAULT_TILE_ATTRIBUTION,
      subdomains: "abcd",
      minZoom: 0,
      maxZoom: DEFAULT_XYZ_MAX_ZOOM,
    }
  );

const createXYZLayer = (
  leaflet: LeafletModuleType,
  options: XYZLayerOptions
): TileLayer =>
  leaflet.tileLayer(options.url, {
    attribution: options.attribution ?? DEFAULT_TILE_ATTRIBUTION,
    minZoom: 0,
    maxZoom: options.maxZoom ?? DEFAULT_XYZ_MAX_ZOOM,
  });

const resolveCrs = (
  leaflet: LeafletModuleType,
  name?: string
): typeof leaflet.CRS.EPSG3857 => {
  if (!name) return leaflet.CRS.EPSG3857;
  const key = name.replace(":", "");
  const table: Record<string, typeof leaflet.CRS.EPSG3857> = {
    EPSG3857: leaflet.CRS.EPSG3857,
    EPSG4326: leaflet.CRS.EPSG4326,
    EPSG3395: leaflet.CRS.EPSG3395,
  };
  return table[key] ?? leaflet.CRS.EPSG3857;
};

const createWMSLayer = (
  leaflet: LeafletModuleType,
  options: WMSLayerOptions,
  role: "base" | "overlay"
): TileLayer => {
  if (!options.url || !options.wms?.layers) {
    throw new Error(
      `ha-map: WMS layer config requires both 'url' and 'wms.layers'. Got: ${JSON.stringify(options)}`
    );
  }
  return leaflet.tileLayer.wms(options.url, {
    layers: options.wms.layers,
    format: options.wms.format ?? "image/png",
    transparent: options.wms.transparent ?? role === "overlay",
    version: options.wms.version ?? "1.3.0",
    crs: resolveCrs(leaflet, options.wms.crs),
    uppercase: options.wms.uppercase ?? false,
    attribution: options.attribution ?? DEFAULT_TILE_ATTRIBUTION,
    minZoom: 0,
    maxZoom: options.maxZoom ?? DEFAULT_WMS_MAX_ZOOM,
  });
};

export const createBaseLayer = (
  leaflet: LeafletModuleType,
  options: BaseLayerOptions | undefined,
  role: "base" | "overlay"
): TileLayer => {
  if (!options) return createCartoFallback(leaflet);
  if (options.type === "wms") return createWMSLayer(leaflet, options, role);
  return createXYZLayer(leaflet, options);
};

const createOverlayLayers = (
  leaflet: LeafletModuleType,
  overlays?: OverlayLayerOptions[]
): TileLayer[] => {
  if (!overlays?.length) return [];
  return overlays.map((opts) => {
    const layer = createBaseLayer(leaflet, opts, "overlay");
    if (opts.opacity !== undefined) {
      layer.setOpacity(opts.opacity);
    }
    return layer;
  });
};
