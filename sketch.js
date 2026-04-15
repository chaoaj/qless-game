let GRID = 10;
let dice = [];
let faces = [
  'LRWDFL',
  'OEAEAO',
  'WPTHTH',
  'BYLMLM',
  'GRGDRL',
  'MCSTCT',
  'NRHRNH',
  'IOEUAU',
  'NKZSBX',
  'TJCDCB',
  'INYNIO',
  'VPGPKF'
];

let cellSize, gridX0, gridY0;
let draggingDie = null;

function setup() {
  // Limit canvas width to the page max (1100px) to avoid CSS scaling
  // which can produce uneven tile widths on large screens.
  createCanvas(min(windowWidth, 1100), windowHeight);
  textAlign(CENTER, CENTER);
  initGrid();
  initDice();
}

function initGrid() {
  // compute cell size to fit a centered 10x10 grid with padding
  // Use the actual canvas size (`width` and `height`) so the grid
  // always fits inside the canvas (prevents off-screen tiles on large displays).
  let pad = min(width, height) * 0.06;
  // place grid near the top of the canvas (form now below the grid)
  let topOffset = pad;
  // available space for grid within the canvas
  let availW = width - pad * 2;
  let availH = height - topOffset - pad;
  availH = max(availH, 100);
  cellSize = floor(min(availW / GRID, availH / GRID));
  // ensure some minimum
  cellSize = max(cellSize, 24);
  // origin to center horizontally and position vertically near the top (small gap)
  gridX0 = Math.max(0, (width - cellSize * GRID) / 2);
  gridY0 = topOffset + 8;
}

function initDice() {
  dice = [];
  // place dice in first rows, left to right, with spacing
  for (let i = 0; i < faces.length; i++) {
    let gx = i % GRID; // ensure in-grid
    let gy = floor(i / GRID);
    // but we want dice initially grouped near top-left; place in first 3 rows
    gx = i % 6;
    gy = floor(i / 6);
    let d = new Die(i + 1, faces[i], gx, gy);
    dice.push(d);
  }
}

class Die {
  constructor(id, face, gx, gy) {
    this.id = id;
    this.faces = face.split(''); // array of 6 chars
    this.gx = gx;
    this.gy = gy;
    this.size = cellSize * 0.95;
    this.updatePixelPos();
    this.selected = false;
    this.offsetX = 0;
    this.offsetY = 0;
    this.letter = '';
    this.roll();
  }

  updatePixelPos() {
    this.size = cellSize * 0.95;
    this.px = gridX0 + this.gx * cellSize + (cellSize - this.size) / 2;
    this.py = gridY0 + this.gy * cellSize + (cellSize - this.size) / 2;
  }

  roll() {
    if (this.faces && this.faces.length > 0) {
      this.letter = random(this.faces);
    } else {
      this.letter = '';
    }
  }

  draw() {
    push();
    translate(this.px + this.size / 2, this.py + this.size / 2);
    // shadow
    noStroke();
    fill(0, 60);
    rectMode(CENTER);
    rect(5, 7, this.size * 0.98, this.size * 0.98, 8);

    // body
    if (this.selected) {
      stroke(30, 144, 255);
      strokeWeight(3);
    } else {
      stroke(80);
      strokeWeight(1);
    }
    fill(245);
    rect(0, 0, this.size * 0.98, this.size * 0.98, 8);

    // draw single rolled letter
    noStroke();
    fill(30);
    textSize(max(18, this.size * 0.42));
    text(this.letter || '', 0, 0);

    pop();
  }

  contains(px, py) {
    return px >= this.px && px <= this.px + this.size && py >= this.py && py <= this.py + this.size;
  }

  startDrag(px, py) {
    this.selected = true;
    this.offsetX = px - this.px;
    this.offsetY = py - this.py;
    // remember original grid position in case we need to revert
    this._startGx = this.gx;
    this._startGy = this.gy;
  }

  dragTo(px, py) {
    this.px = px - this.offsetX;
    this.py = py - this.offsetY;
  }

  endDrag() {
    this.selected = false;
    // snap to nearest grid cell
    let nx = round((this.px - gridX0) / cellSize);
    let ny = round((this.py - gridY0) / cellSize);
    nx = constrain(nx, 0, GRID - 1);
    ny = constrain(ny, 0, GRID - 1);
    // if target occupied, find nearest empty cell; otherwise snap to target
    const occupied = (x, y) => dice.some(d => d !== this && d.gx === x && d.gy === y);
    if (!occupied(nx, ny)) {
      this.gx = nx;
      this.gy = ny;
    } else {
      // search outward for nearest empty cell
      let found = false;
      for (let r = 1; r < GRID && !found; r++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          for (let dy = -r; dy <= r && !found; dy++) {
            // prefer perimeter cells at this radius
            if (abs(dx) !== r && abs(dy) !== r) continue;
            let cx = nx + dx;
            let cy = ny + dy;
            if (cx < 0 || cy < 0 || cx >= GRID || cy >= GRID) continue;
            if (!occupied(cx, cy)) {
              this.gx = cx;
              this.gy = cy;
              found = true;
            }
          }
        }
      }
      // if still not found, revert to original spot
      if (!found) {
        this.gx = (this._startGx !== undefined) ? this._startGx : this.gx;
        this.gy = (this._startGy !== undefined) ? this._startGy : this.gy;
      }
    }
    this.updatePixelPos();
  }
}

