(function () {
  const COLORS = ['#f38ba8','#fab387','#f9e2af','#a6e3a1','#89b4fa','#cba6f7'];
  let selectedRod = null;
  let onMove = null;
  let boardEl = null;
  let lastState = null;

  function mount(el, moveCb) {
    boardEl = el;
    onMove = moveCb;
    boardEl.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const rod = document.createElement('div');
      rod.className = 'rod';
      rod.dataset.rod = i;
      rod.addEventListener('click', () => handleClick(i));
      boardEl.appendChild(rod);
    }
  }

  function handleClick(idx) {
    if (!lastState) return;
    if (selectedRod === null) {
      if (lastState.rods[idx].length === 0) return;
      selectedRod = idx;
      render(lastState);
    } else if (selectedRod === idx) {
      selectedRod = null;
      render(lastState);
    } else {
      onMove({ from: selectedRod, to: idx });
      selectedRod = null;
    }
  }

  function render(state) {
    lastState = state;
    if (!boardEl) return;
    const total = state.rods.flat().reduce((a, b) => Math.max(a, b), 0) || 4;
    document.querySelectorAll('.rod').forEach((el, i) => {
      el.innerHTML = '';
      el.classList.toggle('selected', selectedRod === i);
      state.rods[i].forEach((size, idx) => {
        const d = document.createElement('div');
        d.className = 'disk';
        d.style.width = (40 + size * (140 / total)) + 'px';
        d.style.background = COLORS[(size - 1) % COLORS.length];
        if (selectedRod === i && idx === state.rods[i].length - 1)
          d.style.transform = 'translateY(-8px)';
        el.appendChild(d);
      });
    });
  }

  window.PuzzleGames = window.PuzzleGames || {};
  window.PuzzleGames.hanoi = { title: 'Ханойская башня', mount, render };
})();