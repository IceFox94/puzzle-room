const SIZE = 5;

// ---------- генерация решаемой позиции ----------
function toggle(grid, r, c) {
  const dirs = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) grid[nr][nc] ^= 1;
  }
}

function createState() {
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  const presses = 6 + Math.floor(Math.random() * 5); // 6–10
  for (let i = 0; i < presses; i++) {
    toggle(grid, Math.floor(Math.random()*SIZE), Math.floor(Math.random()*SIZE));
  }
  if (grid.every(row => row.every(v => v === 0))) toggle(grid, 2, 2);
  return { grid, size: SIZE, moves: 0 };
}

function isSolved(state) {
  return state.grid.every(row => row.every(v => v === 0));
}

function applyMove(state, { row, col }) {
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE)
    return { ok: false, error: 'Некорректная клетка.' };
  toggle(state.grid, row, col);
  state.moves++;
  return { ok: true };
}

function publicState(state) {
  return { grid: state.grid, size: state.size, moves: state.moves, solved: isSolved(state) };
}

function playerProgress(state, player) {
  return { moves: player.moves, firstWinAt: player.firstWinAt };
}

// ---------- решение над GF(2) ----------
// Возвращает массив нажатий [[r,c], ...] или null, если нерешаемо.
function solveGF2(grid) {
  const n = SIZE * SIZE;
  const M = Array.from({ length: n }, () => Array(n + 1).fill(0));

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = r * SIZE + c;
      const cells = [[r,c],[r+1,c],[r-1,c],[r,c+1],[r,c-1]];
      for (const [rr, cc] of cells) {
        if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) {
          M[i][rr * SIZE + cc] = 1;
        }
      }
      M[i][n] = grid[r][c];
    }
  }

  let row = 0;
  const pivotCol = [];
  for (let col = 0; col < n && row < n; col++) {
    let sel = -1;
    for (let r = row; r < n; r++) {
      if (M[r][col] === 1) { sel = r; break; }
    }
    if (sel === -1) continue;
    [M[row], M[sel]] = [M[sel], M[row]];
    for (let r = 0; r < n; r++) {
      if (r !== row && M[r][col] === 1) {
        for (let k = col; k <= n; k++) M[r][k] ^= M[row][k];
      }
    }
    pivotCol.push(col);
    row++;
  }

  for (let r = row; r < n; r++) {
    let any = false;
    for (let c = 0; c < n; c++) if (M[r][c]) { any = true; break; }
    if (!any && M[r][n] === 1) return null;
  }

  const x = Array(n).fill(0);
  for (let i = 0; i < pivotCol.length; i++) {
    x[pivotCol[i]] = M[i][n];
  }
  const presses = [];
  for (let i = 0; i < n; i++) {
    if (x[i] === 1) presses.push([Math.floor(i / SIZE), i % SIZE]);
  }
  return presses;
}

// ---------- эвристики для подсказок ----------
function isBadLastRow(grid) {
  for (let r = 0; r < SIZE - 1; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c]) return false;
  for (let c = 0; c < SIZE; c++) if (grid[SIZE - 1][c]) return true;
  return false;
}

function isChasingNotStarted(grid) {
  for (let c = 0; c < SIZE; c++) if (grid[0][c]) return true;
  return false;
}

function getHint(state, playerMoves) {
  const solved = isSolved(state);
  if (solved) return null;

  // 1) "плохая последняя строка" — приоритет
  if (isBadLastRow(state.grid)) {
    const presses = solveGF2(state.grid);
    if (presses) {
      const firstRow = presses.filter(([r]) => r === 0);
      return {
        type: 'bad-last-row',
        presses,
        firstRowPresses: firstRow,
        message: 'Ты на правильном пути! Чтобы закончить, нажми подсвеченные клетки в первой строке, затем снова прогони огни вниз.',
      };
    }
  }

  // 2) пороги по ходам
  if (playerMoves >= 150) {
    const presses = solveGF2(state.grid);
    return {
      type: 'next-move',
      presses: presses ? presses.slice(0, 1) : [],
      message: 'Подсказка: нажми подсвеченную клетку — это один из шагов решения.',
    };
  }
  if (playerMoves >= 100) {
    const presses = solveGF2(state.grid);
    return {
      type: 'next-move',
      presses: presses ? presses.slice(0, 2) : [],
      message: 'Подсказка: два нажатия из решения подсвечены.',
    };
  }
  if (playerMoves >= 50) {
    const presses = solveGF2(state.grid);
    return {
      type: 'next-move',
      presses: presses ? presses.slice(0, 3) : [],
      message: 'Подсказка: три нажатия из решения подсвечены.',
    };
  }
  if (playerMoves >= 30) {
    if (isChasingNotStarted(state.grid)) {
      return {
        type: 'chase-start',
        message: 'Совет: начни с верхней строки — для каждой горящей клетки нажимай клетку прямо под ней. Так ты погасишь строку за строкой.',
      };
    }
    const presses = solveGF2(state.grid);
    return {
      type: 'next-move',
      presses: presses ? presses.slice(0, 1) : [],
      message: 'Подсказка: одно нажатие из решения подсвечено.',
    };
  }

  return null;
}

module.exports = {
  id: 'lightsout',
  title: 'Погаси свет',
  size: SIZE,
  createState,
  applyMove,
  isSolved,
  publicState,
  playerProgress,
  getHint,
};