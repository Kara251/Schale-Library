import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext adapter configuration for Cloudflare Workers.
 *
 * Kept intentionally minimal for migration prep (W6): no R2/KV/Durable Object
 * overrides yet. Incremental cache falls back to a per-isolate dummy cache,
 * which is fine while the app renders dynamically. Wire up R2 incremental
 * cache + cache purging when ISR/static caching is actually adopted:
 * https://opennext.js.org/cloudflare/caching
 */
export default defineCloudflareConfig({});
