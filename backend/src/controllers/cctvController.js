import http from "http";
import https from "https";
import { URL } from "url";

/**
 * Proxies an MJPEG stream from a given URL.
 * This handles CORS, Mixed Content, and provides a stable "TCP-based" connection via Node.js.
 */
export async function proxyStream(req, res) {
  let { url: targetUrl } = req.query;

  if (!targetUrl) {
    return res.status(400).json({ error: "Target URL is required" });
  }

  // Trim the URL and ensure it has a protocol
  targetUrl = targetUrl.trim();
  if (!targetUrl.startsWith("http")) {
    targetUrl = `http://${targetUrl}`;
  }

  // Common mistake: IP Webcam dashboard URL instead of stream URL
  // If it's just http://IP:8080 or http://IP:8080/, append /video
  try {
    const urlObj = new URL(targetUrl);
    if (
      urlObj.port === "8080" &&
      (urlObj.pathname === "/" || urlObj.pathname === "")
    ) {
      targetUrl = `${urlObj.origin}/video`;
      console.log(`[CCTV-PROXY] Auto-corrected IP Webcam URL to: ${targetUrl}`);
    }
  } catch (e) {
    /* ignore malformed URL here, will catch in main block */
  }

  try {
    const parsedUrl = new URL(targetUrl);
    const requester = parsedUrl.protocol === "https:" ? https : http;

    console.log(`[CCTV-PROXY] Attempting to proxy: ${targetUrl}`);

    const proxyReq = requester.get(targetUrl, (proxyRes) => {
      const statusCode = proxyRes.statusCode || 500;

      if (statusCode >= 400) {
        console.error(
          `[CCTV-PROXY] Target returned ${statusCode} for ${targetUrl}`,
        );
        if (!res.headersSent) {
          res
            .status(statusCode)
            .json({ error: `Target camera returned ${statusCode}` });
        }
        return;
      }

      // Forward ALL headers from the target, especially for video tags
      Object.keys(proxyRes.headers).forEach((key) => {
        res.setHeader(key, proxyRes.headers[key]);
      });

      // Override some headers for security and stability
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      console.log(
        `[CCTV-PROXY] Streaming started for: ${targetUrl} (Type: ${proxyRes.headers["content-type"]})`,
      );

      proxyRes.pipe(res);

      proxyRes.on("error", (err) => {
        console.error("[CCTV-PROXY] Stream error during pipe:", err.message);
        if (!res.headersSent) {
          res.status(502).json({ error: "Stream connection lost" });
        }
      });
    });

    proxyReq.on("error", (err) => {
      console.error(
        `[CCTV-PROXY] Connection failed to ${targetUrl}:`,
        err.message,
      );
      if (!res.headersSent) {
        if (err.code === "ECONNREFUSED") {
          res.status(502).json({
            error: `Connection Refused. Is the camera app running at ${targetUrl}?`,
          });
        } else if (err.code === "ENOTFOUND") {
          res
            .status(502)
            .json({ error: `Camera host not found: ${parsedUrl.hostname}` });
        } else {
          res.status(502).json({ error: `Failed to connect: ${err.message}` });
        }
      }
    });

    // Set a timeout for the initial connection
    proxyReq.setTimeout(5000, () => {
      console.error(`[CCTV-PROXY] Connection timed out for: ${targetUrl}`);
      proxyReq.destroy();
      if (!res.headersSent) {
        res.status(504).json({ error: "Camera connection timed out" });
      }
    });

    req.on("close", () => {
      console.log(
        `[CCTV-PROXY] Client disconnected, closing target stream for: ${targetUrl}`,
      );
      proxyReq.destroy();
    });
  } catch (err) {
    console.error("[CCTV-PROXY] URL Parsing Error:", targetUrl, err.message);
    res.status(400).json({ error: "Malformed stream URL" });
  }
}
