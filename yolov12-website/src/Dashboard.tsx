import { useEffect, useMemo, useRef, useState } from "react";

type DetectionBox = {
  file_id: string;
  bbox_id: number;
  source: string;
  model: string;
  label: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  color: string;
  status: "pending" | "complete";
};

type History = {
  file_id: string;
  source: string;
  model: string;
  status: "pending" | "complete";
  url: string;
  runtime: string;
  timestamp: string;
};

type DashboardProps = {
  userEmail?: string;
  onSignOut: () => void;
};

export default function Dashboard({ userEmail, onSignOut }: DashboardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0.85);
  const [labelQuery, setLabelQuery] = useState("");
  const [modelVersion, setModelVersion] = useState("yolov12-small");
  const [detections, setDetections] = useState<DetectionBox[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const imgRef = useRef<HTMLImageElement>(null);

  async function fetchHistory() {
    try {
      const res = await fetch(
        "https://95iva13c2d.execute-api.us-east-1.amazonaws.com/query",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: userEmail }),
        },
      );

      if (!res.ok) {
        console.error("Failed to fetch recent runs.");
        return;
      }

      const data = await res.json();
      setHistory(data.recent_runs || []);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  }

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredDetections = useMemo(() => {
    return detections.filter((det) => {
      const matchesConfidence = det.confidence >= minConfidence;
      const matchesLabel = labelQuery
        ? det.label.toLowerCase().includes(labelQuery.toLowerCase())
        : true;
      return matchesConfidence && matchesLabel;
    });
  }, [detections, labelQuery, minConfidence]);

  useEffect(() => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const uploadToBackend = async (file: File, model: string) => {
    try {
      setIsDetecting(true);

      const formData = new FormData();
      formData.append("user", userEmail || "anonymous");
      formData.append("image", file);
      formData.append("model", model);

      const res = await fetch(
        "https://esh5kudyxk.execute-api.us-east-1.amazonaws.com/inference",
        {
          method: "POST",
          body: formData,
        },
      );

      if (!res.ok) {
        alert("Failed to upload image or run inference." + res.statusText);
        setIsDetecting(false);
        return;
      }

      const data = await res.json();
      setDetections(data.detections);
      await fetchHistory();
    } catch (err) {
      console.error("Error uploading or inferring:", err);
      alert("Error during inference. Please try again.");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setDetections([]);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRunDetection = async () => {
    if (!selectedFile) {
      alert("Upload an image first to run detection.");
      return;
    }
    setIsDetecting(true);
    await uploadToBackend(selectedFile, modelVersion);
    setIsDetecting(false);
  };

  function timeAgo(isoString: string) {
    const now = new Date();
    const past = new Date(isoString);
    const diff = (now.getTime() - past.getTime()) / 1000;

    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/70 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              YOLOv12 Cloud
            </p>
            <h1 className="text-2xl font-semibold text-slate-800">
              Detection Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">
                {userEmail ?? "Authenticated user"}
              </p>
              <p className="text-xs text-slate-400">AWS Cognito</p>
            </div>
            <button
              onClick={onSignOut}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Input
                </p>
                <h2 className="text-lg font-semibold text-slate-800">
                  Upload & Run Detection
                </h2>
              </div>
              <select
                value={modelVersion}
                onChange={(e) => setModelVersion(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="yolov12-small">yolov12-small</option>
                <option value="yolov12-medium">yolov12-medium</option>
                <option value="yolov12-large">yolov12-large</option>
              </select>
            </div>

            <label
              htmlFor="upload"
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-10 text-center transition hover:border-blue-400 hover:bg-blue-50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileChange(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              <input
                id="upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
              <div className="rounded-full bg-blue-50 text-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide">
                {selectedFile ? "Image loaded" : "Drop image or browse"}
              </div>
              <p className="mt-3 text-sm text-slate-500">
                JPG, PNG up to 10 MB. We keep your upload in memory only.
              </p>
            </label>

            {previewUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-black/5 flex justify-center">
                <div className="relative inline-block">
                  <img
                    ref={imgRef}
                    src={previewUrl}
                    alt="preview"
                    className="max-h-[440px] object-contain bg-slate-100"
                  />

                  <div
                    className="absolute top-0 left-0"
                    style={{
                      width: imgRef.current?.clientWidth || 0,
                      height: imgRef.current?.clientHeight || 0,
                    }}
                  >
                    {filteredDetections.map((det) => {
                      const img = imgRef.current;
                      if (!img) return null;

                      const scaleX = img.clientWidth / img.naturalWidth;
                      const scaleY = img.clientHeight / img.naturalHeight;

                      return (
                        <div
                          key={det.bbox_id}
                          className={`absolute ${det.color} rounded-md border-2 bg-black/10`}
                          style={{
                            left: det.bbox.x * scaleX,
                            top: det.bbox.y * scaleY,
                            width: det.bbox.width * scaleX,
                            height: det.bbox.height * scaleY,
                          }}
                        >
                          <span className="absolute -top-7 left-0 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white shadow">
                            {det.label} · {(det.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-400">
                No image loaded. Upload to preview and overlay detections.
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-between items-center">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <label className="font-semibold text-slate-700">
                  Min confidence
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                  className="accent-blue-600"
                />
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">
                  {(minConfidence * 100).toFixed(0)}%
                </span>
              </div>
              <button
                onClick={handleRunDetection}
                disabled={isDetecting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {isDetecting ? (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    Running…
                  </>
                ) : (
                  "Run detection"
                )}
              </button>
            </div>
          </section>

          <section className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Bounding boxes
                  </p>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Query & Filter
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {filteredDetections.length} matches
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">
                    Label contains
                  </label>
                  <input
                    type="text"
                    value={labelQuery}
                    onChange={(e) => setLabelQuery(e.target.value)}
                    placeholder="person, vehicle, helmet…"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500">
                    Model version
                  </label>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {modelVersion}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {filteredDetections.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No detections yet. Run inference to populate bounding boxes.
                  </p>
                ) : (
                  filteredDetections.map((det) => (
                    <div
                      key={det.bbox_id}
                      className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {det.label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {det.source} • {(det.confidence * 100).toFixed(1)}% •{" "}
                          {det.status === "complete" ? "Ready" : "Pending"}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Box #{det.bbox_id}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Activity
                  </p>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Recent Runs
                  </h2>
                </div>
                <button className="text-sm text-blue-600 font-semibold hover:underline">
                  View logs
                </button>
              </div>
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.file_id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.source}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.model} • {timeAgo(item.timestamp)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                        {item.status}
                      </span>
                      <span className="text-slate-500">{item.runtime}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <StatusCard
                title="Pipeline"
                value="Connected"
                detail="Cognito auth • S3 staging"
              />
              <StatusCard
                title="YOLOv12"
                value="Ready"
                detail="Endpoint warm"
                tone="green"
              />
              <StatusCard
                title="Credits"
                value="87%"
                detail="Usage this month"
                tone="amber"
              />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatusCard({
  title,
  value,
  detail,
  tone = "slate",
}: {
  title: string;
  value: string;
  detail: string;
  tone?: "slate" | "green" | "amber";
}) {
  const toneClasses =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-slate-50 text-slate-700 border-slate-100";

  return (
    <div className={`rounded-xl border px-4 py-3 shadow-sm ${toneClasses}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      <p className="text-sm text-slate-600">{detail}</p>
    </div>
  );
}
