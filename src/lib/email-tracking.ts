import { randomBytes } from "crypto";

export function generateTrackingId(): string {
  return randomBytes(16).toString("hex");
}

export function getTrackingPixelUrl(trackingId: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/api/track/open/${trackingId}`;
}

export function getTrackedLinkUrl(trackingId: string, originalUrl: string): string {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const encodedUrl = encodeURIComponent(originalUrl);
  return `${baseUrl}/api/track/click/${trackingId}?url=${encodedUrl}`;
}

export function injectTrackingPixel(htmlBody: string, trackingId: string): string {
  const pixelUrl = getTrackingPixelUrl(trackingId);
  const trackingPixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;visibility:hidden;" alt="" />`;

  // Insert pixel at the end of the body, before closing tags if any
  if (htmlBody.includes("</body>")) {
    return htmlBody.replace("</body>", `${trackingPixel}</body>`);
  } else if (htmlBody.includes("</html>")) {
    return htmlBody.replace("</html>", `${trackingPixel}</html>`);
  } else {
    return htmlBody + trackingPixel;
  }
}

export function wrapLinksWithTracking(htmlBody: string, trackingId: string): string {
  // Match href attributes with URLs (but not mailto: or tel:)
  const linkRegex = /href=["'](?!(mailto:|tel:|#))([^"']+)["']/gi;

  return htmlBody.replace(linkRegex, (match, _protocol, url) => {
    // Skip tracking URLs to prevent double-wrapping
    if (url.includes("/api/track/")) {
      return match;
    }

    const trackedUrl = getTrackedLinkUrl(trackingId, url);
    return `href="${trackedUrl}"`;
  });
}

export function addTrackingToEmail(htmlBody: string, trackingId: string): string {
  let trackedBody = htmlBody;

  // Wrap links with tracking
  trackedBody = wrapLinksWithTracking(trackedBody, trackingId);

  // Inject tracking pixel
  trackedBody = injectTrackingPixel(trackedBody, trackingId);

  return trackedBody;
}
