import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import { toast } from "react-hot-toast";
import {
  FileText,
  CheckCircle2,
  Zap,
  Navigation,
  BarChart3,
  MapPin,
  Settings,
  Radio,
  Trash2,
  Shield,
  Plus,
  Upload,
  Package,
  Clock,
  Star,
  AlertTriangle,
  Camera,
  Phone,
  Mail,
  Building,
  User as UserIcon,
  Save,
  Play,
  Pause,
  RotateCcw,
  GripHorizontal,
  ChevronRight,
  Activity,
} from "lucide-react";

import { api } from "../../lib/api";
import { SOCKET_URL } from "../../lib/socket";
import { useShipmentData } from "../../hooks/useShipmentData";
import { useDateTimeFormatter } from "../../hooks/useDateTimeFormatter";
import { useAuth } from "../../auth/AuthContext";
import LiveShipmentTracker from "../../components/LiveShipmentTracker";
import { SHIPMENT_STATUSES } from "../../constants";
import type { Shipment } from "../../types";
import { formatDate, formatDistance, buildDocumentUrl } from "../../utils";
import { handleApiError } from "../../utils/errorHandler";
import {
  shipmentApi,
  documentApi,
  simulationApi,
} from "../../services/apiService";
import ErrorDisplay from "../../components/ErrorDisplay";
import Skeleton from "../../components/Skeleton";
import Modal from "../../components/Modal";

type Driver = {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  performanceRating?: number;
  totalTrips?: number;
  yearsOfExperience?: number;
  challansCount?: number;
};
type Vehicle = {
  _id: string;
  plateNumber: string;
  model?: string;
  status: string;
};

type Doc = {
  _id: string;
  type: string;
  filePath: string;
  verified: boolean;
  createdAt: string;
};

