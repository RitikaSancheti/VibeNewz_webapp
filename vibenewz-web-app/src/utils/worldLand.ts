// ============================================================
// worldLand.ts — real coastlines for the 3D globe.
//
// Downloads the free Natural Earth "land" outline (world-atlas, 110m,
// ~50 KB) once, then turns it into an even grid of dots that sit on
// land. The globe draws those dots on a rotating sphere.
// If the download fails (offline), a simple built-in outline is used.
// ============================================================

const LAND_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";

type Ring = [number, number][]; // [lng, lat] points

// Each dot: [sin(lat), cos(lat), lng in radians]
export type LandDots = Float32Array;

// ---- TopoJSON → rings --------------------------------------------------
function ringsFromTopoJSON(topo: any): Ring[] {
  const t = topo.transform;
  const arcs: Ring[] = topo.arcs.map((arc: number[][]) => {
    let x = 0;
    let y = 0;
    return arc.map(([a, b]) => {
      if (!t) return [a, b] as [number, number];
      x += a; // arcs are delta-encoded when a transform is present
      y += b;
      return [
        x * t.scale[0] + t.translate[0],
        y * t.scale[1] + t.translate[1],
      ] as [number, number];
    });
  });

  const ring = (indexes: number[]): Ring => {
    const pts: Ring = [];
    indexes.forEach((i, k) => {
      const arc = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
      pts.push(...(k === 0 ? arc : arc.slice(1)));
    });
    return pts;
  };

  const rings: Ring[] = [];
  const addGeometry = (g: any) => {
    if (g.type === "GeometryCollection") g.geometries.forEach(addGeometry);
    else if (g.type === "Polygon")
      g.arcs.forEach((r: number[]) => rings.push(ring(r)));
    else if (g.type === "MultiPolygon")
      g.arcs.forEach((p: number[][]) => p.forEach((r) => rings.push(ring(r))));
  };
  Object.values(topo.objects).forEach(addGeometry);
  return rings;
}

// ---- Rings → evenly spaced land dots -------------------------------------
function buildDots(rings: Ring[], stepDeg = 1.6): LandDots {
  const boxes = rings.map((r) => {
    let minX = 180,
      maxX = -180,
      minY = 90,
      maxY = -90;
    for (const [x, y] of r) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return [minX, maxX, minY, maxY];
  });

  // Even–odd rule across all rings (so lakes become holes)
  const onLand = (lng: number, lat: number) => {
    let inside = false;
    for (let k = 0; k < rings.length; k++) {
      const b = boxes[k];
      if (lng < b[0] || lng > b[1] || lat < b[2] || lat > b[3]) continue;
      const r = rings[k];
      let hit = false;
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i];
        const [xj, yj] = r[j];
        if (
          yi > lat !== yj > lat &&
          lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
        )
          hit = !hit;
      }
      if (hit) inside = !inside;
    }
    return inside;
  };

  const out: number[] = [];
  for (let lat = -84; lat <= 84; lat += stepDeg) {
    const rad = (lat * Math.PI) / 180;
    const count = Math.max(1, Math.round((360 * Math.cos(rad)) / stepDeg));
    for (let j = 0; j < count; j++) {
      const lng = -180 + ((j + 0.5) * 360) / count;
      if (onLand(lng, lat))
        out.push(Math.sin(rad), Math.cos(rad), (lng * Math.PI) / 180);
    }
  }
  return new Float32Array(out);
}

let cache: Promise<LandDots> | null = null;

export function loadLandDots(): Promise<LandDots> {
  if (cache) return cache;
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), 6000);
  cache = fetch(
    LAND_URL,
    controller ? { signal: controller.signal } : undefined,
  )
    .then((r) => {
      if (!r.ok) throw new Error(`land data ${r.status}`);
      return r.json();
    })
    .then((topo) => buildDots(ringsFromTopoJSON(topo)))
    .catch(() => buildDots(FALLBACK_LAND, 2.2))
    .finally(() => clearTimeout(timer));
  return cache;
}

