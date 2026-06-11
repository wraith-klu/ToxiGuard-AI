import { useState, useEffect } from "react";

export default function ToxicityGauge({ value = 0, size = 200 }) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const target = Math.min(Math.max(value, 0), 100);
    const duration = 1200;
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value]);

  const radius = size * 0.38;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const startAngle = -225;
  const endAngle = 45;
  const totalAngle = endAngle - startAngle; // 270 degrees
  const currentAngle = startAngle + (animatedValue / 100) * totalAngle;

  const strokeWidth = size * 0.06;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (totalAngle / 360) * circumference;
  const filledLength = (animatedValue / 100) * arcLength;

  // Color interpolation
  const getColor = (val) => {
    if (val < 30) return { main: "#10b981", glow: "rgba(16, 185, 129, 0.4)" };
    if (val < 60) return { main: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)" };
    if (val < 80) return { main: "#f97316", glow: "rgba(249, 115, 22, 0.4)" };
    return { main: "#ef4444", glow: "rgba(239, 68, 68, 0.5)" };
  };

  const color = getColor(animatedValue);

  // SVG arc path helpers
  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (cx, cy, r, startA, endA) => {
    const start = polarToCartesian(cx, cy, r, endA);
    const end = polarToCartesian(cx, cy, r, startA);
    const largeArc = endA - startA <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  };

  // Tick marks
  const ticks = [0, 25, 50, 75, 100];

  // Needle endpoint
  const needleEnd = polarToCartesian(cx, cy, radius - 18, currentAngle);

  const label =
    animatedValue < 25
      ? "Safe"
      : animatedValue < 50
      ? "Low Risk"
      : animatedValue < 75
      ? "Moderate"
      : animatedValue < 90
      ? "High Risk"
      : "Dangerous";

  return (
    <div className="gauge-container">
      <svg
        width={size}
        height={size * 0.7}
        viewBox={`0 0 ${size} ${size * 0.7}`}
      >
        <defs>
          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Background arc */}
        <path
          d={describeArc(cx, cy, radius, startAngle, endAngle)}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Filled arc */}
        <path
          d={describeArc(cx, cy, radius, startAngle, currentAngle)}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          filter="url(#gaugeGlow)"
        />

        {/* Tick marks */}
        {ticks.map((tick) => {
          const angle = startAngle + (tick / 100) * totalAngle;
          const outer = polarToCartesian(cx, cy, radius + 10, angle);
          const inner = polarToCartesian(cx, cy, radius + 4, angle);
          const labelPos = polarToCartesian(cx, cy, radius + 22, angle);
          return (
            <g key={tick}>
              <line
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(0,0,0,0.15)"
                strokeWidth="1.5"
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--text-tertiary)"
                fontSize="10"
                fontWeight="600"
                fontFamily="var(--font-body)"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={color.main}
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#gaugeGlow)"
        />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r="5" fill={color.main} />
        <circle cx={cx} cy={cy} r="3" fill="white" />

        {/* Value text */}
        <text
          x={cx}
          y={cy - 22}
          textAnchor="middle"
          fill="var(--text-primary)"
          fontSize="28"
          fontWeight="900"
          fontFamily="var(--font-heading)"
        >
          {animatedValue}%
        </text>
      </svg>

      <div className="gauge-label" style={{ color: color.main }}>
        {label}
      </div>

      <style>{`
        .gauge-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 0;
        }

        .gauge-label {
          font-family: var(--font-heading);
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-top: -4px;
        }
      `}</style>
    </div>
  );
}
