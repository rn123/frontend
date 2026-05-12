import { assert, describe, it } from "vitest";
import { filterAttributionXSS, filterXSS } from "../../../src/common/util/xss";

describe("filterXSS", () => {
  it("strips all tags", () => {
    assert.strictEqual(filterXSS("<a href='x'>x</a>"), "");
    assert.strictEqual(filterXSS("<script>alert(1)</script>safe"), "safe");
  });
});

describe("filterAttributionXSS", () => {
  it("keeps anchor tags with href", () => {
    const out = filterAttributionXSS(
      '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
    );
    assert.match(
      out,
      /<a href="https:\/\/osm\.org\/copyright">OpenStreetMap<\/a>/
    );
  });

  it("strips script tags", () => {
    const out = filterAttributionXSS(
      '<a href="x">x</a><script>alert(1)</script>'
    );
    assert.notMatch(out, /<script>/);
  });

  it("strips event handler attributes on anchors", () => {
    const out = filterAttributionXSS(
      '<a href="https://example.com" onclick="alert(1)">x</a>'
    );
    assert.notMatch(out, /onclick/);
    assert.match(out, /href="https:\/\/example\.com"/);
  });
});
