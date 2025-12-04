/**
 * Utility functions for parsing and managing URL query parameters
 */

export interface UrlParam {
  key: string;
  value: string;
}

/**
 * Parse URL and extract query parameters
 * Returns base URL and array of parameters
 */
export function parseUrlParams(url: string): {
  baseUrl: string;
  params: UrlParam[];
} {
  try {
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    const params: UrlParam[] = [];

    urlObj.searchParams.forEach((value, key) => {
      params.push({ key, value });
    });

    return { baseUrl, params };
  } catch {
    // If URL is invalid, try to parse it manually
    const questionMarkIndex = url.indexOf("?");
    if (questionMarkIndex === -1) {
      return { baseUrl: url, params: [] };
    }

    const baseUrl = url.substring(0, questionMarkIndex);
    const queryString = url.substring(questionMarkIndex + 1);
    const params: UrlParam[] = [];

    if (queryString) {
      const pairs = queryString.split("&");
      pairs.forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key) {
          params.push({
            key: decodeURIComponent(key),
            value: decodeURIComponent(value || ""),
          });
        }
      });
    }

    return { baseUrl, params };
  }
}

/**
 * Reconstruct URL from base URL and parameters
 */
export function reconstructUrl(baseUrl: string, params: UrlParam[]): string {
  if (params.length === 0) {
    return baseUrl;
  }

  const queryString = params
    .filter((p) => p.key.trim() !== "")
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");

  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Add a new parameter
 */
export function addParam(params: UrlParam[]): UrlParam[] {
  return [...params, { key: "", value: "" }];
}

/**
 * Remove a parameter by index
 */
export function removeParam(params: UrlParam[], index: number): UrlParam[] {
  return params.filter((_, i) => i !== index);
}

/**
 * Update a parameter
 */
export function updateParam(
  params: UrlParam[],
  index: number,
  key: string,
  value: string
): UrlParam[] {
  return params.map((param, i) => (i === index ? { key, value } : param));
}

/**
 * Validate if a URL has valid parameters
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    // Check if it's at least a valid-looking URL structure
    return /^https?:\/\//.test(url);
  }
}
