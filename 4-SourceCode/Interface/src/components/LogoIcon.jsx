import React from "react";

const AnimatedStarLogo = ({ size = 64, className = "" }) => {
  const themeColor = "#46eaff";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* CSS ANIMATIONS */}
        <style>
          {`
            @keyframes spin-clockwise {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes spin-counter {
              from { transform: rotate(360deg); }
              to { transform: rotate(0deg); }
            }
            @keyframes heartbeat {
              0% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 2px ${themeColor}); }
              50% { opacity: 0.8; transform: scale(0.9); filter: drop-shadow(0 0 0px ${themeColor}); }
              100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 2px ${themeColor}); }
            }
            
            /* Apply origin center for proper rotation */
            .ring-cw { transform-origin: 50px 50px; animation: spin-clockwise 20s linear infinite; }
            .ring-ccw { transform-origin: 50px 50px; animation: spin-counter 15s linear infinite; }
            
            /* The Star needs to be in a group that handles the scaling */
            .star-pulse { 
              transform-origin: 50px 50px; 
              animation: heartbeat 3s ease-in-out infinite; 
            }
          `}
        </style>

        {/* GRADIENTS & FILTERS */}
        <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={themeColor} />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>

        <radialGradient id="glowBack" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={themeColor} stopOpacity="0.4" />
          <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
        </radialGradient>

        <filter id="neonFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="2.5"
            floodColor={themeColor}
            floodOpacity="0.7"
          />
        </filter>
      </defs>

      {/* --- LAYER 1: ROTATING DATA RINGS --- */}

      {/* Outer Ring: Rotating Clockwise */}
      <circle
        className="ring-cw"
        cx="50"
        cy="50"
        r="42"
        stroke="#1E293B"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* Inner Ring: Rotating Counter-Clockwise */}
      <circle
        className="ring-ccw"
        cx="50"
        cy="50"
        r="30"
        stroke="#334155"
        strokeWidth="1.5"
        opacity="0.6"
        strokeDasharray="8 12"
      />

      {/* --- LAYER 2: STATIC ANCHOR RAYS --- */}
      <g stroke={themeColor} strokeWidth="2" strokeLinecap="round">
        <line x1="50" y1="18" x2="50" y2="28" />
        <line x1="50" y1="82" x2="50" y2="72" />
        <line x1="18" y1="50" x2="28" y2="50" />
        <line x1="82" y1="50" x2="72" y2="50" />

        {/* Thinner Diagonals */}
        <g strokeWidth="1" opacity="0.6">
          <line x1="32" y1="32" x2="38" y2="38" />
          <line x1="68" y1="68" x2="62" y2="62" />
        </g>
      </g>

      {/* --- LAYER 3: THE PULSING 4-POINT STAR --- */}
      <g className="star-pulse">
        {/* The Glow behind the star */}
        <circle cx="50" cy="50" r="22" fill="url(#glowBack)" />

        {/* The Exact 4-Point Star Shape */}
        <path
          transform="translate(50, 50)"
          d="M 0 -18 C 0 -6, 0 -6, 6 -6 C 6 -6, 18 0, 18 0 C 18 0, 6 6, 6 6 C 6 6, 0 6, 0 18 C 0 6, 0 6, -6 6 C -6 6, -18 0, -18 0 C -18 0, -6 -6, -6 -6 C -6 -6, 0 -6, 0 -18 Z"
          fill="url(#starGrad)"
          filter="url(#neonFilter)"
        />

        {/* The White Core */}
        <circle cx="50" cy="50" r="2.5" fill="white" />
      </g>
    </svg>
  );
};

export default AnimatedStarLogo;
