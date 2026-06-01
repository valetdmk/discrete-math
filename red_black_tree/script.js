const RED = 0, BLACK = 1;
let NIL = { color: BLACK, left: null, right: null, parent: null, val: null, id: 'nil' };
NIL.left = NIL.right = NIL.parent = NIL;
let root = NIL, nodeCount = 0, highlightIds = new Set(), logEntries = [];

/* ── Tree operations ── */
function newNode(v) {
  return { val: v, color: RED, left: NIL, right: NIL, parent: NIL, id: String(++nodeCount) };
}

function leftRotate(x) {
  let y = x.right;
  x.right = y.left;
  if (y.left !== NIL) y.left.parent = x;
  y.parent = x.parent;
  if (x.parent === NIL) root = y;
  else if (x === x.parent.left) x.parent.left = y;
  else x.parent.right = y;
  y.left = x; x.parent = y;
}

function rightRotate(x) {
  let y = x.left;
  x.left = y.right;
  if (y.right !== NIL) y.right.parent = x;
  y.parent = x.parent;
  if (x.parent === NIL) root = y;
  else if (x === x.parent.right) x.parent.right = y;
  else x.parent.left = y;
  y.right = x; x.parent = y;
}

function insert(v) {
  let z = newNode(v), steps = [];
  let y = NIL, x = root;
  while (x !== NIL) { y = x; x = v < x.val ? x.left : x.right; }
  z.parent = y;
  if (y === NIL) root = z;
  else if (v < y.val) y.left = z;
  else y.right = z;

  steps.push({ ids: [z.id], type: 'insert', desc: `Вставлен узел ${v} (RED)` });
  fixInsert(z, steps);

  highlightIds = new Set(steps.flatMap(s => s.ids));
  addLog('insert', `insert(${v})`, steps);
  render();
}

function fixInsert(z, steps) {
  while (z.parent.color === RED) {
    if (z.parent === z.parent.parent.left) {
      let y = z.parent.parent.right;
      if (y.color === RED) {
        steps.push({ ids: [z.parent.id, y.id, z.parent.parent.id], type: 'recolor',
          desc: `Перекраска: ${z.parent.val},${y.val}→BLACK; ${z.parent.parent.val}→RED` });
        z.parent.color = BLACK; y.color = BLACK; z.parent.parent.color = RED;
        z = z.parent.parent;
      } else {
        if (z === z.parent.right) {
          z = z.parent;
          steps.push({ ids: [z.id], type: 'rotate', desc: `Левый поворот на ${z.val}` });
          leftRotate(z);
        }
        z.parent.color = BLACK; z.parent.parent.color = RED;
        steps.push({ ids: [z.parent.id, z.parent.parent ? z.parent.parent.id : ''], type: 'rotate',
          desc: `Правый поворот на ${z.parent.parent ? z.parent.parent.val : 'root'}` });
        rightRotate(z.parent.parent);
      }
    } else {
      let y = z.parent.parent.left;
      if (y.color === RED) {
        steps.push({ ids: [z.parent.id, y.id, z.parent.parent.id], type: 'recolor',
          desc: `Перекраска: ${z.parent.val},${y.val}→BLACK; ${z.parent.parent.val}→RED` });
        z.parent.color = BLACK; y.color = BLACK; z.parent.parent.color = RED;
        z = z.parent.parent;
      } else {
        if (z === z.parent.left) {
          z = z.parent;
          steps.push({ ids: [z.id], type: 'rotate', desc: `Правый поворот на ${z.val}` });
          rightRotate(z);
        }
        z.parent.color = BLACK; z.parent.parent.color = RED;
        steps.push({ ids: [z.parent.id], type: 'rotate',
          desc: `Левый поворот на ${z.parent.parent ? z.parent.parent.val : 'root'}` });
        leftRotate(z.parent.parent);
      }
    }
  }
  root.color = BLACK;
}

/* ── Export ── */
function treeToJSON(node) {
  if (node === NIL) return null;
  return { val: node.val, color: node.color === RED ? 'RED' : 'BLACK',
    left: treeToJSON(node.left), right: treeToJSON(node.right) };
}

function exportTree() {
  const j = JSON.stringify(treeToJSON(root), null, 2);
  addLog('export', 'exportTree()', [{ ids: [], type: 'export', desc: 'Экспорт текущей структуры' }]);
  const a = document.createElement('a');
  a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(j);
  a.download = 'red_black_tree.json'; a.click();
}

