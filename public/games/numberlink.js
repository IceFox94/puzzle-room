(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Цвета Catppuccin Mocha: подобраны так, чтобы соседние пары хорошо различались.
  const PALETTE = [
    '#f38ba8', '#89b4fa', '#a6e3a1', '#fab387',
    '#cba6f7', '#94e2d5', '#f9e2af', '#f5c2e7',
  ];

  // Доля клетки, на которую надо сдвинуть указатель, чтобы перейти в следующую.
  const SAMPLE_STEP = 0.08;

  let boardEl = null;
  let onMove = null;
  let lastState = null;
  let svg = null;
  let bgEl = null;
  let frameEl = null;
  let pathsLayer = null;
  let previewLayer = null;
  let endpointsLayer = null;
  let hintLayer = null;

  let hintIds = new Set();
  let hintTimer = null;
  let drag = null;

  function mount(el, moveCb) {
    boardEl = el;
    onMove = moveCb;
    boardEl.innerHTML = '';
    svg = null;

    if (lastState) {
      ensureBoard(lastState.size);
      render(lastState);
    }
  }

  function ensureBoard(size) {
    if (svg && svg.dataset.size === String(size)) return;

    boardEl.innerHTML = '';
    svg = svgEl('svg', {
      viewBox: `0 0 ${size} ${size}`,
      class: 'nl-svg',
    });
    svg.dataset.size = String(size);
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerCancel);

    boardEl.appendChild(svg);
    buildStatic(size);
  }

  function buildStatic(size) {
    bgEl = svgEl('rect', {
      x: 0, y: 0, width: size, height: size,
      rx: 0.08, fill: '#24273a',
    });
    svg.appendChild(bgEl);

    const grid = svgEl('g', { stroke: '#3b3d52', 'stroke-width': 0.012 });
    for (let i = 1; i < size; i++) {
      grid.appendChild(svgEl('line', { x1: i, y1: 0.04, x2: i, y2: size - 0.04 }));
      grid.appendChild(svgEl('line', { x1: 0.04, y1: i, x2: size - 0.04, y2: i }));
    }
    svg.appendChild(grid);

    frameEl = svgEl('rect', {
      x: 0.01, y: 0.01, width: size - 0.02, height: size - 0.02,
      rx: 0.08, fill: 'none', stroke: '#585b70', 'stroke-width': 0.018,
    });
    svg.appendChild(frameEl);

    pathsLayer = svgEl('g', {});
    svg.appendChild(pathsLayer);

    previewLayer = svgEl('g', {});
    svg.appendChild(previewLayer);

    endpointsLayer = svgEl('g', {});
    svg.appendChild(endpointsLayer);

    hintLayer = svgEl('g', {});
    svg.appendChild(hintLayer);
  }

  function render(state) {
    const prevMoves = lastState ? lastState.moves : null;
    lastState = state;
    if (!boardEl) return;

    if (drag && (drag.size !== state.size || (prevMoves !== null && state.moves < prevMoves))) {
      cancelDrag();
    }

    ensureBoard(state.size);

    if (state.solved) hintIds = new Set();
    if (prevMoves !== null && prevMoves > 0 && state.moves === 0) hintIds = new Set();

    pathsLayer.replaceChildren();
    previewLayer.replaceChildren();
    endpointsLayer.replaceChildren();
    hintLayer.replaceChildren();

    if (bgEl) bgEl.setAttribute('fill', state.solved ? '#26332f' : '#24273a');
    if (frameEl) frameEl.setAttribute('stroke', state.solved ? '#a6e3a1' : '#585b70');

    for (const pair of state.pairs) {
      const path = state.paths[pair.id];
      if (Array.isArray(path) && path.length >= 2) {
        drawLine(pathsLayer, path, colorFor(pair.id), state.size);
      }
    }

    for (const pair of state.pairs) {
      drawEndpoint(pair, colorFor(pair.id), state.size);
    }

    for (const pair of state.pairs) {
      if (!hintIds.has(pair.id)) continue;
      drawHintRing(pair.a, state.size);
      drawHintRing(pair.b, state.size);
    }

    if (drag) renderPreview();
  }

  function colorFor(id) {
    return PALETTE[(id - 1) % PALETTE.length];
  }

  function center(cell, size) {
    return {
      x: (cell % size) + 0.5,
      y: Math.floor(cell / size) + 0.5,
    };
  }

  function drawLine(layer, path, color, size) {
    const points = path.map(cell => {
      const p = center(cell, size);
      return `${p.x},${p.y}`;
    }).join(' ');

    const common = {
      points,
      fill: 'none',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    };

    layer.appendChild(svgEl('polyline', {
      ...common, stroke: '#1e1e2e', 'stroke-width': 0.30,
    }));
    layer.appendChild(svgEl('polyline', {
      ...common, stroke: color, 'stroke-width': 0.19,
    }));
    layer.appendChild(svgEl('polyline', {
      ...common, stroke: '#ffffff', 'stroke-width': 0.055, opacity: 0.30,
    }));
  }

  function drawEndpoint(pair, color, size) {
    for (const cell of [pair.a, pair.b]) {
      const { x, y } = center(cell, size);

      endpointsLayer.appendChild(svgEl('circle', {
        cx: x, cy: y, r: 0.44, fill: color, opacity: 0.14,
      }));
      endpointsLayer.appendChild(svgEl('circle', {
        cx: x, cy: y, r: 0.31, fill: color,
        stroke: '#1e1e2e', 'stroke-width': 0.03,
      }));
      endpointsLayer.appendChild(svgEl('circle', {
        cx: x - 0.09, cy: y - 0.10, r: 0.07, fill: '#ffffff', opacity: 0.35,
      }));

      const text = svgEl('text', {
        x, y: y + 0.01,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        'font-family': 'system-ui, sans-serif',
        'font-size': 0.40,
        'font-weight': 700,
        fill: '#1e1e2e',
      });
      text.textContent = String(pair.id);
      endpointsLayer.appendChild(text);
    }
  }

  function drawHintRing(cell, size) {
    const { x, y } = center(cell, size);
    hintLayer.appendChild(svgEl('circle', {
      cx: x, cy: y, r: 0.46,
      fill: 'none',
      stroke: '#f9e2af',
      'stroke-width': 0.04,
      'stroke-dasharray': '0.12 0.09',
      class: 'nl-hint-ring',
    }));
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (!lastState || !svg) return;

    const cell = cellFromEvent(event);
    if (cell === null) return;

    const pair = lastState.pairs.find(p => p.a === cell || p.b === cell);
    if (!pair) return;

    event.preventDefault();

    drag = {
      id: pair.id,
      target: cell === pair.a ? pair.b : pair.a,
      path: [cell],
      size: lastState.size,
      pointerId: event.pointerId,
      lastPoint: pointFromEvent(event),
      moved: false,
      blocked: false,
      done: false,
    };

    try {
      svg.setPointerCapture(event.pointerId);
    } catch (_) {
      // pointer capture не критичен
    }

    renderPreview();
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();

    const point = pointFromEvent(event);
    extendDrag(point);
    drag.lastPoint = point;
    renderPreview();
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();

    const point = pointFromEvent(event);
    extendDrag(point);
    finishDrag();
  }

  function onPointerCancel() {
    if (!drag) return;
    cancelDrag();
  }

  function extendDrag(point) {
    if (!drag || drag.blocked || drag.done) return;

    const lastPoint = drag.lastPoint;
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / SAMPLE_STEP));

    for (let i = 1; i <= steps; i++) {
      if (drag.blocked || drag.done) break;
      const t = i / steps;
      const x = lastPoint.x + dx * t;
      const y = lastPoint.y + dy * t;
      const cell = cellFromPoint(x, y, drag.size);
      tryAppend(cell, x, y);
    }
  }

  function tryAppend(cell, x, y) {
    if (!drag || drag.blocked || drag.done) return;

    const size = drag.size;
    const path = drag.path;
    const last = path[path.length - 1];

    if (cell === last || path.includes(cell)) return;

    const lastRow = Math.floor(last / size);
    const lastCol = last % size;
    const row = Math.floor(cell / size);
    const col = cell % size;
    const dr = Math.abs(row - lastRow);
    const dc = Math.abs(col - lastCol);

    if (dr + dc === 1) {
      pushCell(cell);
      return;
    }

    // Указатель может перескочить по диагонали. Добавляем промежуточную клетку,
    // чтобы линия оставалась ортогональной.
    if (dr === 1 && dc === 1) {
      const horizontalFirst = lastRow * size + col;
      const verticalFirst = row * size + lastCol;
      const moveX = Math.abs(x - drag.lastPoint.x);
      const moveY = Math.abs(y - drag.lastPoint.y);
      const candidates = moveX > moveY
        ? [horizontalFirst, verticalFirst]
        : [verticalFirst, horizontalFirst];

      const forbidden = forbiddenCells(drag.id);

      for (const candidate of candidates) {
        if (path.includes(candidate) || forbidden.has(candidate)) continue;
        pushCell(candidate);
        if (!drag.blocked && !drag.done) pushCell(cell);
        return;
      }

      pushCell(candidates[0]);
    }
  }

  function pushCell(cell) {
    if (!drag || drag.blocked || drag.done) return;

    const path = drag.path;
    const last = path[path.length - 1];
    if (cell === last || path.includes(cell)) return;
    if (!isAdjacent(last, cell, drag.size)) return;

    path.push(cell);
    drag.moved = true;

    if (forbiddenCells(drag.id).has(cell)) {
      drag.blocked = true;
      return;
    }

    if (cell === drag.target) {
      drag.done = true;
    }
  }

  function finishDrag() {
    if (!drag) return;

    const current = drag;
    releaseCapture(current.pointerId);
    drag = null;
    if (previewLayer) previewLayer.replaceChildren();

    if (current.done) {
      onMove({ id: current.id, path: current.path.slice() });
      return;
    }

    if (current.moved) {
      if (current.blocked) {
        localMessage('Линия не должна пересекать другие линии и цифры.', '#f38ba8');
      } else {
        localMessage('Линия должна соединять одинаковые цифры.', '#f38ba8');
      }
      return;
    }

    if (lastState && lastState.paths[current.id]) {
      onMove({ clear: current.id });
    }
  }

  function cancelDrag() {
    if (!drag) return;
    releaseCapture(drag.pointerId);
    drag = null;
    if (previewLayer) previewLayer.replaceChildren();
  }

  function releaseCapture(pointerId) {
    if (pointerId == null || !svg) return;
    try {
      svg.releasePointerCapture(pointerId);
    } catch (_) {
      // уже отпущен
    }
  }

  function renderPreview() {
    if (!previewLayer) return;
    previewLayer.replaceChildren();
    if (!drag || drag.path.length < 2) return;

    const color = drag.blocked ? '#f38ba8' : colorFor(drag.id);
    drawLine(previewLayer, drag.path, color, drag.size);

    if (!drag.done) {
      const last = drag.path[drag.path.length - 1];
      const p = center(last, drag.size);
      previewLayer.appendChild(svgEl('circle', {
        cx: p.x, cy: p.y, r: 0.11,
        fill: '#ffffff', opacity: 0.55, 'pointer-events': 'none',
      }));
    }
  }

  function forbiddenCells(id) {
    const forbidden = new Set();
    if (!lastState) return forbidden;

    for (const pair of lastState.pairs) {
      if (pair.id === id) continue;
      forbidden.add(pair.a);
      forbidden.add(pair.b);

      const path = lastState.paths[pair.id];
      if (Array.isArray(path)) {
        for (const cell of path) forbidden.add(cell);
      }
    }

    return forbidden;
  }

  function isAdjacent(a, b, size) {
    const ar = Math.floor(a / size);
    const ac = a % size;
    const br = Math.floor(b / size);
    const bc = b % size;
    return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
  }

  function cellFromEvent(event) {
    if (!svg || !lastState) return null;
    const point = pointFromEvent(event);
    return cellFromPoint(point.x, point.y, lastState.size);
  }

  function cellFromPoint(x, y, size) {
    const col = clamp(Math.floor(x), 0, size - 1);
    const row = clamp(Math.floor(y), 0, size - 1);
    return row * size + col;
  }

  function pointFromEvent(event) {
    const rect = svg.getBoundingClientRect();
    const size = Number(svg.dataset.size);
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * size, 0, size - 1e-6),
      y: clamp(((event.clientY - rect.top) / rect.height) * size, 0, size - 1e-6),
    };
  }

  function showHint(hint) {
    hintIds = new Set((hint && hint.pairs) || []);

    if (hintTimer) clearTimeout(hintTimer);
    hintTimer = null;

    if (hintIds.size) {
      hintTimer = setTimeout(() => {
        hintTimer = null;
        hintIds = new Set();
        if (lastState) render(lastState);
      }, 6000);
    }

    if (lastState) render(lastState);
  }

  function localMessage(text, color) {
    if (typeof window.showMsg === 'function') window.showMsg(text, color);
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const key in attrs) el.setAttribute(key, attrs[key]);
    return el;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  window.PuzzleGames = window.PuzzleGames || {};
  window.PuzzleGames.numberlink = {
    title: 'Номерлинк',
    description: 'Соедини одинаковые цифры линиями, не пересекая их и заполнив всё поле.',
    help: 'Веди линию от одной цифры до другой. Нажми на цифру, чтобы стереть её линию. Все клетки поля должны быть заняты.',
    mount,
    render,
    showHint,
  };
})();
