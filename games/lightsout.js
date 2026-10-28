const SIZE = 5;

function createState() {
  // стартовая конфигурация: несколько «горящих» клеток
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  // фиксированный стартовый узор, чтобы игра была решаемой
  const pattern = [
    [1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1],
  ];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      grid[r][c] = pattern[r][c];
  return { grid, size: SIZE, moves: 0 };
}

function toggle(grid, r, c) {
  const dirs = [[0,0],[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE)
      grid[nr][nc] ^= 1;
  }
}

function applyMove(state, { row, col }) {
  if (row < 0 || row >= SIZE || col < 0 || col >= SIZE)
    return { ok: false, error: 'Некорректная клетка.' };
  toggle(state.grid, row, col);
  state.moves++;
  return { ok: true };
}

function isSolved(state) {
  return state.grid.every(row => row.every(v => v === 0));
}

function publicState(state) {
  return { grid: state.grid, size: state.size, moves: state.moves, solved: isSolved(state) };
}

function playerProgress(state, player) {
  return { moves: player.moves, firstWinAt: player.firstWinAt };
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
};