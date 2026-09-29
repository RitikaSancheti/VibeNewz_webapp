import { View } from "react-native";
import { colors, fonts } from "../theme";
import { Region, REGIONS } from "../utils/news";

// Pin positions inside a 400 × 400 box
const PINS: Record<Region, { x: number; y: number }> = {
  Americas: { x: 125, y: 148 },
  Europe: { x: 243, y: 118 },
  Africa: { x: 240, y: 204 },
  "Asia Pacific": { x: 331, y: 152 },
};

const LAND = [
  "M58 160 C52 118 80 70 120 58 C150 50 170 70 172 96 C174 122 150 140 152 168 C154 196 180 214 170 238 C160 258 132 250 112 232 C90 212 62 196 58 160 Z",
  "M190 130 C186 100 210 70 238 62 C258 56 262 40 285 44 C320 50 346 70 342 96 C338 118 306 124 294 146 C284 164 264 170 252 184 C242 196 224 194 218 176 C212 160 194 154 190 130 Z",
  "M212 214 C214 196 234 190 252 196 C270 202 274 220 268 238 C260 258 252 270 244 292 C238 310 224 312 218 292 C212 272 210 240 212 214 Z",
  "M128 256 C136 236 170 232 192 242 C210 250 208 270 198 290 C186 310 176 332 160 338 C146 342 140 322 138 302 C136 284 122 272 128 256 Z",
  "M282 240 C292 224 318 222 330 238 C340 252 330 274 312 286 C296 296 280 292 276 276 C272 264 274 250 282 240 Z",
];

interface Props {
  size: number;
  selected: Region;
  onSelect: (region: Region) => void;
  counts: Record<Region, number>;
}

export function Globe({ size, selected, onSelect, counts }: Props) {
  return (
    <View
      style={
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          boxShadow: "0 30px 80px rgba(210, 180, 60, 0.28)",
        } as any
      }
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 400 400"
        role="img"
        aria-label="World map of positive stories"
      >
        <defs>
          <radialGradient id="globeFill" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#FFFDF0" />
            <stop offset="45%" stopColor="#F2EDC8" />
            <stop offset="80%" stopColor="#C9C79B" />
            <stop offset="100%" stopColor="#6F7250" />
          </radialGradient>
          <clipPath id="globeClip">
            <circle cx="200" cy="200" r="199" />
          </clipPath>
        </defs>

        <circle
          cx="200"
          cy="200"
          r="199"
          fill="url(#globeFill)"
          stroke="#E6DDB5"
          strokeWidth="1.5"
        />

        <g clipPath="url(#globeClip)">
          {[80, 140].map((rx) => (
            <ellipse
              key={rx}
              cx="200"
              cy="200"
              rx={rx}
              ry="199"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity="0.35"
            />
          ))}
          <ellipse
            cx="200"
            cy="200"
            rx="199"
            ry="70"
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.3"
          />
          <line
            x1="200"
            y1="0"
            x2="200"
            y2="400"
            stroke="#FFFFFF"
            strokeOpacity="0.3"
          />
          {LAND.map((d, i) => (
            <path key={i} d={d} fill={colors.primary} fillOpacity="0.78" />
          ))}
          <ellipse
            cx="352"
            cy="296"
            rx="20"
            ry="16"
            fill={colors.primary}
            fillOpacity="0.78"
          />
        </g>

        {REGIONS.map((region) => {
          const { x, y } = PINS[region];
          const active = region === selected;
          const hasStories = counts[region] > 0;
          return (
            <g
              key={region}
              onClick={() => onSelect(region)}
              style={{ cursor: "pointer" }}
              opacity={hasStories || active ? 1 : 0.55}
            >
              <title>{`${region} (${counts[region]} stories)`}</title>
              <circle
                cx={x}
                cy={y}
                r="14"
                fill={colors.sunshine}
                opacity="0.35"
              >
                <animate
                  attributeName="r"
                  values="10;17;10"
                  dur="2.6s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.5;0.15;0.5"
                  dur="2.6s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle cx={x} cy={y} r="8" fill="#FFFFFF" />
              <circle cx={x} cy={y} r="4.5" fill={colors.sunshine} />
              <circle cx={x} cy={y} r="22" fill="transparent" />
            </g>
          );
        })}

        {(() => {
          const { x, y } = PINS[selected];
          const w = selected.length * 6.4 + 22;
          return (
            <g pointerEvents="none">
              <rect
                x={x - w / 2}
                y={y + 14}
                width={w}
                height="22"
                rx="11"
                fill="#2F3526"
              />
              <text
                x={x}
                y={y + 29}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="600"
                fill="#FFFFFF"
                style={{ fontFamily: fonts.sans }}
              >
                {selected}
              </text>
            </g>
          );
        })()}
      </svg>
    </View>
  );
}
