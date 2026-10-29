(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const VIEW_MIN = -0.5;
  const VIEW_SIZE = 4;
  const SIZE = 3;

  const STARS = [];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      STARS.push({ x: col + 0.5, y: row + 0.5 });
    }
  }

  let boardEl = null;
  let onMove = null;
  let lastState = null;
  let svg = null;
  let shapesLayer = null;
  let previewLine = null;

  let drawing = false;
  let pointerId = null;
  let points = [];

  function mount(el, moveCb) {
    boardEl = el;
    onMove = moveCb;
    boardEl.innerHTML = '';

    svg = svgEl('svg', {
      viewBox: `${VIEW_MIN} ${VIEW_MIN} ${VIEW_SIZE} ${VIEW_SIZE}`,
      class: 'sep-svg',
    });
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerCancel);

    boardEl.appendChild(svg);
    buildStatic();

    if (lastState) render(lastState);
  }

  function buildStatic() {
    svg.appendChild(svgEl('rect', {
      x: VIEW_MIN, y: VIEW_MIN, width: VIEW_SIZE, height: VIEW_SIZE,
      rx: 0.12, fill: '#292a3a',
    }));

    const grid = svgEl('g', { stroke: '#45475a', 'stroke-width': 0.012 });
    for (let i = 0; i <= SIZE; i++) {
      grid.appendChild(svgEl('line', { x1: i, y1: 0, x2: i, y2: SIZE }));
      grid.appendChild(svgEl('line', { x1: 0, y1: i, x2: SIZE, y2: i }));
    }
    svg.appendChild(grid);

    svg.appendChild(svgEl('rect', {
      x: 0, y: 0, width: SIZE, height: SIZE,
      fill: 'none', stroke: '#6c7086', 'stroke-width': 0.03, rx: 0.03,
    }));

    const stars = svgEl('g', { fill: '#f9e2af' });
    for (const star of STARS) {
      stars.appendChild(svgEl('path', { d: starPath(star.x, star.y, 0.17, 0.072) }));
    }
    svg.appendChild(stars);

    shapesLayer = svgEl('g', {});
    svg.appendChild(shapesLayer);

    previewLine = svgEl('polyline', {
      fill: 'none',
      stroke: '#f9e2af',
      'stroke-width': 0.035,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: 0.75,
      'pointer-events': 'none',
    });
    previewLine.style.display = 'none';
    svg.appendChild(previewLine);
  }

  function render(state) {
    lastState = state;
    if (!svg || !shapesLayer) return;

    shapesLayer.innerHTML = '';
    const solved = !!state.solved;
    const squareColor = solved ? '#a6e3a1' : '#89b4fa';

    for (const shape of state.shapes) {
      if (shape.type === 'line') {
        shapesLayer.appendChild(svgEl('line', {
          x1: shape.x1, y1: shape.y1, x2: shape.x2, y2: shape.y2,
          stroke: '#7f849c',
          'stroke-width': 0.03,
          'stroke-linecap': 'round',
        }));
      } else if (shape.type === 'square') {
        shapesLayer.appendChild(svgEl('polygon', {
          points: squarePoints(shape),
          fill: 'none',
          stroke: squareColor,
          'stroke-width': 0.045,
          'stroke-linejoin': 'round',
        }));
      }
    }
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    event.preventDefault();

    drawing = true;
    pointerId = event.pointerId;
    points = [toBoard(event)];
    previewLine.setAttribute('points', pointsString(points));
    previewLine.style.display = '';

    try {
      svg.setPointerCapture(pointerId);
    } catch (_) {
      // pointer capture не критичен
    }
  }

  function onPointerMove(event) {
    if (!drawing || event.pointerId !== pointerId) return;
    event.preventDefault();

    const point = toBoard(event);
    const last = points[points.length - 1];
    if (Math.hypot(point.x - last.x, point.y - last.y) < 0.015) return;

    points.push(point);
    previewLine.setAttribute('points', pointsString(points));
  }

  function onPointerUp(event) {
    if (!drawing || event.pointerId !== pointerId) return;
    event.preventDefault();

    const point = toBoard(event);
    const last = points[points.length - 1];
    if (Math.hypot(point.x - last.x, point.y - last.y) >= 0.015) {
      points.push(point);
    }

    finishStroke();
  }

  function onPointerCancel() {
    if (!drawing) return;
    finishStroke(false);
  }

  function finishStroke(send = true) {
    drawing = false;
    if (pointerId !== null) {
      try {
        svg.releasePointerCapture(pointerId);
      } catch (_) {
        // уже отпущен
      }
      pointerId = null;
    }

    previewLine.style.display = 'none';
    previewLine.setAttribute('points', '');

    if (send && points.length >= 2) {
      onMove({
        points: points.map(p => ({ x: round3(p.x), y: round3(p.y) })),
      });
    }
    points = [];
  }

  function toBoard(event) {
    const rect = svg.getBoundingClientRect();
    const x = VIEW_MIN + ((event.clientX - rect.left) / rect.width) * VIEW_SIZE;
    const y = VIEW_MIN + ((event.clientY - rect.top) / rect.height) * VIEW_SIZE;
    return {
      x: clamp(x, VIEW_MIN, VIEW_MIN + VIEW_SIZE),
      y: clamp(y, VIEW_MIN, VIEW_MIN + VIEW_SIZE),
    };
  }

  function pointsString(list) {
    return list.map(p => `${round3(p.x)},${round3(p.y)}`).join(' ');
  }

  function squarePoints(square) {
    const rad = square.rotation * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const h = square.h;

    return [[-h, -h], [h, -h], [h, h], [-h, h]]
      .map(([x, y]) => {
        const rx = x * cos - y * sin + square.cx;
        const ry = x * sin + y * cos + square.cy;
        return `${round3(rx)},${round3(ry)}`;
      })
      .join(' ');
  }

  function starPath(cx, cy, outer, inner) {
    let d = '';
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      d += (i === 0 ? 'M' : 'L') + round3(x) + ' ' + round3(y);
    }
    return d + 'Z';
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const key in attrs) el.setAttribute(key, attrs[key]);
    return el;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function round3(value) {
    return Math.round(value * 1000) / 1000;
  }

  window.PuzzleGames = window.PuzzleGames || {};
  window.PuzzleGames.separate = {
    title: 'Раздели звёзды',
    description: 'Нарисуй два квадрата так, чтобы отделить элементы друг от друга',
    help: 'Замкнутый штрих становится ровным квадратом, незамкнутый — прямой. Граница поля тоже считается стеной.',
    mount,
    render,
  };
})();
