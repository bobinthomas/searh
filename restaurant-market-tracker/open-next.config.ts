import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default config: no incremental cache backend required. Every route in this app
// is dynamic (it reads D1), so there is nothing to cache between requests.
export default defineCloudflareConfig();