function drawGrid() {
  stroke(180);
  strokeWeight(1);
  for (let i = 0; i <= GRID; i++) {
    // vertical
    line(gridX0 + i * cellSize, gridY0, gridX0 + i * cellSize, gridY0 + GRID * cellSize);
    // horizontal
    line(gridX0, gridY0 + i * cellSize, gridX0 + GRID * cellSize, gridY0 + i * cellSize);
  }
}

function draw() {
  background(250);

  // draw grid
  drawGrid();

  // draw dice (draw non-dragged first to keep dragged on top)
  for (let d of dice) {
    if (d !== draggingDie) d.draw();
  }
  if (draggingDie) draggingDie.draw();

  // instructions
  noStroke();
  fill(60);
  textSize(14);
  text('Drag dice to move. Touch and drag on mobile.', width / 2, gridY0 + GRID * cellSize + max(20, height * 0.02));

  // position any below-grid controls (Reset / Check) to sit just below the grid
  positionBelowControls();
}

function positionBelowControls() {
  if (typeof document === 'undefined') return;
  // compute the page coordinates for the grid by using the canvas DOM rect
  const canvasEl = document.querySelector && document.querySelector('canvas');
  const canvasRect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 };
  const gridLeft = Math.round(canvasRect.left + gridX0);
  const gridTop = Math.round(canvasRect.top + gridY0 + window.scrollY);
  const gridWidth = Math.round(cellSize * GRID);
  const baseTop = Math.round(gridTop + GRID * cellSize + Math.max(12, height * 0.02) + 150); // add extra 150px gap

  const controlsEl = document.getElementById('controls');
  const resetEl = document.getElementById('resetWrapper');
  const checkEl = document.getElementById('checkWrapper');
  const titleEl = document.getElementById('titleWrapper');

  // helper to apply common styles when using absolute layout
  function styleBlock(el, topPx) {
    if (!el) return;
    el.style.position = 'absolute';
    el.style.left = gridLeft + 'px';
    el.style.top = topPx + 'px';
    el.style.zIndex = 9999;
    el.style.width = gridWidth + 'px';
    el.style.maxWidth = gridWidth + 'px';
    el.style.boxSizing = 'border-box';
    el.style.whiteSpace = 'normal';
    el.style.wordBreak = 'break-word';
    el.style.padding = el.style.padding || '8px';
  }

  // helper to reset styles so element stays in normal document flow
  function resetFlow(el) {
    if (!el) return;
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.zIndex = '';
    el.style.width = '';
    el.style.maxWidth = '';
    el.style.boxSizing = '';
    el.style.whiteSpace = '';
    el.style.wordBreak = '';
    // keep any CSS padding
  }

  // On touch devices or narrow viewports, keep controls in normal flow so
  // the page can scroll to them (fixes iPad portrait where absolute
  // positioned controls can be inaccessible).
  const isTouch = (typeof navigator !== 'undefined') && (navigator.maxTouchPoints && navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
  const useAbsolute = (typeof window !== 'undefined') && (windowWidth > 900) && !isTouch;

  let curTop = baseTop;
  // position title above the grid (absolute only on wide non-touch screens)
  if (titleEl) {
    const titleSize = Math.max(18, Math.round(cellSize * 0.6));
    const h1 = titleEl.querySelector && titleEl.querySelector('h1');
    if (useAbsolute) {
      titleEl.style.position = 'absolute';
      titleEl.style.left = gridLeft + 'px';
      // place slightly above grid using canvas-relative coords
      const titleTop = Math.max(8, canvasRect.top + gridY0 - titleSize - 50 + window.scrollY);
      titleEl.style.top = titleTop + 'px';
      titleEl.style.width = gridWidth + 'px';
      titleEl.style.maxWidth = gridWidth + 'px';
      titleEl.style.boxSizing = 'border-box';
      titleEl.style.textAlign = 'center';
      titleEl.style.zIndex = 9999;
      if (h1) {
        h1.style.margin = '0';
        h1.style.fontSize = titleSize + 'px';
        h1.style.lineHeight = '1';
      }
    } else {
      // keep title in normal flow on mobile so form sits below it
      resetFlow(titleEl);
      if (h1) {
        h1.style.margin = '0';
        h1.style.fontSize = Math.max(18, Math.round(cellSize * 0.5)) + 'px';
        h1.style.lineHeight = '1.1';
      }
    }
  }
  if (controlsEl) {
    if (useAbsolute) {
      styleBlock(controlsEl, baseTop - 120); // place controls above reset/check, just under grid
      // adjust by controls height so reset/check appear below
      const crect = controlsEl.getBoundingClientRect();
      curTop = Math.round(crect.bottom) + 12;
    } else {
      // leave in document flow so page can scroll to it
      resetFlow(controlsEl);
      // let curTop continue after its normal position
      const crect = controlsEl.getBoundingClientRect();
      curTop = Math.round(crect.bottom) + 12 + window.scrollY;
    }
  }
  if (resetEl) {
    if (useAbsolute) {
      styleBlock(resetEl, curTop);
      const rrect = resetEl.getBoundingClientRect();
      curTop = Math.round(rrect.bottom) + 12;
    } else {
      resetFlow(resetEl);
      const rrect = resetEl.getBoundingClientRect();
      curTop = Math.round(rrect.bottom) + 12 + window.scrollY;
    }
  }
  if (checkEl) {
    if (useAbsolute) {
      styleBlock(checkEl, curTop);
    } else {
      resetFlow(checkEl);
    }
  }
}

