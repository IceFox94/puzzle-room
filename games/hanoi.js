const DISK_COUNT = 4;
const RODS = 3;

function createState() {
  const rods = [[], [], []];
  for (let size = DISK_COUNT; size >= 1; size--) rods[0].push(size);
  return { rods, moves: 0 };
}

function applyMove(state, { from, to }) {
  if (from === to) return { ok: false, error: 'Тот же стержень.' };
  if (![0, 1, 2].includes(from) || ![0, 1, 2].includes(to))
    return { ok: false, error: 'Некорректный стержень.' };

  const disk = state.rods[from][state.rods[from].length - 1];
  if (disk === undefined) return { ok: false, error: 'Здесь нет дисков.' };

  const topTo = state.rods[to][state.rods[to].length - 1];
  if (topTo !== undefined && topTo < disk)
    return { ok: false, error: 'Нельзя класть больший диск на меньший!' };

  state.rods[from].pop();
  state.rods[to].push(disk);
  state.moves++;
  return { ok: true };
}

function isSolved(state) {
  return state.rods[2].length === DISK_COUNT;
}

// то, что видит клиент
function publicState(state) {
  return { rods: state.rods, moves: state.moves, solved: isSolved(state) };
}

// прогресс конкретного игрока (для админки)
function playerProgress(state, player) {
  return { moves: player.moves, firstWinAt: player.firstWinAt };
}

module.exports = {
  id: 'hanoi',
  title: 'Ханойская башня',
  diskCount: DISK_COUNT,
  createState,
  applyMove,
  isSolved,
  publicState,
  playerProgress,
};