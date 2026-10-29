const SIZE = 3;

const STARS = [];
for (let row = 0; row < SIZE; row++) {
  for (let col = 0; col < SIZE; col++) {
    STARS.push({ x: col + 0.5, y: row + 0.5 });
  }
}

// Разрешение растра для проверки областей и полутолщина «стен» в клетках поля.
const GRID_N = 400;
const WALL_HALF = 0.006;
const EPS = 1e-6;

function createState() {
  return {
    size: SIZE,
    shapes: [],
    moves: 0,
    nextId: 1,
    solved: false,
  };
}

function applyMove(state, payload) {
  if (!payload || !Array.isArray(payload.points) || payload.points.length > 5000) {
    return { ok: false, error: 'Некорректный штрих.' };
  }

  const shape = snapStroke(payload.points);
  if (!shape) {
    return { ok: false, error: 'Слишком короткий или непонятный штрих.' };
  }

  shape.id = state.nextId++;
  state.shapes.push(shape);
  state.moves++;
  state.solved = computeSolved(state);
  return { ok: true };
}

function isSolved(state) {
  return !!state.solved;
}

function publicState(state) {
  return {
    size: state.size,
    shapes: state.shapes,
    moves: state.moves,
    solved: isSolved(state),
  };
}

function playerProgress(state, player) {
  return { moves: player.moves, firstWinAt: player.firstWinAt };
}

function getHint(state, playerMoves) {
  if (isSolved(state)) return null;

  const squares = state.shapes.filter(s => s.type === 'square');

  if (squares.length > 2) {
    return {
      message: 'Нужно ровно два квадрата. Сбрось поле и попробуй снова.',
    };
  }

  if (squares.length === 0 && state.shapes.length > 0) {
    return {
      message: 'Замкни линию — тогда она превратится в ровный квадрат.',
    };
  }

  if (squares.length === 1) {
    return {
      message: 'Первый квадрат готов. Нарисуй второй.',
    };
  }

  if (squares.length === 2) {
    return {
      message: 'Пока не выходит. Внешний ромб должен касаться краёв поля, а внутренний квадрат — внешнего ромба.',
    };
  }

  if (playerMoves >= 4) {
    return {
      message: 'Подсказка: внешний ромб должен касаться краёв поля, а внутренний квадрат — внешнего ромба.',
    };
  }

  return null;
}

// ---------- превращение штриха в линию или квадрат ----------
function snapStroke(rawPoints) {
  const pts = [];
  for (const p of rawPoints) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    const x = clamp(p.x, -0.5, 3.5);
    const y = clamp(p.y, -0.5, 3.5);
    if (!pts.length || distance(pts[pts.length - 1], { x, y }) > 0.015) {
      pts.push({ x, y });
    }
  }
  if (pts.length < 2) return null;

  const first = pts[0];
  const last = pts[pts.length - 1];

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const maxDim = Math.max(maxX - minX, maxY - minY);
  const gap = distance(first, last);
  const area = Math.abs(polygonArea(pts));
  const closed = pts.length >= 6
    && maxDim > 0.15
    && gap < 0.25 * maxDim
    && area > 0.03;

  if (!closed) {
    if (distance(first, last) < 0.15) return null;
    return {
      type: 'line',
      x1: round3(first.x),
      y1: round3(first.y),
      x2: round3(last.x),
      y2: round3(last.y),
    };
  }

  const centroid = polygonCentroid(pts);
  const halfSide = snapHalfSide(Math.sqrt(area) / 2);
  const rotation = snapRotation(minAreaAngle(pts));

  return {
    type: 'square',
    cx: snapCenter(centroid.x),
    cy: snapCenter(centroid.y),
    h: halfSide,
    rotation,
  };
}

function snapHalfSide(halfSide) {
  const step = 0.0625;
  return Math.max(step, Math.round(halfSide / step) * step);
}

function snapCenter(value) {
  const step = 0.5;
  return clamp(Math.round(value / step) * step, 0, 3);
}

function snapRotation(degrees) {
  const snapped = Math.round(degrees / 45) * 45;
  return ((snapped % 90) + 90) % 90;
}

function polygonArea(pts) {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return sum / 2;
}

function polygonCentroid(pts) {
  let area2 = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const cross = p.x * q.y - q.x * p.y;
    area2 += cross;
    cx += (p.x + q.x) * cross;
    cy += (p.y + q.y) * cross;
  }

  if (Math.abs(area2) < EPS) {
    const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / pts.length, y: sum.y / pts.length };
  }

  return { x: cx / (3 * area2), y: cy / (3 * area2) };
}