export default function ManagerShipmentDetail() {
  const queryClient = useQueryClient();
  const { formatToLocalDateTime } = useDateTimeFormatter();
  const { id } = useParams();
  const nav = useNavigate();
  const { socket, cctvSocket, user } = useAuth();

  const [live, setLive] = useState<{
    lat: number;
    lng: number;
    ts?: string;
  } | null>(null);

  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [cctvStreamUrl, setCctvStreamUrl] = useState<string>(
    (localStorage.getItem(`cctv_${id}`) || "").trim(),
  );
  const [tempStreamUrl, setTempStreamUrl] = useState<string>(
    (localStorage.getItem(`cctv_${id}`) || "").trim(),
  );
  const [isCCTVPlaying, setIsCCTVPlaying] = useState(true);
  const [cctvError, setCctvError] = useState("");
  const [cctvSignal, setCctvSignal] = useState<any>(null);
  const [streamMode, setStreamMode] = useState<"VIDEO" | "MJPEG" | "PROXY">(
    (localStorage.getItem(`cctv_mode_${id}`) as any) || "PROXY",
  );

  // Resizable Map State
  const [mapHeight, setMapHeight] = useState(900);
  const isResizing = useRef(false);
  const lastY = useRef(0);

  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    lastY.current = e.clientY;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.cursor = "default";
    document.body.style.userSelect = "auto";
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const deltaY = e.clientY - lastY.current;
    lastY.current = e.clientY;
    setMapHeight((prev) => Math.max(400, Math.min(1200, prev + deltaY)));
  }, []);

  // CCTV Socket Connection
  useEffect(() => {
    if (!cctvSocket || !id) return;

    cctvSocket.emit("join:cctv", { shipmentId: id });

    cctvSocket.on("cctv:signal", (payload: any) => {
      console.log("[CCTV-SOCKET] Received signal:", payload);
      setCctvSignal(payload.signal);
    });

    return () => {
      cctvSocket.emit("leave:cctv", { shipmentId: id });
      cctvSocket.off("cctv:signal");
    };
  }, [cctvSocket, id]);

  // Check for localhost mismatch
  useEffect(() => {
    const isIpUrl = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(
      window.location.hostname,
    );
    const isLocalhostSocket =
      SOCKET_URL.includes("localhost") || SOCKET_URL.includes("127.0.0.1");

    if (isIpUrl && isLocalhostSocket) {
      toast.error(
        "Network Mismatch: You are accessing via IP, but the backend is still on localhost. Use the server's IP in your .env or let the auto-detector handle it.",
        { duration: 8000, id: "net-mismatch" },
      );
    }
  }, []);

  const [assignDriverId, setAssignDriverId] = useState<string | null>(null);
  const [assignVehicleId, setAssignVehicleId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [editEta, setEditEta] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const shipmentData = useShipmentData(id);

  const docsQ = useQuery({
    queryKey: ["docs", id],
    queryFn: async () => {
      const res = await api.get(`/docs/shipments/${id}`);
      return res.data.documents as Doc[];
    },
    enabled: !!id,
  });

  const driversQ = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const res = await api.get("/fleet/drivers");
      return res.data.drivers as Driver[];
    },
  });

  const vehiclesQ = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const res = await api.get("/fleet/vehicles");
      return res.data.vehicles as Vehicle[];
    },
  });

  const simStatusQuery = useQuery({
    queryKey: ["sim-status"],
    queryFn: () => simulationApi.getStatus(),
    refetchInterval: (query) =>
      (query.state.data as any)?.running ? 5000 : 10000,
  });

  const eventsQ = useQuery({
    queryKey: ["shipment-events", id],
    queryFn: async () => {
      const res = await shipmentApi.getEvents(id!);
      return res.events;
    },
    enabled: !!id,
    refetchInterval: () => (simStatusQuery.data?.running ? 5000 : false),
  });

  useEffect(() => {
    if (!socket || !id) return;

    socket.emit("join:shipment", { shipmentId: id });

    const handler = (msg: {
      shipmentId?: string;
      lat: number;
      lng: number;
      ts?: string;
      predictedEta?: string;
      distanceRemainingKm?: number;
      progressPercentage?: number;
    }) => {
      if (msg?.shipmentId !== id) return;

      setLive({ lat: msg.lat, lng: msg.lng, ts: msg.ts });

      queryClient.setQueryData(["shipment", id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          currentLocation: { lat: msg.lat, lng: msg.lng, updatedAt: msg.ts },
          predictedEta: msg.predictedEta || old.predictedEta,
          distanceRemainingKm:
            msg.distanceRemainingKm || old.distanceRemainingKm,
          progressPercentage: msg.progressPercentage || old.progressPercentage,
        };
      });
    };

    socket.on("shipment:locationUpdate", handler);

    return () => {
      socket.off("shipment:locationUpdate", handler);
      socket.emit("leave:shipment", { shipmentId: id });
    };
  }, [socket, id, queryClient]);

  if (shipmentData.isLoading)
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (shipmentData.isError || !shipmentData.shipment) {
    return (
      <ErrorDisplay
        message="Failed to load shipment"
        onRetry={() => shipmentData.refetch()}
      />
    );
  }

  const shipment = shipmentData.shipment as Shipment;
  const lastPing = shipmentData.locations?.slice(-1)[0];
  const currentCoords =
    live || (lastPing ? { lat: lastPing.lat, lng: lastPing.lng } : null);

  const handleSaveCCTV = () => {
    let cleanUrl = tempStreamUrl.trim();
    if (cleanUrl.endsWith(":8080") || cleanUrl.endsWith(":8080/")) {
      cleanUrl = cleanUrl.replace(/\/$/, "") + "/video";
      setTempStreamUrl(cleanUrl);
      toast("Auto-appending /video to IP Webcam URL", { icon: "🎥" });
    }

    if (window.location.protocol === "https:" && cleanUrl.startsWith("http:")) {
      toast.error(
        "Mixed Content Warning: You are using an HTTP stream on an HTTPS site. Most browsers will block this. Use PROXY mode below to bypass this.",
        { duration: 6000 },
      );
    }
    setCctvStreamUrl(cleanUrl);
    localStorage.setItem(`cctv_${id}`, cleanUrl);
    localStorage.setItem(`cctv_mode_${id}`, streamMode);
    setCctvError("");
    setIsCCTVPlaying(true);
    toast.success("CCTV Configuration Saved");
  };

  async function toggleSimulation() {
    const isRunning = simStatusQuery.data?.running;
    try {
      if (isRunning) {
        await simulationApi.stop();
        toast.success("Simulation Stopped");
      } else {
        await simulationApi.start();
        toast.success("Simulation Started");
      }
      simStatusQuery.refetch();
    } catch (error) {
      toast.error("Failed to control simulation");
    }
  }

  async function updateShipment() {
    if (!id) return;
    const payload: any = {};
    if (editStatus) payload.status = editStatus;
    if (editEta) payload.eta = new Date(editEta).toISOString();

    try {
      await api.patch(`/shipments/${id}`, payload);
      await shipmentData.refetch();
      toast.success("Shipment updated");
      setIsManageModalOpen(false);
    } catch (error) {
      toast.error("Update failed");
    }
  }

  async function assign() {
    if (!id) return;
    try {
      await api.post(`/shipments/${id}/assign`, {
        driverId: assignDriverId,
        vehicleId: assignVehicleId,
      });
      await shipmentData.refetch();
      toast.success("Resources reassigned");
    } catch (error) {
      toast.error("Assignment failed");
    }
  }

  async function generateDoc(type: string) {
    if (!id) return;
    setIsGenerating(true);
    try {
      await api.post(`/docs/shipments/${id}/generate`, { type });
      await docsQ.refetch();
      toast.success(`${type.replace(/_/g, " ")} generated`);
    } catch (error) {
      toast.error("Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleUploadDoc(type: string, file: File) {
    if (!id) return;
    try {
      await documentApi.upload(id, file, type);
      await docsQ.refetch();
      toast.success(`${type.replace(/_/g, " ")} uploaded`);
    } catch (error) {
      toast.error("Upload failed");
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Ultimate Master Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-3xl bg-blue-600 flex items-center justify-center shadow-2xl text-white">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                {shipment.referenceId}
              </h1>
              <button
                onClick={() => setIsManageModalOpen(true)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-blue-500 transition-all border border-slate-200 dark:border-white/10"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="px-3 py-1 rounded-lg bg-blue-600/10 text-blue-600 text-[10px] font-black uppercase tracking-widest ring-1 ring-blue-600/30">
                {shipment.status.replace(/_/g, " ")}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <Clock className="h-3 w-3" />
                ETA: {formatDate(shipment.predictedEta || shipment.eta)}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleSimulation}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl border ${
              simStatusQuery.data?.running
                ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
                : "bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-white/10"
            }`}
          >
            {simStatusQuery.data?.running ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {simStatusQuery.data?.running
              ? "Stop Simulation"
              : "Start Simulation"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column - Large Map & Live CCTV (Main Content Area) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Fluid Summary Row - Smaller yet noticeable */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Dist"
              value={`${shipment.distanceRemainingKm?.toFixed(1) || "--"}km`}
              icon={<Navigation className="h-3 w-3 text-blue-500" />}
              compact
            />
            <SummaryCard
              label="Progress"
              value={`${shipment.progressPercentage || 0}%`}
              icon={<Zap className="h-3 w-3 text-amber-500" />}
              compact
            />
            <SummaryCard
              label="Cargo"
              value={shipment.shipmentType || "Std"}
              icon={<Package className="h-3 w-3 text-indigo-500" />}
              compact
            />
            <SummaryCard
              label="Dest"
              value={shipment.destination.name}
              icon={<MapPin className="h-3 w-3 text-rose-500" />}
              compact
            />
          </div>

          {/* ENLARGED & DRAGGABLE RESIZABLE MAP DIV */}
          <div
            className="rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 relative group/map"
            style={{
              height: `${mapHeight}px`,
              transition: isResizing.current ? "none" : "height 0.3s ease",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-900/10 pointer-events-none z-10" />
            <LiveShipmentTracker
              shipment={shipment}
              locations={shipmentData.locations || []}
              liveLocation={currentCoords}
              events={eventsQ.data || []}
            />

            {/* Resize Handle */}
            <div
              onMouseDown={(e) => startResizing(e)}
              className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-slate-900/20 to-transparent flex items-center justify-center cursor-row-resize z-20 group-hover/map:opacity-100 opacity-0 transition-opacity"
            >
              <div className="w-12 h-1.5 rounded-full bg-white/50 backdrop-blur-md flex items-center justify-center">
                <GripHorizontal className="h-3 w-3 text-slate-900" />
              </div>
            </div>
          </div>

          {/* STATIC CCTV FEED DIV - Independent Section */}
          <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-lg shadow-red-500/10">
                  <Camera className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight uppercase tracking-[0.1em]">
                    Independent Telemetry
                  </h3>
                  <div className="flex items-center gap-2">
                    <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Active Link:{" "}
                      {cctvSocket?.connected ? "Secured" : "Offline"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const modes: ("VIDEO" | "MJPEG" | "PROXY")[] = [
                      "VIDEO",
                      "MJPEG",
                      "PROXY",
                    ];
                    const nextIndex =
                      (modes.indexOf(streamMode) + 1) % modes.length;
                    setStreamMode(modes[nextIndex]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] font-black text-slate-400 hover:text-white transition-colors border border-white/10 uppercase"
                >
                  Mode: {streamMode}
                </button>
                <button
                  onClick={() => setIsCCTVPlaying(!isCCTVPlaying)}
                  className={`p-2 rounded-lg transition-all ${isCCTVPlaying ? "bg-white/5 text-slate-400" : "bg-emerald-600 text-white"}`}
                >
                  {isCCTVPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setCctvError("");
                    setIsCCTVPlaying(true);
                  }}
                  className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="relative aspect-video bg-black rounded-[2rem] overflow-hidden border border-white/10 group/video shadow-inner-2xl">
                  {cctvStreamUrl.trim() && isCCTVPlaying ? (
                    streamMode === "VIDEO" ? (
                      <video
                        key={cctvStreamUrl.trim()}
                        src={cctvStreamUrl.trim()}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const isHttps = window.location.protocol === "https:";
                          const isStreamHttp = cctvStreamUrl
                            .trim()
                            .startsWith("http:");
                          console.error("[CCTV] Video Error:", {
                            event: e,
                            url: cctvStreamUrl.trim(),
                            protocolMismatch: isHttps && isStreamHttp,
                          });
                          setCctvError(
                            isHttps && isStreamHttp
                              ? "Browser blocked HTTP stream on HTTPS site. Open the stream URL in a new tab once to 'Allow' it, or use an HTTPS stream."
                              : "Signal Failed. If using IP Webcam Android, switch to MJPEG mode.",
                          );
                        }}
                      />
                    ) : streamMode === "MJPEG" ? (
                      <img
                        key={cctvStreamUrl.trim()}
                        src={cctvStreamUrl.trim()}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const isHttps = window.location.protocol === "https:";
                          const isStreamHttp = cctvStreamUrl
                            .trim()
                            .startsWith("http:");
                          console.error("[CCTV] MJPEG Error:", {
                            event: e,
                            url: cctvStreamUrl.trim(),
                            protocolMismatch: isHttps && isStreamHttp,
                          });
                          setCctvError(
                            isHttps && isStreamHttp
                              ? "Browser blocked HTTP stream on HTTPS site. Open the stream URL in a new tab once to 'Allow' it, or use an HTTPS stream."
                              : "Signal Failed. Ensure URL is correct (e.g. http://ip:port/video)",
                          );
                        }}
                      />
                    ) : (
                      <img
                        key={`proxy-${cctvStreamUrl.trim()}`}
                        src={`${SOCKET_URL}/api/cctv/proxy?url=${encodeURIComponent(cctvStreamUrl.trim())}`}
                        className="w-full h-full object-cover"
                        onError={async (e) => {
                          console.error("[CCTV] Proxy Error:", e);
                          const proxyUrl = `${SOCKET_URL}/api/cctv/proxy?url=${encodeURIComponent(cctvStreamUrl.trim())}`;

                          // Use a timeout for the diagnostic fetch
                          const controller = new AbortController();
                          const timeoutId = setTimeout(
                            () => controller.abort(),
                            3000,
                          );

                          try {
                            const res = await fetch(proxyUrl, {
                              signal: controller.signal,
                            });
                            clearTimeout(timeoutId);
                            if (!res.ok) {
                              const data = await res.json();
                              setCctvError(
                                `Proxy Error: ${data.error || res.statusText}`,
                              );
                            } else {
                              // If 200 OK, check if content type is MJPEG
                              const contentType =
                                res.headers.get("content-type");
                              if (
                                contentType &&
                                contentType.includes(
                                  "multipart/x-mixed-replace",
                                )
                              ) {
                                setCctvError(
                                  "Proxy connected, but the stream is currently interrupted or slow.",
                                );
                              } else {
                                setCctvError(
                                  `Invalid Stream Format: Received ${contentType || "unknown"}`,
                                );
                              }
                            }
                          } catch (err: any) {
                            clearTimeout(timeoutId);
                            if (err.name === "AbortError") {
                              setCctvError(
                                "Proxy timed out. The camera is taking too long to respond.",
                              );
                            } else {
                              setCctvError(
                                "Proxy Connection Failed. Ensure the backend server is running and can reach the camera.",
                              );
                            }
                          }
                        }}
                      />
                    )
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
                      <Camera className="h-16 w-16 text-slate-800 mb-4" />
                      <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">
                        {cctvStreamUrl
                          ? "SIGNAL SUSPENDED"
                          : "AWAITING CONFIGURATION"}
                      </p>
                    </div>
                  )}
                  {cctvError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-rose-950/95 p-8 text-center backdrop-blur-xl">
                      <div className="max-w-md">
                        <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
                        <h4 className="text-sm font-black text-white uppercase tracking-tight mb-2">
                          Protocol Interrupted
                        </h4>
                        <p className="text-rose-200/80 text-xs font-bold leading-relaxed">
                          {cctvError}
                        </p>
                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                          {streamMode !== "PROXY" && (
                            <button
                              onClick={() => setStreamMode("PROXY")}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-600/20"
                            >
                              Try Proxy Mode
                            </button>
                          )}
                          {streamMode === "VIDEO" && (
                            <button
                              onClick={() => setStreamMode("MJPEG")}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                            >
                              Try MJPEG Mode
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setCctvError("");
                              setIsCCTVPlaying(true);
                            }}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                          >
                            Retry
                          </button>
                        </div>
                        <div className="mt-6 text-left bg-black/40 p-4 rounded-2xl border border-white/5">
                          <p className="text-rose-300/80 text-[9px] font-black uppercase tracking-widest mb-2 underline">
                            IP WEBCAM PRO-TIP:
                          </p>
                          <ul className="text-[9px] text-slate-400 font-bold space-y-1">
                            <li>
                              • Use URL format:{" "}
                              <span className="text-blue-400">
                                http://IP:PORT/video
                              </span>
                            </li>
                            <li className="text-emerald-400 font-black">
                              • PRO-TIP: Append{" "}
                              <span className="underline">/video</span> to your
                              IP address (e.g. http://192.168.1.212:8080/video)
                            </li>
                            <li>
                              • Switch mode to{" "}
                              <span className="text-white">MJPEG</span> or{" "}
                              <span className="text-cyan-400">PROXY</span> above
                            </li>
                            <li>• Ensure phone & PC are on the same WiFi</li>
                            <li className="text-amber-500 pt-1 font-black">
                              • CONNECTION REFUSED? 1. Check if IP changed on
                              phone. 2. Start server in IP Webcam app. 3. Try
                              <span className="text-cyan-400"> PROXY</span>{" "}
                              mode.
                            </li>
                            <li className="text-rose-400 pt-1 font-black">
                              • HTTPS WARNING: If this site is HTTPS, browsers
                              BLOCK http streams. Use{" "}
                              <span className="text-cyan-400">PROXY</span> mode
                              to bypass this.
                            </li>
                            <li className="pt-2">
                              <a
                                href={cctvStreamUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-400 underline uppercase tracking-widest text-[8px] font-black"
                              >
                                Test Stream in New Tab ↗
                              </a>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="px-3 py-1 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full animate-pulse flex items-center gap-1.5 shadow-lg shadow-red-600/40">
                      <div className="h-1.5 w-1.5 rounded-full bg-white"></div>{" "}
                      LIVE SIGNAL
                    </div>
                    <div className="px-3 py-1 bg-black/60 backdrop-blur-xl text-white text-[9px] font-black uppercase tracking-widest rounded-full border border-white/10 shadow-xl">
                      SID: {cctvSocket?.id?.slice(0, 6) || "OFFLINE"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 rounded-[2rem] p-6 border border-white/10 shadow-2xl">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Settings className="h-3 w-3" /> Channel Settings
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-2 ml-1 tracking-widest">
                        Target Endpoint
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="http://192.168.1.100:8080/video"
                          value={tempStreamUrl}
                          onChange={(e) => setTempStreamUrl(e.target.value)}
                          className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:ring-4 focus:ring-blue-500/20 transition-all outline-none shadow-inner"
                        />
                        <button
                          onClick={async () => {
                            const cleanUrl = tempStreamUrl.trim();
                            if (!cleanUrl)
                              return toast.error("Enter a URL first");

                            const isLocalCamera =
                              cleanUrl.includes("192.168.") ||
                              cleanUrl.includes("127.0.0.1") ||
                              cleanUrl.includes("localhost");
                            const isRemoteProxy =
                              !SOCKET_URL.includes("localhost") &&
                              !SOCKET_URL.includes("127.0.0.1");

                            if (isLocalCamera && isRemoteProxy) {
                              toast.error(
                                "Local cameras (192.168.x.x) cannot be reached by a remote proxy server. Run the backend locally or use a public camera URL.",
                                { duration: 6000 },
                              );
                              return;
                            }

                            const testUrl = `${SOCKET_URL}/api/cctv/proxy?url=${encodeURIComponent(cleanUrl)}`;
                            const tid = toast.loading("Testing endpoint...");
                            try {
                              const res = await fetch(testUrl);
                              if (res.ok) {
                                toast.success("Stream reachable via Proxy!", {
                                  id: tid,
                                });
                              } else {
                                const data = await res.json();
                                toast.error(
                                  `Test Failed: ${data.error || res.statusText}`,
                                  { id: tid },
                                );
                              }
                            } catch (err) {
                              toast.error(
                                "Network Error: Could not reach backend",
                                { id: tid },
                              );
                            }
                          }}
                          className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
                        >
                          Test
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleSaveCCTV}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 active:scale-95"
                    >
                      <Radio className="h-3 w-3" /> Sync Signal
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-[2rem] border border-white/5 shadow-xl">
                  <div className="flex gap-3">
                    <Shield className="h-5 w-5 text-blue-500 shrink-0" />
                    <div>
                      <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">
                        Telemetry Uplink
                      </h5>
                      <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                        Connected to high-performance signaling namespace.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Fleet & Paperwork */}
        <div className="space-y-6">
          {/* Driver Profile */}
          {shipment.assignedDriverId &&
            typeof shipment.assignedDriverId === "object" && (
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl border border-slate-100 dark:border-white/5 group">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                  Tactical Asset
                </h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center text-2xl font-black text-white shadow-xl">
                    {(shipment.assignedDriverId as any).name[0]}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      {(shipment.assignedDriverId as any).name}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase mt-1">
                      <Shield className="h-3 w-3 text-blue-500" />
                      Vetted Operator
                    </div>
                    <a
                      href={`tel:${(shipment.assignedDriverId as any).phone}`}
                      className="flex items-center gap-2 text-xs text-blue-600 font-black mt-2 hover:text-blue-700 transition-colors"
                    >
                      <Phone className="h-3 w-3" />
                      {(shipment.assignedDriverId as any).phone || "OFFLINE"}
                    </a>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <StatBox
                    label="Rating"
                    value={`${(shipment.assignedDriverId as any).performanceRating || 5}/5`}
                    color="text-amber-500"
                    compact
                  />
                  <StatBox
                    label="Trips"
                    value={(shipment.assignedDriverId as any).totalTrips || 0}
                    color="text-blue-500"
                    compact
                  />
                  <StatBox
                    label="Vio"
                    value={
                      (shipment.assignedDriverId as any).challansCount || 0
                    }
                    color="text-rose-500"
                    compact
                  />
                </div>
              </div>
            )}

          {/* Paperwork Center - Master Control */}
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5">
            <div className="p-6 bg-slate-900 text-white">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                Audit Trail
              </h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                Legals & Compliance
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Document Groups */}
              {[
                {
                  phase: "Dispatch",
                  color: "bg-blue-600",
                  docs: ["DISPATCH_MANIFEST", "VEHICLE_INSPECTION"],
                },
                {
                  phase: "Journey",
                  color: "bg-indigo-600",
                  docs: ["E_WAY_BILL", "CONSIGNMENT_NOTE"],
                },
                {
                  phase: "Closure",
                  color: "bg-emerald-600",
                  docs: ["POD", "GST_INVOICE"],
                },
              ].map((group) => (
                <div key={group.phase} className="space-y-3">
                  <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    {group.phase} Docs
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {group.docs.map((type) => (
                      <DocActionItem
                        key={type}
                        label={type.replace(/_/g, " ")}
                        type={type}
                        doc={docsQ.data?.find((d) => d.type === type)}
                        onGenerate={() => generateDoc(type)}
                        onUpload={(file: File) => handleUploadDoc(type, file)}
                        isGenerating={isGenerating}
                        isManagerPortal={true}
                        compact
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Administration Modal */}
      <Modal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        title="Master Resource Allocation"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Assign Driver
              </label>
              <select
                value={
                  assignDriverId ??
                  (shipment.assignedDriverId as any)?._id ??
                  ""
                }
                onChange={(e) => setAssignDriverId(e.target.value)}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">Select Logistics Elite…</option>
                {(driversQ.data || []).map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} ({d.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                Assign Vehicle
              </label>
              <select
                value={
                  assignVehicleId ??
                  (shipment.assignedVehicleId as any)?._id ??
                  ""
                }
                onChange={(e) => setAssignVehicleId(e.target.value)}
                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="">Select Asset…</option>
                {(vehiclesQ.data || []).map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.plateNumber} {v.model ? `(${v.model})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={assign}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 mt-2"
            >
              Update Fleet Deployment
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-white/5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Status Override
                </label>
                <select
                  value={editStatus || shipment.status}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {SHIPMENT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Adjust ETA
                </label>
                <input
                  type="datetime-local"
                  value={editEta || formatToLocalDateTime(shipment.eta)}
                  onChange={(e) => setEditEta(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>
            <button
              onClick={updateShipment}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl"
            >
              Save Master Metadata
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  compact,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 ${compact ? "p-4" : "p-6"} rounded-3xl shadow-xl border border-slate-100 dark:border-white/5 transition-all hover:scale-[1.02] active:scale-[0.98] group`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-white/5 group-hover:bg-blue-500/10 transition-colors">
          {icon}
        </div>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">
          {label}
        </span>
      </div>
      <div
        className={`${compact ? "text-lg" : "text-2xl"} font-black text-slate-900 dark:text-white tracking-tight truncate`}
      >
        {value}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
  compact,
}: {
  label: string;
  value: string | number;
  color: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`bg-white/5 ${compact ? "p-3" : "p-4"} rounded-2xl border border-white/10 text-center transition-all hover:bg-white/10`}
    >
      <div
        className={`${compact ? "text-sm" : "text-lg"} font-black ${color} mb-0.5`}
      >
        {value}
      </div>
      <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
}

function TimelineItem({
  label,
  time,
  completed,
  active,
  isLast,
  isHeader,
  icon,
  pulse,
}: {
  label: string;
  time: string;
  completed?: boolean;
  active?: boolean;
  isLast?: boolean;
  isHeader?: boolean;
  icon?: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 relative group/item">
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-2xl border-2 flex items-center justify-center transition-all shadow-xl ${
            completed
              ? "bg-blue-600 border-blue-600/20"
              : active
                ? "bg-white border-blue-600"
                : "bg-slate-800 border-slate-700"
          }`}
        >
          {completed ? (
            <CheckCircle2 className="h-5 w-5 text-white" />
          ) : active ? (
            <div className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-slate-600" />
          )}
        </div>
        {!isLast && (
          <div className="h-0.5 flex-1 bg-slate-800 rounded-full overflow-hidden min-w-[20px]">
            <div
              className={`h-full bg-blue-600 transition-all duration-1000 ${completed ? "w-full" : "w-0"}`}
            />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div
          className={`text-[11px] font-black uppercase tracking-widest truncate ${
            completed
              ? "text-blue-400"
              : active
                ? "text-white"
                : "text-slate-500"
          }`}
        >
          {label}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mt-1">
          {icon}
          <span className="truncate">{time}</span>
        </div>
      </div>
      {pulse && (
        <div className="absolute top-5 left-5 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-2xl bg-blue-500 animate-ping opacity-10 pointer-events-none" />
      )}
    </div>
  );
}

function SummaryItem({
  label,
  value,
  icon,
  highlight,
  dimmed,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
  dimmed?: boolean;
  sub?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-lg border border-slate-100 dark:border-white/5 ${highlight ? "ring-2 ring-blue-500/20 bg-blue-50/10" : ""} ${dimmed ? "opacity-60" : ""}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {label}
        </span>
      </div>
      <div className="text-sm font-black text-slate-900 dark:text-white truncate">
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-slate-500 font-bold mt-1">{sub}</div>
      )}
    </div>
  );
}

function DocActionItem({
  label,
  type,
  doc,
  onGenerate,
  onUpload,
  isGenerating,
  compact,
}: any) {
  return (
    <div
      className={`flex items-center justify-between ${compact ? "p-3" : "p-4"} rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 hover:border-blue-500/30 transition-all group shadow-sm`}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div
          className={`h-10 w-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${doc ? "bg-emerald-500/10" : "bg-blue-500/10"}`}
        >
          <FileText
            className={`h-5 w-5 ${doc ? "text-emerald-500" : "text-blue-500"}`}
          />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">
            {label}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {doc ? (
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                <CheckCircle2 className="h-2 w-2" /> Verified
              </span>
            ) : (
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                Pending
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {doc ? (
          <a
            href={buildDocumentUrl(doc.filePath)}
            target="_blank"
            rel="noreferrer"
            className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-[8px] font-black text-blue-500 hover:bg-blue-500 hover:text-white transition-all uppercase tracking-widest"
          >
            View
          </a>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {isGenerating ? "..." : "Gen"}
            </button>
            <label className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded-lg text-[8px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600 transition-all">
              <Upload className="h-2.5 w-2.5" />
              <input
                type="file"
                className="hidden"
                onChange={(e) =>
                  e.target.files?.[0] && onUpload(e.target.files[0])
                }
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
