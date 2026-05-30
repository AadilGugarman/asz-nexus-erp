import React from "react";

// ── ErpIcon ──────────────────────────────────────────────────────────────────
export const ErpIcon: React.FC<{ error?: boolean; className?: string }> = ({
  error,
  className = "w-[22px] h-[22px]",
}) => (
  <svg
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {error ? (
      <>
        <rect x="18" y="10" width="4" height="14" rx="2" fill="white" />
        <rect x="18" y="28" width="4" height="4" rx="2" fill="white" />
      </>
    ) : (
      <>
        <rect
          x="5"
          y="26"
          width="6"
          height="9"
          rx="1.5"
          fill="white"
          opacity="0.9"
          style={{
            transformOrigin: "8px 35px",
            animation: "erpBar1 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.3s  both",
          }}
        />
        <rect
          x="17"
          y="20"
          width="6"
          height="15"
          rx="1.5"
          fill="white"
          opacity="0.9"
          style={{
            transformOrigin: "20px 35px",
            animation: "erpBar2 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.55s both",
          }}
        />
        <rect
          x="29"
          y="13"
          width="6"
          height="22"
          rx="1.5"
          fill="white"
          opacity="0.9"
          style={{
            transformOrigin: "32px 35px",
            animation: "erpBar3 0.8s cubic-bezier(0.34,1.56,0.64,1) 0.8s  both",
          }}
        />
        <polyline
          points="8,26 20,18 32,11"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          opacity="0.95"
          style={{
            strokeDasharray: 32,
            strokeDashoffset: 32,
            animation: "erpLine 0.9s ease-out 1.3s forwards",
          }}
        />
        <circle
          cx="32"
          cy="11"
          r="2.5"
          fill="white"
          style={{
            opacity: 0,
            animation: "erpDot 0.4s ease-out 2.1s forwards",
          }}
        />
      </>
    )}
    <style>{`
      @keyframes erpBar1 { from { transform:scaleY(0); opacity:0 } to { transform:scaleY(1); opacity:0.9 } }
      @keyframes erpBar2 { from { transform:scaleY(0); opacity:0 } to { transform:scaleY(1); opacity:0.9 } }
      @keyframes erpBar3 { from { transform:scaleY(0); opacity:0 } to { transform:scaleY(1); opacity:0.9 } }
      @keyframes erpLine { to { stroke-dashoffset:0 } }
      @keyframes erpDot  { to { opacity:1 } }
    `}</style>
  </svg>
);

// ── BackgroundLayers ──────────────────────────────────────────────────────────
export const BackgroundLayers: React.FC = () => (
  <div
    className="absolute inset-0 pointer-events-none overflow-hidden"
    aria-hidden="true"
  >
    {/* Layer 1 — teal/cyan blobs */}
    <div
      className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full"
      style={{
        background:
          "radial-gradient(circle, rgba(0,174,239,0.20) 0%, transparent 65%)",
        filter: "blur(40px)",
      }}
    />
    <div
      className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full"
      style={{
        background:
          "radial-gradient(circle, rgba(0,200,150,0.20) 0%, transparent 65%)",
        filter: "blur(40px)",
      }}
    />
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
      style={{
        background:
          "radial-gradient(circle, rgba(0,174,239,0.08) 0%, transparent 70%)",
        filter: "blur(30px)",
      }}
    />

    {/* Layer 2 — dot grid */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(0,174,239,0.22) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        opacity: 0.35,
      }}
    />

    {/* Layer 3 — square grid */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0,174,239,0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,174,239,0.12) 1px, transparent 1px)
        `,
        backgroundSize: "28px 28px",
        opacity: 0.45,
      }}
    />
  </div>
);
