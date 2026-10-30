// Готовые поля Numberlink, разложенные по сложности.
// Каждая пара — это две клетки-конца одной линии.
// Клетки пронумерованы по строкам: index = row * size + col.
const PUZZLES = {
  easy: [
    { size: 8, pairs: [[52, 54], [62, 46], [38, 30], [26, 40], [48, 58], [59, 42], [12, 35], [34, 49], [13, 10], [29, 14], [43, 20], [9, 18]] },
    { size: 8, pairs: [[4, 21], [13, 22], [11, 10], [17, 8], [16, 48], [56, 41], [33, 43], [51, 58], [59, 53], [52, 47], [55, 46], [25, 5]] },
    { size: 8, pairs: [[21, 23], [59, 50], [51, 57], [56, 25], [33, 18], [4, 6], [19, 44], [52, 37], [7, 11], [54, 20], [31, 60], [17, 3]] },
    { size: 8, pairs: [[18, 25], [5, 7], [15, 13], [21, 31], [59, 41], [42, 46], [45, 28], [36, 43], [9, 4], [26, 10], [30, 60], [35, 56]] },
  ],
  medium: [
    { size: 8, pairs: [[18, 3], [4, 21], [22, 5], [29, 33], [45, 54], [48, 51], [6, 39], [25, 37], [46, 58], [16, 10]] },
    { size: 8, pairs: [[47, 28], [13, 15], [7, 5], [61, 63], [55, 46], [38, 30], [45, 51], [1, 25], [42, 2], [24, 50]] },
    { size: 8, pairs: [[59, 53], [52, 54], [62, 39], [12, 14], [22, 36], [28, 19], [51, 42], [38, 4], [50, 16], [25, 8]] },
    { size: 8, pairs: [[22, 20], [12, 27], [26, 10], [14, 15], [55, 51], [41, 16], [52, 46], [23, 47], [35, 13], [49, 29]] },
  ],
  hard: [
    { size: 9, pairs: [[47, 50], [36, 19], [18, 11], [35, 34], [53, 61], [60, 71], [80, 68], [13, 30], [2, 14], [23, 52], [54, 49], [67, 56]] },
    { size: 9, pairs: [[55, 74], [49, 22], [59, 51], [52, 68], [44, 7], [16, 33], [38, 27], [39, 2], [72, 36], [65, 48], [77, 53], [50, 10]] },
    { size: 9, pairs: [[17, 12], [32, 39], [48, 59], [76, 63], [54, 65], [66, 37], [36, 9], [0, 29], [62, 34], [23, 8], [40, 79], [50, 67]] },
    { size: 9, pairs: [[62, 79], [67, 69], [70, 58], [14, 13], [12, 11], [42, 31], [40, 29], [54, 74], [73, 64], [10, 38], [37, 78], [35, 15]] },
  ],
  expert: [
    { size: 9, pairs: [[72, 45], [46, 73], [74, 66], [61, 51], [48, 39], [40, 20], [3, 14], [57, 13], [42, 44], [9, 18], [16, 67]] },
    { size: 9, pairs: [[59, 69], [70, 76], [26, 16], [15, 3], [39, 57], [37, 18], [43, 50], [9, 22], [36, 56], [67, 62], [2, 38]] },
    { size: 9, pairs: [[36, 18], [38, 12], [11, 4], [80, 59], [57, 64], [47, 30], [41, 66], [50, 34], [5, 25], [73, 9], [61, 32]] },
    { size: 9, pairs: [[42, 62], [71, 76], [67, 57], [33, 40], [16, 9], [41, 60], [66, 34], [54, 13], [6, 43], [20, 55]] },
  ],
};

const DIFFICULTIES = {
  easy: { label: 'Лёгкая', size: 8, pairs: 12 },
  medium: { label: 'Средняя', size: 8, pairs: 10 },
  hard: { label: 'Сложная', size: 9, pairs: 12 },
  expert: { label: 'Эксперт', size: 9, pairs: '10–11' },
};
const DEFAULT_DIFFICULTY = 'medium';
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'expert'];

function isDifficulty(value) {
  return typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(PUZZLES, value);
}

function normalizeDifficulty(value) {
  return isDifficulty(value) ? value : DEFAULT_DIFFICULTY;
}

function difficultyOptions() {
  return DIFFICULTY_ORDER.map(id => ({
    id,
    label: DIFFICULTIES[id].label,
    size: DIFFICULTIES[id].size,
    pairs: DIFFICULTIES[id].pairs,
  }));
}

function createState(options) {
  const requested = options && typeof options === 'object'
    ? options.difficulty
    : options;
  const difficulty = normalizeDifficulty(requested);
  const pool = PUZZLES[difficulty];
  const puzzle = pool[Math.floor(Math.random() * pool.length)];
  return {
    size: puzzle.size,
    difficulty,
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
    difficulty: normalizeDifficulty(state.difficulty),
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
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  DEFAULT_DIFFICULTY,
  isDifficulty,
  difficultyOptions,
  createState,
  applyMove,
  isSolved,
  publicState,
  playerProgress,
  getHint,
};
