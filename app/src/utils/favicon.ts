// Checks root domain for favicon.
export function getPrimaryFavicon(url: string): string | null {
  try {
    let normalized = url;

    if (!/^https?:\/\//i.test(url)) {
      normalized = "https://" + url;
    }

    const { origin } = new URL(normalized);
    return `${origin}/favicon.ico`;
  } catch {
    return null;
  }
}

// Fallback method using google's S2 service to fetch a favicon.
export function getGoogleFavicon(url: string): string {
  try {
    let normalized = url;

    if (!/^https?:\/\//i.test(url)) {
      normalized = "https://" + url;
    }

    const domain = new URL(normalized).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return "";
  }
}