function pointerX() {
  if (touches && touches.length > 0) return touches[0].x;
  return mouseX;
}

function pointerY() {
  if (touches && touches.length > 0) return touches[0].y;
  return mouseY;
}

function mousePressed() {
  let px = pointerX();
  let py = pointerY();
  // iterate from topmost to bottom to pick the top die
  for (let i = dice.length - 1; i >= 0; i--) {
    if (dice[i].contains(px, py)) {
      draggingDie = dice[i];
      // bring to top
      dice.splice(i, 1);
      dice.push(draggingDie);
      draggingDie.startDrag(px, py);
      break;
    }
  }
}

function touchStarted() {
  // Only handle touch events that start on the canvas. If the touch
  // target is a DOM control (buttons/links), leave the event alone so
  // the browser can handle clicks/taps normally (fixes iPad buttons).
  const e = arguments[0];
  if (e && e.target && e.target.tagName === 'CANVAS') {
    // prevent simulated mouse events doubling for canvas interactions
    mousePressed();
    return false;
  }
  // let the event propagate for DOM elements
  return true;
}

function mouseDragged() {
  if (draggingDie) {
    draggingDie.dragTo(pointerX(), pointerY());
  }
}

function touchMoved() {
  const e = arguments[0];
  if (e && e.target && e.target.tagName === 'CANVAS') {
    mouseDragged();
    return false;
  }
  return true;
}

function mouseReleased() {
  if (draggingDie) {
    draggingDie.endDrag();
    draggingDie = null;
  }
}

function touchEnded() {
  const e = arguments[0];
  if (e && e.target && e.target.tagName === 'CANVAS') {
    mouseReleased();
    return false;
  }
  return true;
}

function windowResized() {
  resizeCanvas(min(windowWidth, 1100), windowHeight);
  initGrid();
  // update dice pixel positions
  for (let d of dice) d.updatePixelPos();
}

function doubleClicked() {
  let px = pointerX();
  let py = pointerY();
  for (let i = dice.length - 1; i >= 0; i--) {
    if (dice[i].contains(px, py)) {
      dice[i].roll();
      break;
    }
  }
  return false;
}

// Expose a function to load 12 letters (one per die) from the page
window.loadDiceFromString = function(str) {
  if (!str || typeof str !== 'string') return false;
  // sanitize and uppercase
  let s = str.replace(/[^A-Z]/gi, '').toUpperCase();
  if (s.length !== 12) return false;
  // ensure dice exist
  if (!dice || dice.length < 12) return false;
  for (let i = 0; i < 12; i++) {
    dice[i].letter = s.charAt(i);
  }
  return true;
};

// optional: when setup finishes, enable the load button if input already has 12 letters
window.enableDiceControls = function() {
  const btn = document.getElementById && document.getElementById('loadBtn');
  const input = document.getElementById && document.getElementById('diceInput');
  if (btn && input) {
    const v = (input.value || '').replace(/[^A-Z]/gi, '');
    btn.disabled = (v.length !== 12);
  }
};

// Return current letters of the first 12 dice as a single string (A-Z)
window.getDiceLetters = function() {
  if (!dice || dice.length < 12) return '';
  let s = '';
  for (let i = 0; i < 12; i++) {
    let ch = (dice[i].letter || '').toUpperCase();
    if (!/[A-Z]/.test(ch)) ch = ' ';
    s += ch;
  }
  // remove spaces and ensure exactly 12 letters; if missing, return empty
  const only = s.replace(/[^A-Z]/g, '');
  return (only.length === 12) ? only : '';
};