function minAreaAngle(pts) {
  let best = 0;
  let bestArea = Infinity;

  for (let degrees = 0; degrees < 90; degrees++) {
    const rad = degrees * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const p of pts) {
      const x = p.x * cos + p.y * sin;
      const y = -p.x * sin + p.y * cos;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    const area = (maxX - minX) * (maxY - minY);
    if (area < bestArea) {
      bestArea = area;
      best = degrees;
    }
  }

  return best;
}

// ---------- проверка победы ----------
function computeSolved(state) {
  const squares = state.shapes.filter(s => s.type === 'square');
  if (squares.length !== 2) return false;
  return allStarsSeparated(squares);
}

function allStarsSeparated(squares) {
  const N = GRID_N;
  const cellSize = SIZE / N;
  const blocked = new Uint8Array(N * N);

  const prepared = squares.map(s => {
    const rad = s.rotation * Math.PI / 180;
    return {
      cx: s.cx,
      cy: s.cy,
      h: s.h,
      cos: Math.cos(rad),
      sin: Math.sin(rad),
    };
  });

  for (let row = 0; row < N; row++) {
    const y = (row + 0.5) * cellSize;
    for (let col = 0; col < N; col++) {
      const x = (col + 0.5) * cellSize;

      // граница поля — тоже стена
      if (x < WALL_HALF || x > SIZE - WALL_HALF || y < WALL_HALF || y > SIZE - WALL_HALF) {
        blocked[row * N + col] = 1;
        continue;
      }

      for (const square of prepared) {
        if (distanceToSquareBoundary(x, y, square) <= WALL_HALF) {
          blocked[row * N + col] = 1;
          break;
        }
      }
    }
  }

  const labels = new Int32Array(N * N);
  const stack = [];
  let nextLabel = 0;

  for (let row = 0; row < N; row++) {
    for (let col = 0; col < N; col++) {
      const start = row * N + col;
      if (blocked[start] || labels[start]) continue;

      nextLabel++;
      labels[start] = nextLabel;
      stack.push(start);

      while (stack.length) {
        const current = stack.pop();
        const c = current % N;
        const r = (current - c) / N;

        if (c > 0) {
          const next = current - 1;
          if (!blocked[next] && !labels[next]) {
            labels[next] = nextLabel;
            stack.push(next);
          }
        }
        if (c < N - 1) {
          const next = current + 1;
          if (!blocked[next] && !labels[next]) {
            labels[next] = nextLabel;
            stack.push(next);
          }
        }
        if (r > 0) {
          const next = current - N;
          if (!blocked[next] && !labels[next]) {
            labels[next] = nextLabel;
            stack.push(next);
          }
        }
        if (r < N - 1) {
          const next = current + N;
          if (!blocked[next] && !labels[next]) {
            labels[next] = nextLabel;
            stack.push(next);
          }
        }
      }
    }
  }

  const starLabels = new Set();
  for (const star of STARS) {
    const col = Math.min(N - 1, Math.floor(star.x / SIZE * N));
    const row = Math.min(N - 1, Math.floor(star.y / SIZE * N));
    const index = row * N + col;

    if (blocked[index]) return false;
    const label = labels[index];
    if (!label) return false;
    starLabels.add(label);
  }

  return starLabels.size === STARS.length;
}

function distanceToSquareBoundary(x, y, square) {
  const dx = x - square.cx;
  const dy = y - square.cy;
  const lx = dx * square.cos + dy * square.sin;
  const ly = -dx * square.sin + dy * square.cos;
  const ax = Math.abs(lx);
  const ay = Math.abs(ly);

  if (ax <= square.h && ay <= square.h) {
    return square.h - Math.max(ax, ay);
  }

  const ox = Math.max(ax - square.h, 0);
  const oy = Math.max(ay - square.h, 0);
  return Math.hypot(ox, oy);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

module.exports = {
  id: 'separate',
  title: 'Раздели звёзды',
  description: 'Нарисуй два квадрата так, чтобы отделить элементы друг от друга',
  help: 'Замкнутый штрих становится ровным квадратом, незамкнутый — прямой. Граница поля тоже считается стеной.',
  size: SIZE,
  createState,
  applyMove,
  isSolved,
  publicState,
  playerProgress,
  getHint,
};
