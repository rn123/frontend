import xss from "xss";

export const filterXSS = (html: string) =>
  xss(html, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: true,
  });

export const filterAttributionXSS = (html: string) =>
  xss(html, {
    whiteList: { a: ["href", "title", "target", "rel"] },
    stripIgnoreTag: true,
    stripIgnoreTagBody: true,
  });
