import { useState, useEffect } from "react";
import { X, Camera, Settings, Play, Pause, RotateCcw } from "lucide-react";
import Modal from "./Modal";

interface CCTVStreamProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  initialStreamUrl?: string;
}

export default function CCTVStream({
  isOpen,
  onClose,
  shipmentId,
  initialStreamUrl,
}: CCTVStreamProps) {
  const [streamUrl, setStreamUrl] = useState(initialStreamUrl || "");
  const [tempStreamUrl, setTempStreamUrl] = useState(initialStreamUrl || "");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialStreamUrl) {
      setStreamUrl(initialStreamUrl);
      setTempStreamUrl(initialStreamUrl);
    }
  }, [initialStreamUrl]);

  const handleStreamUrlSubmit = () => {
    if (!tempStreamUrl.trim()) {
      setError("Please enter a valid stream URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(tempStreamUrl);
      setStreamUrl(tempStreamUrl);
      setError("");
      setShowSettings(false);
      setIsPlaying(true);
    } catch (e) {
      setError(
        "Please enter a valid URL (e.g., http://192.168.1.100:8080/stream)",
      );
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setError("");
    // Force reload the stream by changing the key
    const videoElement = document.getElementById(
      "cctv-video",
    ) as HTMLVideoElement;
    if (videoElement) {
      videoElement.load();
    }
    setTimeout(() => setIsLoading(false), 2000);
  };

  const handleVideoError = () => {
    setError("Failed to load stream. Please check the URL and try again.");
    setIsPlaying(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CCTV Live Stream">
      <div className="space-y-4">
        {/* Stream Controls */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Live CCTV Feed - Shipment {shipmentId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePlayPause}
              disabled={!streamUrl}
              className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all disabled:opacity-50"
              title={isPlaying ? "Pause Stream" : "Play Stream"}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={handleRefresh}
              disabled={!streamUrl}
              className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 transition-all disabled:opacity-50"
              title="Refresh Stream"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
              title="Stream Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
              Stream Configuration
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  IP Camera Stream URL
                </label>
                <input
                  type="url"
                  value={tempStreamUrl}
                  onChange={(e) => setTempStreamUrl(e.target.value)}
                  placeholder="http://192.168.1.100:8080/stream or rtsp://192.168.1.100:554/stream"
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleStreamUrlSubmit}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply Stream URL
                </button>
                <button
                  onClick={() => {
                    setTempStreamUrl(streamUrl);
                    setShowSettings(false);
                    setError("");
                  }}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Video Stream */}
        <div
          className="relative bg-black rounded-xl overflow-hidden"
          style={{ aspectRatio: "16/9" }}
        >
          {streamUrl && isPlaying ? (
            <video
              id="cctv-video"
              src={streamUrl}
              autoPlay
              muted
              loop
              className="w-full h-full object-cover"
              onError={handleVideoError}
              onLoadStart={() => setIsLoading(true)}
              onLoadedData={() => setIsLoading(false)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-center">
                <Camera className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-bold">
                  {streamUrl
                    ? isPlaying
                      ? "Loading stream..."
                      : "Stream paused"
                    : "No stream configured"}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  {streamUrl
                    ? "Click play to start streaming"
                    : "Click settings to configure stream URL"}
                </p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-white text-sm font-bold">
                  Loading stream...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-4 right-4 p-3 bg-rose-500 bg-opacity-90 text-white text-xs font-bold rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Stream Info */}
        {streamUrl && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider">
                Stream URL:
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-mono truncate max-w-xs">
                {streamUrl}
              </span>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
          <h4 className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">
            Setup Instructions
          </h4>
          <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <li>• Enter your IP camera stream URL in the settings</li>
            <li>
              • Common formats: http://IP:PORT/stream or rtsp://IP:554/stream
            </li>
            <li>• Ensure your camera supports H.264 video streaming</li>
            <li>• For RTSP streams, you may need to configure CORS headers</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
