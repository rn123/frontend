import { assert, describe, it, vi } from "vitest";
import type {
  BaseLayerOptions,
  LeafletModuleType,
} from "../../../src/common/dom/setup-leaflet-map";
import { createBaseLayer } from "../../../src/common/dom/setup-leaflet-map";

const fakeTileLayer = { setOpacity: vi.fn() };

const fakeLeaflet = () => {
  const tileLayer: any = vi.fn(() => fakeTileLayer);
  tileLayer.wms = vi.fn(() => fakeTileLayer);
  return {
    tileLayer,
    Browser: { retina: false },
    CRS: {
      EPSG3857: { __label: "3857" },
      EPSG4326: { __label: "4326" },
      EPSG3395: { __label: "3395" },
    },
  } as unknown as LeafletModuleType;
};

describe("createBaseLayer", () => {
  it("falls back to CARTO Voyager when options undefined", () => {
    const leaflet = fakeLeaflet();
    createBaseLayer(leaflet, undefined, "base");
    const call = (leaflet.tileLayer as any).mock.calls[0];
    assert.match(call[0], /basemaps\.cartocdn\.com/);
    assert.strictEqual(call[1].subdomains, "abcd");
  });

  it("builds XYZ layer with user URL and default attribution", () => {
    const leaflet = fakeLeaflet();
    const opts: BaseLayerOptions = { url: "https://tiles/{z}/{x}/{y}.png" };
    createBaseLayer(leaflet, opts, "base");
    const call = (leaflet.tileLayer as any).mock.calls[0];
    assert.strictEqual(call[0], "https://tiles/{z}/{x}/{y}.png");
    assert.match(call[1].attribution, /OpenStreetMap/);
    assert.strictEqual(call[1].maxZoom, 20);
  });

  it("builds WMS layer with version 1.3.0 default and resolved CRS", () => {
    const leaflet = fakeLeaflet();
    const opts: BaseLayerOptions = {
      type: "wms",
      url: "https://wms",
      wms: { layers: "0", crs: "EPSG:4326" },
    };
    createBaseLayer(leaflet, opts, "base");
    const call = (leaflet.tileLayer.wms as any).mock.calls[0];
    assert.strictEqual(call[0], "https://wms");
    assert.strictEqual(call[1].version, "1.3.0");
    assert.strictEqual(call[1].layers, "0");
    assert.strictEqual(call[1].crs, leaflet.CRS.EPSG4326);
    assert.strictEqual(call[1].maxZoom, 18);
  });

  it("WMS base layer defaults transparent:false", () => {
    const leaflet = fakeLeaflet();
    createBaseLayer(
      leaflet,
      { type: "wms", url: "https://wms", wms: { layers: "0" } },
      "base"
    );
    const call = (leaflet.tileLayer.wms as any).mock.calls[0];
    assert.strictEqual(call[1].transparent, false);
  });

  it("WMS overlay layer defaults transparent:true", () => {
    const leaflet = fakeLeaflet();
    createBaseLayer(
      leaflet,
      { type: "wms", url: "https://wms", wms: { layers: "0" } },
      "overlay"
    );
    const call = (leaflet.tileLayer.wms as any).mock.calls[0];
    assert.strictEqual(call[1].transparent, true);
  });

  it("WMS misconfig without wms.layers throws", () => {
    const leaflet = fakeLeaflet();
    assert.throws(
      () =>
        createBaseLayer(
          leaflet,
          { type: "wms", url: "https://wms", wms: { layers: "" } },
          "base"
        ),
      /requires both 'url' and 'wms\.layers'/
    );
  });

  it("Unknown CRS falls back to EPSG3857", () => {
    const leaflet = fakeLeaflet();
    createBaseLayer(
      leaflet,
      {
        type: "wms",
        url: "https://wms",
        wms: { layers: "0", crs: "EPSG:9999" },
      },
      "base"
    );
    const call = (leaflet.tileLayer.wms as any).mock.calls[0];
    assert.strictEqual(call[1].crs, leaflet.CRS.EPSG3857);
  });
});