function clearTree() {
  root = NIL; nodeCount = 0; highlightIds = new Set(); logEntries = [];
  renderLog(); render();
}

/* ── Log ── */
function addLog(op, label, steps) {
  logEntries.unshift({ op, label, steps });
  if (logEntries.length > 60) logEntries.length = 60;
  renderLog();
}

function renderLog() {
  const panel = document.getElementById('log-panel');
  const entries = document.getElementById('log-entries');
  if (!logEntries.length) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  entries.innerHTML = logEntries.map(e =>
    `<div class="log-entry">
      <span class="log-op ${e.op}">[${e.op.toUpperCase()}]</span>
      <span class="log-nodes">${e.steps.map(s => s.desc).join(' → ')}</span>
    </div>`).join('');
}

/* ── Layout ── */
function treeHeight(n) {
  if (n === NIL) return 0;
  return 1 + Math.max(treeHeight(n.left), treeHeight(n.right));
}

function countNodes(n, counts = { total: 0, red: 0, black: 0 }) {
  if (n === NIL) return counts;
  counts.total++; n.color === RED ? counts.red++ : counts.black++;
  countNodes(n.left, counts); countNodes(n.right, counts);
  return counts;
}

function layout(node, depth, left, right, positions) {
  if (node === NIL) return;
  const x = (left + right) / 2, y = 54 + depth * 74;
  positions[node.id] = { x, y, node };
  layout(node.left,  depth + 1, left,         (left + right) / 2, positions);
  layout(node.right, depth + 1, (left + right) / 2, right,        positions);
}

/* ── Render ── */
function render() {
  const svg = document.getElementById('tree-svg');
  const empty = document.getElementById('empty-state');

  const counts = countNodes(root);
  document.getElementById('stat-nodes').textContent  = counts.total;
  document.getElementById('stat-height').textContent = treeHeight(root);
  document.getElementById('stat-red').textContent    = counts.red;
  document.getElementById('stat-black').textContent  = counts.black;

  if (root === NIL) {
    svg.style.display = 'none'; empty.style.display = 'flex'; return;
  }
  empty.style.display = 'none'; svg.style.display = 'block';

  const h = Math.max(treeHeight(root), 1);
  const W = Math.max(680, 90 * Math.pow(2, h));
  const H = 54 + h * 74 + 54;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('height', H);

  const positions = {};
  layout(root, 0, 0, W, positions);

  let lines = '', nodes = '';

  for (const id in positions) {
    const { x, y, node } = positions[id];
    if (node.left !== NIL) {
      const c = positions[node.left.id];
      lines += `<line x1="${x.toFixed(1)}" y1="${y}" x2="${c.x.toFixed(1)}" y2="${c.y}" stroke="rgba(128,128,128,0.35)" stroke-width="1.5"/>`;
    }
    if (node.right !== NIL) {
      const c = positions[node.right.id];
      lines += `<line x1="${x.toFixed(1)}" y1="${y}" x2="${c.x.toFixed(1)}" y2="${c.y}" stroke="rgba(128,128,128,0.35)" stroke-width="1.5"/>`;
    }
  }

  for (const id in positions) {
    const { x, y, node } = positions[id];
    const xf = x.toFixed(1);
    const fill = node.color === RED ? '#dc2626' : 'var(--black-node)';
    const hl = highlightIds.has(node.id);
    const ring = hl
      ? `<circle cx="${xf}" cy="${y}" r="27" fill="none" stroke="#f59e0b" stroke-width="2.5" opacity="0.9"/>`
      : '';
    nodes += `
      ${ring}
      <circle cx="${xf}" cy="${y}" r="20" fill="${fill}" stroke="${hl ? '#f59e0b' : 'rgba(255,255,255,0.12)'}" stroke-width="${hl ? 2 : 0.5}"/>
      <text x="${xf}" y="${y}" text-anchor="middle" dominant-baseline="central"
        fill="#ffffff" font-size="12.5" font-weight="500" font-family="var(--font)">${node.val}</text>`;
  }

  svg.innerHTML = lines + nodes;
}

/* ── Input handling ── */
function insertNum() {
  const inp = document.getElementById('num-input');
  const v = parseInt(inp.value, 10);
  if (isNaN(v)) { inp.focus(); return; }
  insert(v);
  inp.value = ''; inp.focus();
}

document.getElementById('num-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') insertNum();
});

/* ── Initial seed ── */
[10, 5, 20, 3, 7, 15, 25, 1, 4].forEach(v => insert(v));
