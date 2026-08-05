import type { NextConfig } from "next";

/**
 * `next dev` cannot execute PHP, so in development /game.php is handed to a
 * local `php -S`. In production both the site and the handler are served by the
 * same host, so the path resolves on its own and no rewrite is involved.
 *
 * The key is only added in development. `personal-branch` builds with
 * `output: export`, which does not support rewrites, and merging a config that
 * always declares them would break that export.
 */
const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  ...(isDev
    ? {
      async rewrites() {
        // beforeFiles, not the default. A plain array runs *after* filesystem
        // routes, so Next would serve public/game.php as a static asset and
        // hand the browser the PHP source instead of executing it.
        return {
          beforeFiles: [{ source: "/game.php", destination: "http://127.0.0.1:8100/game.php" }],
          afterFiles: [],
          fallback: [],
        };
      },
    }
    : {}),
};

export default nextConfig;
