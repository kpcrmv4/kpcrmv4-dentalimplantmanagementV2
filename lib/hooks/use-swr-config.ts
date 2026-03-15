import type { SWRConfiguration } from "swr"

// Global SWR config: stops retry on 401/403 to prevent infinite spinner
export const swrConfig: SWRConfiguration = {
  onErrorRetry: (error, _key, _config, revalidate, { retryCount }) => {
    // Session expired → redirect to login, don't retry
    if (error?.status === 401 || error?.status === 403) {
      window.location.href = "/login?expired=true"
      return
    }
    // Stop after 3 retries
    if (retryCount >= 3) return
    // Exponential backoff
    setTimeout(() => revalidate({ retryCount }), Math.min(5000 * 2 ** retryCount, 30000))
  },
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
}