// ---- Simple built-in outline, only used when offline ----------------------
const FALLBACK_LAND: Ring[] = [
  // North America
  [
    [-168, 66],
    [-162, 70],
    [-140, 70],
    [-125, 72],
    [-95, 72],
    [-80, 73],
    [-62, 66],
    [-55, 52],
    [-66, 45],
    [-70, 42],
    [-76, 35],
    [-81, 31],
    [-80, 25],
    [-82, 27],
    [-84, 30],
    [-90, 29],
    [-97, 27],
    [-97, 22],
    [-92, 18],
    [-87, 21],
    [-88, 16],
    [-83, 10],
    [-79, 9],
    [-80, 7],
    [-85, 11],
    [-92, 14],
    [-105, 20],
    [-110, 24],
    [-115, 30],
    [-118, 34],
    [-124, 40],
    [-124, 48],
    [-133, 56],
    [-146, 60],
    [-158, 57],
    [-165, 61],
  ],
  // Greenland
  [
    [-73, 78],
    [-60, 82],
    [-30, 83],
    [-20, 80],
    [-20, 70],
    [-40, 60],
    [-50, 62],
    [-58, 70],
  ],
  // South America
  [
    [-80, 9],
    [-72, 12],
    [-62, 11],
    [-52, 5],
    [-50, 0],
    [-35, -5],
    [-35, -9],
    [-39, -15],
    [-41, -22],
    [-48, -26],
    [-53, -34],
    [-58, -38],
    [-62, -41],
    [-65, -47],
    [-69, -52],
    [-72, -54],
    [-75, -50],
    [-73, -40],
    [-71, -30],
    [-70, -18],
    [-76, -14],
    [-81, -6],
    [-80, 0],
    [-78, 3],
    [-77, 8],
  ],
  // Africa
  [
    [-17, 21],
    [-17, 15],
    [-12, 8],
    [-8, 4],
    [0, 5],
    [8, 4],
    [9, 2],
    [12, -5],
    [13, -12],
    [12, -17],
    [15, -27],
    [18, -34],
    [25, -34],
    [33, -28],
    [35, -24],
    [40, -15],
    [40, -10],
    [40, -3],
    [51, 11],
    [43, 12],
    [37, 18],
    [33, 28],
    [32, 31],
    [20, 32],
    [11, 34],
    [10, 37],
    [0, 36],
    [-6, 36],
    [-10, 30],
    [-13, 27],
  ],
  // Madagascar
  [
    [44, -16],
    [50, -15],
    [50, -22],
    [47, -25],
    [44, -22],
  ],
  // Europe + Asia
  [
    [-10, 36],
    [-9, 43],
    [-2, 44],
    [-5, 48],
    [2, 51],
    [5, 53],
    [8, 57],
    [10, 54],
    [12, 55],
    [5, 62],
    [14, 68],
    [25, 71],
    [40, 68],
    [45, 68],
    [60, 70],
    [70, 73],
    [80, 73],
    [100, 78],
    [112, 74],
    [130, 72],
    [140, 72],
    [160, 70],
    [180, 68],
    [180, 65],
    [172, 60],
    [163, 58],
    [160, 52],
    [156, 51],
    [155, 57],
    [143, 59],
    [137, 54],
    [141, 48],
    [135, 43],
    [130, 42],
    [129, 35],
    [127, 38],
    [125, 39],
    [121, 40],
    [119, 37],
    [122, 30],
    [120, 24],
    [110, 20],
    [108, 21],
    [106, 18],
    [109, 12],
    [105, 9],
    [100, 13],
    [100, 6],
    [103, 1],
    [100, 3],
    [98, 8],
    [98, 16],
    [94, 17],
    [92, 22],
    [88, 22],
    [80, 15],
    [80, 9],
    [77, 8],
    [73, 17],
    [72, 21],
    [67, 25],
    [60, 25],
    [57, 26],
    [56, 24],
    [59, 22],
    [55, 17],
    [45, 13],
    [43, 17],
    [35, 28],
    [34, 31],
    [35, 36],
    [27, 37],
    [26, 41],
    [23, 40],
    [22, 37],
    [20, 40],
    [13, 46],
    [12, 44],
    [16, 41],
    [16, 38],
    [10, 44],
    [3, 43],
    [-1, 37],
    [-5, 36],
  ],
  // Great Britain + Ireland
  [
    [-6, 50],
    [2, 51],
    [0, 53],
    [-2, 56],
    [-3, 59],
    [-6, 58],
    [-5, 55],
    [-3, 54],
    [-5, 52],
  ],
  [
    [-10, 52],
    [-6, 52],
    [-6, 55],
    [-8, 55],
    [-10, 54],
  ],
  // Japan
  [
    [130, 31],
    [135, 34],
    [140, 35],
    [142, 40],
    [141, 45],
    [145, 44],
    [140, 41],
    [137, 37],
    [132, 35],
  ],
  // Maritime South-East Asia
  [
    [95, 5],
    [106, -6],
    [104, -6],
    [96, 2],
  ],
  [
    [109, 1],
    [116, 7],
    [119, 5],
    [117, -4],
    [111, -3],
  ],
  [
    [105, -6],
    [115, -8],
    [106, -7],
  ],
  [
    [131, -1],
    [141, -3],
    [150, -10],
    [141, -9],
    [137, -5],
  ],
  [
    [120, 18],
    [122, 18],
    [126, 7],
    [122, 7],
    [120, 14],
  ],
  // Australia + New Zealand
  [
    [114, -22],
    [122, -18],
    [130, -12],
    [137, -12],
    [136, -15],
    [141, -11],
    [146, -19],
    [153, -25],
    [151, -34],
    [146, -39],
    [140, -38],
    [135, -35],
    [129, -32],
    [115, -35],
    [113, -26],
  ],
  [
    [172, -34],
    [178, -38],
    [175, -41],
    [171, -45],
    [167, -46],
    [170, -42],
  ],
];
