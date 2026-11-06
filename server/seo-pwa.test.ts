import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

function readProjectFile(relativePath: string) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

describe("SEO and PWA configuration", () => {
  it("keeps public SEO metadata aligned with the monochrome brand", () => {
    const html = readProjectFile("client/index.html");

    expect(html).toContain('meta name="theme-color" content="#0a0a0a"');
    expect(html).toContain('meta name="robots" content="index, follow"');
    expect(html).toContain('meta property="og:url" content="https://diboraculum.com"');
  });

  it("keeps private dashboard paths out of search indexes", () => {
    const app = readProjectFile("client/src/App.tsx");
    const robots = readProjectFile("client/public/robots.txt");

    expect(app).toContain('isPrivateRoute ? "noindex, nofollow" : "index, follow"');
    expect(robots).toContain("Disallow: /dashboard");
    expect(robots).toContain("Disallow: /api/");
  });

  it("uses a versioned network-first service worker for navigation", () => {
    const serviceWorker = readProjectFile("client/public/sw.js");
    const manifest = JSON.parse(readProjectFile("client/public/manifest.json")) as Record<string, string>;

    expect(serviceWorker).toContain('CACHE_NAME = "dib-hub-v4"');
    expect(serviceWorker).toContain('request.mode === "navigate"');
    expect(serviceWorker).toContain("fetch(request).catch");
    expect(manifest).toMatchObject({
      id: "/",
      scope: "/",
      start_url: "/?source=pwa",
      theme_color: "#0a0a0a",
    });
  });
});
