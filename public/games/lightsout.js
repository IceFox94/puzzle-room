(function () {
  let boardEl = null;
  let onMove = null;
  let lastState = null;

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
        cell.className = 'lo-cell' + (state.grid[r][c] ? ' on' : '');
        cell.addEventListener('click', () => onMove({ row: r, col: c }));
        gridEl.appendChild(cell);
      }
    }
  }

  window.PuzzleGames = window.PuzzleGames || {};
  window.PuzzleGames.lightsout = { title: 'Погаси свет', mount, render };
})();