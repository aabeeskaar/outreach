import { randomBytes } from "crypto";

export function generateTrackingId(): string {
  return randomBytes(16).toString("hex");
}

function getBaseUrl(): string {
  // Priority: APP_URL > NEXTAUTH_URL > VERCEL_URL > localhost
  // APP_URL is a custom env var for explicit tracking URL configuration
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  // Vercel automatically sets this
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function getTrackingPixelUrl(trackingId: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api/track/open/${trackingId}`;
}

export function getTrackedLinkUrl(trackingId: string, originalUrl: string): string {
  const baseUrl = getBaseUrl();
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
