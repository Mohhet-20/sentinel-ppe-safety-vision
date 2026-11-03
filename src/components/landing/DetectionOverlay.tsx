import { motion } from "framer-motion";

import { classColor } from "@/lib/vision/class-style";

export interface OverlayBox {
  cls: string;
  conf: number;
  /** Normalised [0, 1] coordinates. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Absolutely-positioned bounding boxes over an image of known aspect ratio.
 * Pure DOM (no canvas) so labels stay crisp at any size and boxes can animate in.
 */
export function DetectionOverlay({
  boxes,
  animate = true,
  stagger = 0.08,
  showLabels = true,
}: {
  boxes: OverlayBox[];
  animate?: boolean;
  stagger?: number;
  showLabels?: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {boxes.map((b, i) => {
        const color = classColor(b.cls);
        return (
          <motion.div
            key={`${b.cls}-${i}-${b.x.toFixed(3)}`}
            initial={animate ? { opacity: 0, scale: 1.08 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: animate ? 0.3 + i * stagger : 0, duration: 0.35, ease: "easeOut" }}
            className="absolute rounded-[3px]"
            style={{
              left: `${b.x * 100}%`,
              top: `${b.y * 100}%`,
              width: `${b.w * 100}%`,
              height: `${b.h * 100}%`,
              border: `2px solid ${color}`,
              boxShadow: `0 0 0 1px rgba(0,0,0,0.35), 0 0 14px -2px ${color}88`,
            }}
          >
            {showLabels && (
              <span
                className="absolute -top-[18px] left-[-2px] whitespace-nowrap rounded-t-[3px] px-1.5 py-px font-mono text-[9px] font-semibold leading-[15px] text-black sm:text-[10px]"
                style={{ background: color }}
              >
                {b.cls} {Math.round(b.conf * 100)}%
              </span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
