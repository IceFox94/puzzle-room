(function () {
  let boardEl = null;
  let onMove = null;
  let lastState = null;
  let hintCells = new Set(); // "r:c"

  function mount(el, moveCb) {
    boardEl = el;
    onMove = moveCb;
    boardEl.innerHTML = '';
  }

  function render(state) {
    lastState = state;
    if (!boardEl) return;
    const size = state.size;
    let gridEl = boardEl.querySelector('.lo-grid');
    if (!gridEl || gridEl.dataset.size !== String(size)) {
      boardEl.innerHTML = '';
      gridEl = document.createElement('div');
      gridEl.className = 'lo-grid';
      gridEl.dataset.size = size;
      gridEl.style.gridTemplateColumns = `repeat(${size}, 52px)`;
      boardEl.appendChild(gridEl);
    }
    gridEl.innerHTML = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        const isHint = hintCells.has(`${r}:${c}`);
        cell.className = 'lo-cell'
          + (state.grid[r][c] ? ' on' : '')
          + (isHint ? ' hint' : '');
        cell.addEventListener('click', () => {
          hintCells.clear();
          onMove({ row: r, col: c });
        });
        gridEl.appendChild(cell);
      }
    }
  }

  function showHint(hint) {
    hintCells.clear();
    if (hint.presses) for (const [r, c] of hint.presses) hintCells.add(`${r}:${c}`);
    if (hint.firstRowPresses)
      for (const [r, c] of hint.firstRowPresses) hintCells.add(`${r}:${c}`);
    if (lastState) render(lastState);
  }

  window.PuzzleGames = window.PuzzleGames || {};
  window.PuzzleGames.lightsout = { title: 'Погаси свет', mount, render, showHint };
})();