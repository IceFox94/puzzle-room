// Готовые поля Numberlink. Каждая пара — это две клетки-конца одной линии.
// Клетки пронумерованы по строкам: index = row * size + col.
const PUZZLES = [
  // 5x5
  { size: 5, pairs: [[3, 0], [7, 4], [12, 6], [23, 17], [24, 14]] },
  { size: 5, pairs: [[2, 0], [7, 18], [12, 10], [20, 17], [23, 3]] },
  { size: 5, pairs: [[3, 0], [4, 8], [5, 12], [18, 21], [19, 22]] },
  // 6x6
  { size: 6, pairs: [[0, 20], [5, 3], [7, 24], [26, 13], [29, 16], [35, 30]] },
  { size: 6, pairs: [[5, 35], [12, 2], [13, 16], [14, 27], [22, 32], [26, 18]] },
  { size: 6, pairs: [[13, 21], [15, 2], [23, 5], [24, 7], [26, 30], [32, 27]] },
  // 7x7
  { size: 7, pairs: [[3, 8], [19, 34], [20, 4], [21, 29], [28, 46], [36, 16], [47, 39]] },
  { size: 7, pairs: [[0, 9], [6, 10], [14, 23], [19, 27], [32, 42], [34, 17], [43, 48]] },
  { size: 7, pairs: [[4, 0], [11, 25], [12, 48], [21, 30], [22, 28], [33, 46], [37, 9]] },
];

function createState() {
  const puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
  return {
    size: puzzle.size,
    pairs: puzzle.pairs.map(([a, b], index) => ({ id: index + 1, a, b })),
    paths: {},
    moves: 0,
    solved: false,
  };
}

function applyMove(state, payload) {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'Некорректный ход.' };
  }

  if (payload.clear != null) {
    return clearPath(state, payload.clear);
  }

  const id = Number(payload.id);
  const pair = state.pairs.find(p => p.id === id);
  if (!pair) return { ok: false, error: 'Неизвестная линия.' };

  if (!Array.isArray(payload.path)) {
    return { ok: false, error: 'Некорректная линия.' };
  }

  const path = payload.path;
  const total = state.size * state.size;

  if (path.length < 2 || path.length > total) {
    return { ok: false, error: 'Некорректная линия.' };
  }

  if (!path.every(cell => Number.isInteger(cell) && cell >= 0 && cell < total)) {
    return { ok: false, error: 'Некорректная линия.' };
  }

  if (new Set(path).size !== path.length) {
    return { ok: false, error: 'Линия пересекает саму себя.' };
  }

  if (!isAdjacentPath(path, state.size)) {
    return { ok: false, error: 'Линия должна идти по соседним клеткам.' };
  }

  const startsAtA = path[0] === pair.a && path[path.length - 1] === pair.b;
  const startsAtB = path[0] === pair.b && path[path.length - 1] === pair.a;
  if (!startsAtA && !startsAtB) {
    return { ok: false, error: 'Линия должна соединять обе одинаковые цифры.' };
  }

  const forbidden = new Set();
  for (const other of state.pairs) {
    if (other.id === id) continue;
    forbidden.add(other.a);
    forbidden.add(other.b);
    const otherPath = state.paths[other.id];
    if (otherPath) {
      for (const cell of otherPath) forbidden.add(cell);
    }
  }

  if (path.some(cell => forbidden.has(cell))) {
    return { ok: false, error: 'Линии не должны пересекаться и проходить через чужие цифры.' };
  }

  state.paths[id] = path.slice();
  state.moves++;
  state.solved = computeSolved(state);
  return { ok: true };
}

function clearPath(state, rawId) {
  const id = Number(rawId);
  const pair = state.pairs.find(p => p.id === id);
  if (!pair) return { ok: false, error: 'Неизвестная линия.' };

  if (!state.paths[id]) return { ok: true };

  delete state.paths[id];
  state.moves++;
  state.solved = computeSolved(state);
  return { ok: true };
}

function isAdjacentPath(path, size) {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const ar = Math.floor(a / size);
    const ac = a % size;
    const br = Math.floor(b / size);
    const bc = b % size;
    if (Math.abs(ar - br) + Math.abs(ac - bc) !== 1) return false;
  }
  return true;
}

function computeSolved(state) {
  const total = state.size * state.size;
  const covered = new Set();

  for (const pair of state.pairs) {
    const path = state.paths[pair.id];
    if (!pathConnects(pair, path, state.size)) return false;

    for (const cell of path) {
      if (covered.has(cell)) return false;
      covered.add(cell);
    }
  }

  return covered.size === total;
}

function pathConnects(pair, path, size) {
  if (!Array.isArray(path) || path.length < 2) return false;

  const ends = (path[0] === pair.a && path[path.length - 1] === pair.b)
    || (path[0] === pair.b && path[path.length - 1] === pair.a);
  if (!ends) return false;

  const total = size * size;
  const seen = new Set();

  for (let i = 0; i < path.length; i++) {
    const cell = path[i];
    if (!Number.isInteger(cell) || cell < 0 || cell >= total) return false;
    if (seen.has(cell)) return false;
    seen.add(cell);

    if (i > 0) {
      const a = path[i - 1];
      const b = cell;
      const ar = Math.floor(a / size);
      const ac = a % size;
      const br = Math.floor(b / size);
      const bc = b % size;
      if (Math.abs(ar - br) + Math.abs(ac - bc) !== 1) return false;
    }
  }

  return true;
}

function isSolved(state) {
  return !!state.solved;
}

function publicState(state) {
  return {
    size: state.size,
    pairs: state.pairs,
    paths: state.paths,
    moves: state.moves,
    solved: isSolved(state),
  };
}

function playerProgress(state, player) {
  return { moves: player.moves, firstWinAt: player.firstWinAt };
}

function getHint(state, playerMoves) {
  if (isSolved(state)) return null;

  const connected = state.pairs.filter(p => state.paths[p.id]);

  if (connected.length === 0) {
    return {
      message: 'Начни с любой пары и веди линию от одной цифры до другой.',
    };
  }

  if (connected.length === state.pairs.length) {
    return {
      message: 'Все пары соединены, но остались свободные клетки. Проведи линии через них.',
    };
  }

  if (playerMoves >= 6) {
    const remaining = state.pairs
      .filter(p => !state.paths[p.id])
      .map(p => p.id);

    return {
      pairs: remaining,
      message: `Осталось соединить пары: ${remaining.join(', ')}.`,
    };
  }

  return null;
}

module.exports = {
  id: 'numberlink',
  title: 'Номерлинк',
  description: 'Соедини одинаковые цифры линиями, не пересекая их и заполнив всё поле.',
  help: 'Веди линию от одной цифры до другой. Нажми на цифру, чтобы стереть её линию. Все клетки поля должны быть заняты.',
  createState,
  applyMove,
  isSolved,
  publicState,
  playerProgress,
  getHint,
};
