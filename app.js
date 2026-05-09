var defaultText = `users [icon: user, color: blue] {
  id bigInteger pk
  displayName string
  team_role string
  teams string
}

teams [icon: users, color: blue] {
  id bigInteger pk
  name string
}

workspaces [icon: home] {
  id bigInteger
  createdAt timestamp
  folderId string
  teamId string
}

folders [icon: folder] {
  id bigInteger
  name string
}

chat [icon: message-circle, color: green] {
  duration number
  startedAt timestamp
  endedAt timestamp
  workspaceId string
}

invite [icon: mail, color: green] {
  inviteId string
  type string
  workspaceId string
  inviterId string
}

// Relationships
users.teams <> teams.id
workspaces.folderId > folders.id
workspaces.teamId > teams.id
chat.workspaceId > workspaces.id
invite.workspaceId > workspaces.id
invite.inviterId > users.id

// Legend — drag it anywhere on canvas
legend {
  [connection: <>, label: Many to Many]
  [connection: >, label: Many to One]
  [connection: <, label: One to Many]
}`;

var STATE_KEY = "bunon_erd_state";

function saveState() {
  var positions = {};
  Object.keys(entityElements).forEach(function (name) {
    var info = entityElements[name];
    positions[name] = { x: info.x, y: info.y };
  });
  var state = {
    editorText: document.getElementById("editor").value,
    positions: positions,
    legendPos: { x: legendX, y: legendY },
  };
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {}
}

function loadState() {
  try {
    var raw = localStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function clearState() {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch (e) {}
}

function resetSession() {
  closeUserDropdown();
  clearState();
  document.getElementById("editor").value = defaultText;
  updateHighlight();
  renderERD(defaultText);
}

function emptySession() {
  closeUserDropdown();
  clearState();
  document.getElementById("editor").value = "";
  updateHighlight();
  renderERD("");
}

function closeUserDropdown() {
  var dd = document.getElementById("user-dropdown");
  var btn = document.getElementById("user-btn");
  if (dd) dd.classList.remove("open");
  if (btn) btn.setAttribute("aria-expanded", "false");
}

document.addEventListener("click", function (e) {
  var menu = document.getElementById("user-menu");
  var dd = document.getElementById("user-dropdown");
  var btn = document.getElementById("user-btn");
  if (!menu || !dd || !btn) return;
  if (menu.contains(e.target)) {
    if (btn.contains(e.target)) {
      var isOpen = dd.classList.contains("open");
      if (isOpen) {
        dd.classList.remove("open");
        btn.setAttribute("aria-expanded", "false");
      } else {
        dd.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
      }
    }
  } else {
    closeUserDropdown();
  }
});

var OVERLAP_GAP = 14;

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return (
    ax < bx + bw + OVERLAP_GAP &&
    ax + aw + OVERLAP_GAP > bx &&
    ay < by + bh + OVERLAP_GAP &&
    ay + ah + OVERLAP_GAP > by
  );
}

function resolveOverlap(movedName) {
  var moved = entityElements[movedName];
  if (!moved) return;

  var MAX_ITERS = 30;
  var changed = true;
  var iter = 0;

  while (changed && iter < MAX_ITERS) {
    changed = false;
    iter++;
    Object.keys(entityElements).forEach(function (othName) {
      if (othName === movedName) return;
      var oth = entityElements[othName];
      if (
        !rectsOverlap(
          moved.x,
          moved.y,
          moved.width,
          moved.height,
          oth.x,
          oth.y,
          oth.width,
          oth.height,
        )
      )
        return;

      var overlapX = Math.min(
        moved.x + moved.width + OVERLAP_GAP - oth.x,
        oth.x + oth.width + OVERLAP_GAP - moved.x,
      );
      var overlapY = Math.min(
        moved.y + moved.height + OVERLAP_GAP - oth.y,
        oth.y + oth.height + OVERLAP_GAP - moved.y,
      );

      if (overlapX < overlapY) {
        if (moved.x + moved.width / 2 < oth.x + oth.width / 2) {
          moved.x -= overlapX;
        } else {
          moved.x += overlapX;
        }
      } else {
        if (moved.y + moved.height / 2 < oth.y + oth.height / 2) {
          moved.y -= overlapY;
        } else {
          moved.y += overlapY;
        }
      }

      moved.x = Math.max(0, Math.min(CANVAS_W - moved.width, moved.x));
      moved.y = Math.max(0, Math.min(CANVAS_H - moved.height, moved.y));
      changed = true;
    });
  }

  moved.el.style.left = moved.x + "px";
  moved.el.style.top = moved.y + "px";
}

var isDragging = false,
  dragEntity = null;
var dragStartCX = 0,
  dragStartCY = 0;
var dragStartEX = 0,
  dragStartEY = 0;

var panX = 0,
  panY = 0,
  zoom = 1;
var isPanning = false;
var panMouseStartX = 0,
  panMouseStartY = 0;
var panStartX = 0,
  panStartY = 0;

var isLegendDragging = false;
var legendDragOffX = 0,
  legendDragOffY = 0;
var legendX = 40,
  legendY = 40;

var entityElements = {};

var FIELD_HEIGHT = 28;
var HEADER_HEIGHT = 42;
var PADDING_BOT = 8;
var ENTITY_WIDTH = 220;
var GAP_X = 80,
  GAP_Y = 60;
var START_X = 60,
  START_Y = 60;
var CANVAS_W = 4000,
  CANVAS_H = 3000;

function applyTransform() {
  document.getElementById("zoom-wrapper").style.transform =
    "translate(" + panX + "px," + panY + "px) scale(" + zoom + ")";
  document.getElementById("zoom-level").textContent =
    Math.round(zoom * 100) + "%";
}

function screenToCanvas(sx, sy) {
  var r = document.getElementById("canvas-panel").getBoundingClientRect();
  return {
    x: (sx - r.left - panX) / zoom,
    y: (sy - r.top - panY) / zoom,
  };
}

var ICONS = {
  user: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  users:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  home: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  folder:
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  "message-circle":
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
  mail: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
};

function escapeHTML(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightLine(line) {
  var raw = line;

  if (/^\s*\/\//.test(raw)) {
    return '<span class="hl-comment">' + escapeHTML(raw) + "</span>";
  }

  if (/^\s*$/.test(raw)) return escapeHTML(raw);

  if (/^\s*\}\s*$/.test(raw)) {
    return raw.replace("}", '<span class="hl-brace">}</span>');
  }

  if (/^\s*\[[^\]]+\]\s*$/.test(raw)) {
    var lbMatch = raw.match(/^(\s*)(\[)([^\]]*)(\])(\s*)$/);
    if (lbMatch) {
      return (
        escapeHTML(lbMatch[1]) +
        '<span class="hl-bracket">[</span>' +
        highlightMetaInner(lbMatch[3]) +
        '<span class="hl-bracket">]</span>' +
        escapeHTML(lbMatch[5])
      );
    }
  }

  var entityMatch = raw.match(/^(\s*)(\w+)(\s*)(\[[^\]]*\])?(\s*\{.*)$/);
  if (entityMatch && !raw.match(/^\s*\w+\.\w+\s*(<>|>|<|-)\s*\w+\.\w+/)) {
    var indent = escapeHTML(entityMatch[1]);
    var ename =
      '<span class="hl-entity">' + escapeHTML(entityMatch[2]) + "</span>";
    var space = escapeHTML(entityMatch[3]);
    var meta = entityMatch[4] ? highlightMeta(entityMatch[4]) : "";
    var brace = entityMatch[5]
      ? '<span class="hl-brace">' + escapeHTML(entityMatch[5]) + "</span>"
      : "";
    return indent + ename + space + meta + brace;
  }

  var relMatch = raw.match(
    /^(\s*)(\w+)(\.?)(\w*)(\s*)(<>|>|<|-)(\s*)(\w+)(\.?)(\w*)(.*)$/,
  );
  if (relMatch && relMatch[3] === ".") {
    var out = escapeHTML(relMatch[1]);
    out +=
      '<span class="hl-rel-tbl">' + escapeHTML(relMatch[2]) + "</span>";
    out += '<span class="hl-brace">.</span>';
    out +=
      '<span class="hl-rel-field">' + escapeHTML(relMatch[4]) + "</span>";
    out += escapeHTML(relMatch[5]);
    out +=
      '<span class="hl-rel-op">' + escapeHTML(relMatch[6]) + "</span>";
    out += escapeHTML(relMatch[7]);
    out +=
      '<span class="hl-rel-tbl">' + escapeHTML(relMatch[8]) + "</span>";
    if (relMatch[9]) out += '<span class="hl-brace">.</span>';
    out +=
      '<span class="hl-rel-field">' +
      escapeHTML(relMatch[10]) +
      "</span>";
    if (relMatch[11]) out += highlightRelProps(relMatch[11]);
    return out;
  }

  var fieldMatch = raw.match(/^(\s*)(\w+)(\s+)(\S+)(.*)$/);
  if (fieldMatch) {
    var fi = escapeHTML(fieldMatch[1]);
    var fname =
      '<span class="hl-field">' + escapeHTML(fieldMatch[2]) + "</span>";
    var fsp = escapeHTML(fieldMatch[3]);
    var ftype =
      '<span class="hl-type">' + escapeHTML(fieldMatch[4]) + "</span>";
    var frest = fieldMatch[5];
    frest = frest.replace(/\bpk\b/g, '<span class="hl-pk">pk</span>');
    return fi + fname + fsp + ftype + frest;
  }

  return escapeHTML(raw);
}

function highlightMeta(str) {
  var inner = str.slice(1, str.length - 1);
  return (
    '<span class="hl-bracket">[</span>' +
    highlightMetaInner(inner) +
    '<span class="hl-bracket">]</span>'
  );
}

function highlightMetaInner(inner) {
  var parts = inner.split(",");
  var out = "";
  parts.forEach(function (p, i) {
    var kv = p.match(/^(\s*)(\w+)(\s*)(:\s*)(.+?)(\s*)$/);
    if (kv) {
      out +=
        escapeHTML(kv[1]) +
        '<span class="hl-key">' +
        escapeHTML(kv[2]) +
        "</span>" +
        escapeHTML(kv[3]) +
        '<span class="hl-bracket">:</span>' +
        escapeHTML(kv[4].slice(1)) +
        '<span class="hl-value">' +
        escapeHTML(kv[5]) +
        "</span>" +
        escapeHTML(kv[6]);
    } else {
      out += '<span class="hl-field">' + escapeHTML(p) + "</span>";
    }
    if (i < parts.length - 1) out += '<span class="hl-bracket">,</span>';
  });
  return out;
}

function highlightRelProps(str) {
  var m = str.match(/^(\s*:\s*\[)([^\]]*)(\].*)$/);
  if (!m) return escapeHTML(str);
  var out = '<span class="hl-bracket">' + escapeHTML(m[1]) + "</span>";
  m[2].split(",").forEach(function (p, i, a) {
    var kv = p.match(/^(\s*)(\w+)(\s*)(:\s*)(\S+)(\s*)$/);
    if (kv) {
      out +=
        escapeHTML(kv[1]) +
        '<span class="hl-key">' +
        escapeHTML(kv[2]) +
        "</span>" +
        escapeHTML(kv[3]) +
        '<span class="hl-bracket">:</span>' +
        escapeHTML(kv[4].slice(1)) +
        '<span class="hl-value">' +
        escapeHTML(kv[5]) +
        "</span>" +
        escapeHTML(kv[6]);
    } else {
      out += '<span class="hl-field">' + escapeHTML(p) + "</span>";
    }
    if (i < a.length - 1) out += '<span class="hl-bracket">,</span>';
  });
  out += '<span class="hl-bracket">' + escapeHTML(m[3]) + "</span>";
  return out;
}

function updateHighlight() {
  var text = document.getElementById("editor").value;
  var lines = text.split("\n");
  var html = lines.map(highlightLine).join("\n");
  document.getElementById("highlight").innerHTML = html + "\n";

  var ta = document.getElementById("editor");
  var pre = document.getElementById("highlight");
  pre.scrollTop = ta.scrollTop;
  pre.scrollLeft = ta.scrollLeft;
}

function parseERD(text) {
  var entities = {},
    relationships = [],
    legendItems = [],
    diagramProps = {};
  var lines = text.split("\n");
  var currentEntity = null,
    inBraces = false,
    inLegend = false;

  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i];
    var trimmed = raw.trim();

    if (!trimmed || /^\/\//.test(trimmed)) continue;

    if (inLegend) {
      if (trimmed === "}") {
        inLegend = false;
        continue;
      }
      var lm = trimmed.match(/^\[([^\]]+)\]$/);
      if (lm) {
        var props = {};
        lm[1].split(",").forEach(function (p) {
          var kv = p.split(":");
          if (kv.length >= 2)
            props[kv[0].trim()] = kv.slice(1).join(":").trim();
        });
        legendItems.push(props);
      }
      continue;
    }

    if (inBraces) {
      if (trimmed === "}") {
        inBraces = false;
        currentEntity = null;
        continue;
      }
      if (currentEntity) {
        var fm = trimmed.match(/^(\w+)\s+(\S+)(.*)?$/);
        if (fm) {
          entities[currentEntity].fields.push({
            name: fm[1],
            type: fm[2],
            pk: !!(fm[3] && fm[3].indexOf("pk") !== -1),
          });
        }
      }
      continue;
    }

    if (/^legend\s*\{$/.test(trimmed)) {
      inLegend = true;
      continue;
    }

    var rm = trimmed.match(
      /^(\w+)\.(\w+)\s*(<>|>|<|-)\s*(\w+)\.(\w+)(.*)$/,
    );
    if (rm) {
      var relProps = {};
      if (rm[6]) {
        var rp = rm[6].match(/:\s*\[([^\]]+)\]/);
        if (rp) {
          rp[1].split(",").forEach(function (p) {
            var kv = p.split(":");
            if (kv.length >= 2)
              relProps[kv[0].trim()] = kv.slice(1).join(":").trim();
          });
        }
      }
      relationships.push({
        fromTable: rm[1],
        fromField: rm[2],
        symbol: rm[3],
        toTable: rm[4],
        toField: rm[5],
        props: relProps,
      });
      continue;
    }

    var em = trimmed.match(/^(\w+)\s*(?:\[([^\]]*)\])?\s*\{$/);
    if (em) {
      var ename = em[1];
      currentEntity = ename;
      var meta = { color: "grey", icon: "home" };
      if (em[2]) {
        em[2].split(",").forEach(function (p) {
          var kv = p.split(":");
          if (kv.length === 2) meta[kv[0].trim()] = kv[1].trim();
        });
      }
      entities[ename] = { name: ename, fields: [], meta: meta };
      inBraces = true;
    }
  }
  return {
    entities: entities,
    relationships: relationships,
    legendItems: legendItems,
    diagramProps: diagramProps,
  };
}

function truncateMiddle(text, maxLen) {
  if (text.length <= maxLen) return text;
  var half = Math.floor((maxLen - 3) / 2);
  return text.slice(0, half) + "..." + text.slice(text.length - half);
}

function getEntityHeight(entity) {
  return (
    HEADER_HEIGHT + entity.fields.length * FIELD_HEIGHT + PADDING_BOT
  );
}

function layoutEntities(entities, relationships) {
  var keys = Object.keys(entities);
  var positions = {};
  if (keys.length === 0) return positions;

  var adj = {};
  keys.forEach(function (k) {
    adj[k] = {};
  });
  relationships.forEach(function (r) {
    if (adj[r.fromTable]) adj[r.fromTable][r.toTable] = true;
    if (adj[r.toTable]) adj[r.toTable][r.fromTable] = true;
  });

  var placed = {},
    groups = [];
  function bfs(start) {
    var queue = [start],
      group = [];
    placed[start] = true;
    while (queue.length) {
      var cur = queue.shift();
      group.push(cur);
      Object.keys(adj[cur] || {}).forEach(function (n) {
        if (!placed[n]) {
          placed[n] = true;
          queue.push(n);
        }
      });
    }
    return group;
  }
  keys.forEach(function (k) {
    if (!placed[k]) groups.push(bfs(k));
  });

  function bestCols(n) {
    if (n <= 1) return 1;
    if (n <= 2) return 2;
    if (n <= 4) return 2;
    if (n <= 6) return 3;
    return 4;
  }

  var curY = START_Y;
  groups.forEach(function (group) {
    var cols = bestCols(group.length);
    var colPositions = [];
    for (var c = 0; c < cols; c++)
      colPositions.push(START_X + c * (ENTITY_WIDTH + GAP_X));
    var rowStartY = curY,
      rowMaxH = 0;
    group.forEach(function (name, idx) {
      var col = idx % cols;
      if (col === 0 && idx > 0) {
        rowStartY += rowMaxH + GAP_Y;
        rowMaxH = 0;
      }
      var h = getEntityHeight(entities[name]);
      positions[name] = {
        x: colPositions[col],
        y: rowStartY,
        width: ENTITY_WIDTH,
        height: h,
      };
      if (h > rowMaxH) rowMaxH = h;
    });
    curY = rowStartY + rowMaxH + GAP_Y * 2;
  });
  return positions;
}

function fitView() {
  var keys = Object.keys(entityElements);
  if (keys.length === 0) return;

  var minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  keys.forEach(function (k) {
    var e = entityElements[k];
    if (e.x < minX) minX = e.x;
    if (e.y < minY) minY = e.y;
    if (e.x + e.width > maxX) maxX = e.x + e.width;
    if (e.y + e.height > maxY) maxY = e.y + e.height;
  });

  var PAD = 60,
    panel = document.getElementById("canvas-panel");
  var W = panel.clientWidth,
    H = panel.clientHeight;
  var contentW = maxX - minX + PAD * 2,
    contentH = maxY - minY + PAD * 2;

  zoom = Math.max(Math.min(W / contentW, H / contentH, 1), 0.1);
  panX = (W - contentW * zoom) / 2 - (minX - PAD) * zoom;
  panY = (H - contentH * zoom) / 2 - (minY - PAD) * zoom;
  applyTransform();
}

var legendCardEl = null;

function renderLegend(legendItems) {
  if (legendCardEl && legendCardEl.parentNode) {
    legendCardEl.parentNode.removeChild(legendCardEl);
    legendCardEl = null;
  }
  if (!legendItems || legendItems.length === 0) return;

  var card = document.createElement("div");
  card.className = "legend-card";
  card.style.left = legendX + "px";
  card.style.top = legendY + "px";

  var titleEl = document.createElement("div");
  titleEl.className = "legend-title";
  titleEl.textContent = "Legend";
  card.appendChild(titleEl);

  legendItems.forEach(function (item) {
    var row = document.createElement("div");
    row.className = "legend-item";

    var lineEl = document.createElement("div");
    lineEl.className = "legend-line";

    if (item.connection !== undefined) {
      var conn = (item.connection || "").trim();
      lineEl.innerHTML = buildLineSVG(conn);
    } else if (item.shape !== undefined) {
      lineEl.innerHTML = buildShapeSVG(item.color || "gray");
    } else {
      lineEl.innerHTML = buildLineSVG(">");
    }

    var labelEl = document.createElement("span");
    labelEl.textContent = item.label || "";

    row.appendChild(lineEl);
    row.appendChild(labelEl);
    card.appendChild(row);
  });

  card.addEventListener("mousedown", function (e) {
    if (e.button !== 0) return;
    e.stopPropagation();
    isLegendDragging = true;
    var cp = screenToCanvas(e.clientX, e.clientY);
    legendDragOffX = cp.x - legendX;
    legendDragOffY = cp.y - legendY;
    card.classList.add("dragging");
    document.addEventListener("mousemove", onLegendDrag);
    document.addEventListener("mouseup", stopLegendDrag);
    e.preventDefault();
  });

  document.getElementById("canvas").appendChild(card);
  legendCardEl = card;
}

function onLegendDrag(e) {
  if (!isLegendDragging) return;
  var cp = screenToCanvas(e.clientX, e.clientY);
  legendX = cp.x - legendDragOffX;
  legendY = cp.y - legendDragOffY;
  if (legendCardEl) {
    legendCardEl.style.left = legendX + "px";
    legendCardEl.style.top = legendY + "px";
  }
}

function stopLegendDrag() {
  isLegendDragging = false;
  if (legendCardEl) legendCardEl.classList.remove("dragging");
  document.removeEventListener("mousemove", onLegendDrag);
  document.removeEventListener("mouseup", stopLegendDrag);
  saveState();
}

function buildLineSVG(conn) {
  conn = (conn || "").trim();
  var stroke = "#64748b";
  var W = 40,
    H = 16,
    mid = H / 2;
  var svg =
    '<svg width="' +
    W +
    '" height="' +
    H +
    '" viewBox="0 0 ' +
    W +
    " " +
    H +
    '">';

  var isDashed = conn === "→" || conn === "-->" || conn === "--";
  var dashAttr = isDashed ? ' stroke-dasharray="4 3"' : "";

  svg +=
    '<line x1="2" y1="' +
    mid +
    '" x2="' +
    (W - 8) +
    '" y2="' +
    mid +
    '" stroke="' +
    stroke +
    '" stroke-width="1.5"' +
    dashAttr +
    ' stroke-linecap="round"/>';

  if (conn === "<" || conn === "<>") {
    svg +=
      '<line x1="2" y1="' +
      (mid - 5) +
      '" x2="9" y2="' +
      mid +
      '" stroke="' +
      stroke +
      '" stroke-width="1.5"/>';
    svg +=
      '<line x1="2" y1="' +
      (mid + 5) +
      '" x2="9" y2="' +
      mid +
      '" stroke="' +
      stroke +
      '" stroke-width="1.5"/>';
  } else {
    svg +=
      '<line x1="6" y1="' +
      (mid - 5) +
      '" x2="6" y2="' +
      (mid + 5) +
      '" stroke="' +
      stroke +
      '" stroke-width="1.5"/>';
  }

  if (conn === ">" || conn === "<>") {
    svg +=
      '<line x1="' +
      (W - 2) +
      '" y1="' +
      (mid - 5) +
      '" x2="' +
      (W - 9) +
      '" y2="' +
      mid +
      '" stroke="' +
      stroke +
      '" stroke-width="1.5"/>';
    svg +=
      '<line x1="' +
      (W - 2) +
      '" y1="' +
      (mid + 5) +
      '" x2="' +
      (W - 9) +
      '" y2="' +
      mid +
      '" stroke="' +
      stroke +
      '" stroke-width="1.5"/>';
  } else if (conn === "→" || conn === "-->" || conn === "-") {
    svg +=
      '<polyline points="' +
      (W - 8) +
      "," +
      (mid - 4) +
      " " +
      (W - 2) +
      "," +
      mid +
      " " +
      (W - 8) +
      "," +
      (mid + 4) +
      '" fill="none" stroke="' +
      stroke +
      '" stroke-width="1.5"/>';
  } else {
    svg +=
      '<line x1="' +
      (W - 6) +
      '" y1="' +
      (mid - 5) +
      '" x2="' +
      (W - 6) +
      '" y2="' +
      (mid + 5) +
      '" stroke="' +
      stroke +
      '" stroke-width="1.5"/>';
  }

  svg += "</svg>";
  return svg;
}

function buildShapeSVG(colorName) {
  var colorMap = {
    blue: { fill: "#dbeafe", stroke: "#3b82f6" },
    green: { fill: "#dcfce7", stroke: "#22c55e" },
    red: { fill: "#fee2e2", stroke: "#ef4444" },
    orange: { fill: "#ffedd5", stroke: "#f97316" },
    purple: { fill: "#ede9fe", stroke: "#7c3aed" },
    gray: { fill: "#f3f4f6", stroke: "#6b7280" },
    grey: { fill: "#f3f4f6", stroke: "#6b7280" },
  };
  var c = colorMap[colorName] || colorMap["gray"];
  return (
    '<svg width="40" height="16" viewBox="0 0 40 16">' +
    '<rect x="2" y="2" width="36" height="12" rx="3" fill="' +
    c.fill +
    '" stroke="' +
    c.stroke +
    '" stroke-width="1.5"/>' +
    "</svg>"
  );
}

function renderERD(text, savedPositions) {
  var parsed = parseERD(text);
  var entities = parsed.entities,
    relationships = parsed.relationships;
  var legendItems = parsed.legendItems;

  var canvasEl = document.getElementById("canvas");
  var svg = document.getElementById("lines-svg");
  entityElements = {};
  canvasEl.innerHTML = "";
  svg.innerHTML = "";
  legendCardEl = null;

  var layoutPos = layoutEntities(entities, relationships);
  var positions = {};
  Object.keys(layoutPos).forEach(function (name) {
    positions[name] = {
      x:
        savedPositions && savedPositions[name]
          ? savedPositions[name].x
          : layoutPos[name].x,
      y:
        savedPositions && savedPositions[name]
          ? savedPositions[name].y
          : layoutPos[name].y,
      width: layoutPos[name].width,
      height: layoutPos[name].height,
    };
  });

  Object.keys(entities).forEach(function (name) {
    var entity = entities[name];
    var pos = positions[name];
    if (!pos) return;

    var color = entity.meta.color || "grey";
    var iconKey = entity.meta.icon || "home";
    var iconSvg = ICONS[iconKey] || ICONS["home"];

    var div = document.createElement("div");
    div.className = "entity";
    div.setAttribute("data-color", color);
    div.style.left = pos.x + "px";
    div.style.top = pos.y + "px";
    div.id = "entity-" + name;

    var fieldsHTML = "";
    entity.fields.forEach(function (f) {
      fieldsHTML +=
        '<div class="field' +
        (f.pk ? " pk" : "") +
        '" data-fieldname="' +
        f.name +
        '">' +
        '<span class="field-name"' +
        (f.name.length > 15 ? ' title="' + f.name + '"' : "") +
        ">" +
        truncateMiddle(f.name, 15) +
        "</span>" +
        (f.pk ? '<span class="pk-badge">PK</span>' : "") +
        '<span class="field-type">' +
        f.type +
        "</span>" +
        "</div>";
    });

    div.innerHTML =
      '<div class="entity-header">' +
      '<span class="entity-icon">' +
      iconSvg +
      "</span>" +
      '<span class="entity-name">' +
      name +
      "</span>" +
      "</div>" +
      '<div class="entity-fields">' +
      fieldsHTML +
      "</div>";

    div.addEventListener("mousedown", function (e) {
      startEntityDrag(e, name);
    });
    canvasEl.appendChild(div);

    entityElements[name] = {
      el: div,
      entity: entity,
      x: pos.x,
      y: pos.y,
      width: pos.width,
      height: pos.height,
    };
  });

  drawRelationships(relationships);
  renderLegend(legendItems);
  fitView();
}

function getFieldCenterY(entityName, fieldName) {
  var info = entityElements[entityName];
  if (!info) return null;
  var fields = info.entity.fields;
  for (var i = 0; i < fields.length; i++) {
    if (fields[i].name === fieldName)
      return info.y + HEADER_HEIGHT + i * FIELD_HEIGHT + FIELD_HEIGHT / 2;
  }
  return info.y + info.height / 2;
}

// Build an orthogonal elbow path string.
// mx is the x-coordinate of the vertical segment (the "spine").
function buildElbowPath(x1, y1, x2, y2, mx) {
  var R = 8; // corner radius
  if (Math.abs(y1 - y2) < 2) {
    // Same row — straight horizontal line
    return "M" + x1 + " " + y1 + " L" + x2 + " " + y2;
  }
  var goRight = x2 >= x1;
  var goDown  = y2 > y1;
  var hLen = Math.abs(mx - x1);
  var vLen = Math.abs(y2 - y1);
  var r = Math.min(R, hLen, vLen);
  var hs = goRight ? 1 : -1;
  var vs = goDown  ? 1 : -1;
  return "M" + x1 + " " + y1
    + " L" + (mx - hs * r) + " " + y1
    + " Q" + mx + " " + y1 + " " + mx + " " + (y1 + vs * r)
    + " L" + mx + " " + (y2 - vs * r)
    + " Q" + mx + " " + y2 + " " + (mx + hs * r) + " " + y2
    + " L" + x2 + " " + y2;
}

// Given a list of relationships, compute a per-relationship mx (vertical spine x)
// so that lines sharing the same corridor (same left-edge and right-edge columns)
// are spread apart and never overlap.
function assignSpineX(relationships) {
  var LANE_SPACING = 12; // px between parallel vertical segments

  // Canonical corridor key: always put the smaller x first so A->B and B->A share a corridor
  function corridorKey(fi, ti) {
    var leftX  = Math.min(fi.x + fi.width, ti.x + ti.width, fi.x, ti.x);
    var rightX = Math.max(fi.x + fi.width, ti.x + ti.width, fi.x, ti.x);
    // Use the exit/entry edges rather than entity centres
    var fromCX = fi.x + fi.width / 2;
    var toCX   = ti.x + ti.width / 2;
    var ex1 = fromCX <= toCX ? fi.x + fi.width : fi.x;
    var ex2 = fromCX <= toCX ? ti.x            : ti.x + ti.width;
    var lo = Math.min(ex1, ex2);
    var hi = Math.max(ex1, ex2);
    return lo + "_" + hi;
  }

  // First pass: group indices by corridor
  var corridors = {}; // key -> [relIndex, ...]
  relationships.forEach(function (rel, idx) {
    var fi = entityElements[rel.fromTable];
    var ti = entityElements[rel.toTable];
    if (!fi || !ti) return;
    var key = corridorKey(fi, ti);
    if (!corridors[key]) corridors[key] = [];
    corridors[key].push(idx);
  });

  // Second pass: assign mx for each relationship
  var spines = new Array(relationships.length);
  Object.keys(corridors).forEach(function (key) {
    var group = corridors[key];
    var n = group.length;
    // Compute the natural midpoint mx for this corridor
    var first = relationships[group[0]];
    var fi = entityElements[first.fromTable];
    var ti = entityElements[first.toTable];
    var fromCX = fi.x + fi.width / 2;
    var toCX   = ti.x + ti.width / 2;
    var x1 = fromCX <= toCX ? fi.x + fi.width : fi.x;
    var x2 = fromCX <= toCX ? ti.x            : ti.x + ti.width;
    var baseMx = (x1 + x2) / 2;
    // Spread: centre the fan around baseMx
    var totalSpread = (n - 1) * LANE_SPACING;
    var startOffset = -totalSpread / 2;
    group.forEach(function (relIdx, i) {
      spines[relIdx] = baseMx + startOffset + i * LANE_SPACING;
    });
  });

  return spines;
}

function drawRelationships(relationships) {
  var svg = document.getElementById("lines-svg");
  var NS = "http://www.w3.org/2000/svg";
  svg.innerHTML = "";

  var defs = document.createElementNS(NS, "defs");
  function makeMarker(id, content) {
    var m = document.createElementNS(NS, "marker");
    m.setAttribute("id", id);
    m.setAttribute("markerWidth", "12");
    m.setAttribute("markerHeight", "10");
    m.setAttribute("refX", "6");
    m.setAttribute("refY", "5");
    m.setAttribute("orient", "auto-start-reverse");
    m.innerHTML = content;
    defs.appendChild(m);
  }
  makeMarker(
    "mk-many",
    '<line x1="3" y1="1" x2="3" y2="9" stroke="#94a3b8" stroke-width="1.5"/>' +
      '<line x1="6" y1="1" x2="6" y2="9" stroke="#94a3b8" stroke-width="1.5"/>',
  );
  makeMarker(
    "mk-one",
    '<line x1="5" y1="1" x2="5" y2="9" stroke="#94a3b8" stroke-width="1.5"/>',
  );
  svg.appendChild(defs);

  // Compute per-relationship vertical spine positions to avoid overlap
  var spines = assignSpineX(relationships);

  relationships.forEach(function (rel, idx) {
    var fi = entityElements[rel.fromTable];
    var ti = entityElements[rel.toTable];
    if (!fi || !ti) return;

    var y1 = getFieldCenterY(rel.fromTable, rel.fromField);
    var y2 = getFieldCenterY(rel.toTable, rel.toField);
    if (y1 === null || y2 === null) return;

    var fromCX = fi.x + fi.width / 2,
      toCX = ti.x + ti.width / 2;
    var x1 = fromCX <= toCX ? fi.x + fi.width : fi.x;
    var x2 = fromCX <= toCX ? ti.x : ti.x + ti.width;

    var lineColor =
      rel.props && rel.props.color
        ? rel.props.color === "green"
          ? "#22c55e"
          : rel.props.color === "blue"
            ? "#3b82f6"
            : rel.props.color === "red"
              ? "#ef4444"
              : rel.props.color === "orange"
                ? "#f97316"
                : "#94a3b8"
        : "#94a3b8";

    var mx = spines[idx] !== undefined ? spines[idx] : (x1 + x2) / 2;
    var d = buildElbowPath(x1, y1, x2, y2, mx);

    var path = document.createElementNS(NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("stroke", lineColor);
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-linecap", "round");
    if (rel.symbol === "<>") {
      path.setAttribute("marker-start", "url(#mk-many)");
      path.setAttribute("marker-end", "url(#mk-many)");
    } else if (rel.symbol === ">") {
      path.setAttribute("marker-start", "url(#mk-many)");
      path.setAttribute("marker-end", "url(#mk-one)");
    } else if (rel.symbol === "<") {
      path.setAttribute("marker-start", "url(#mk-one)");
      path.setAttribute("marker-end", "url(#mk-many)");
    }
    svg.appendChild(path);
  });
}

function startEntityDrag(e, name) {
  if (e.button !== 0) return;
  e.stopPropagation();
  isDragging = true;
  dragEntity = name;
  var info = entityElements[name];
  var cp = screenToCanvas(e.clientX, e.clientY);
  dragStartCX = cp.x;
  dragStartCY = cp.y;
  dragStartEX = info.x;
  dragStartEY = info.y;
  info.el.classList.add("dragging");
  document.addEventListener("mousemove", onEntityDrag);
  document.addEventListener("mouseup", stopEntityDrag);
  e.preventDefault();
}

function onEntityDrag(e) {
  if (!isDragging || !dragEntity) return;
  var info = entityElements[dragEntity];
  var cp = screenToCanvas(e.clientX, e.clientY);
  var nx = dragStartEX + (cp.x - dragStartCX);
  var ny = dragStartEY + (cp.y - dragStartCY);
  nx = Math.max(0, Math.min(CANVAS_W - info.width, nx));
  ny = Math.max(0, Math.min(CANVAS_H - info.height, ny));
  info.x = nx;
  info.y = ny;
  info.el.style.left = nx + "px";
  info.el.style.top = ny + "px";
  drawRelationships(
    parseERD(document.getElementById("editor").value).relationships,
  );
}

function stopEntityDrag() {
  isDragging = false;
  if (dragEntity && entityElements[dragEntity]) {
    entityElements[dragEntity].el.classList.remove("dragging");
    resolveOverlap(dragEntity);
    drawRelationships(
      parseERD(document.getElementById("editor").value).relationships,
    );
    saveState();
  }
  dragEntity = null;
  document.removeEventListener("mousemove", onEntityDrag);
  document.removeEventListener("mouseup", stopEntityDrag);
}

(function () {
  var canvasPanel = document.getElementById("canvas-panel");

  canvasPanel.addEventListener("mousedown", function (e) {
    if (e.button === 0 || e.button === 1) {
      isPanning = true;
      panMouseStartX = e.clientX;
      panMouseStartY = e.clientY;
      panStartX = panX;
      panStartY = panY;
      canvasPanel.style.cursor = "grabbing";
      e.preventDefault();
    }
  });
  document.addEventListener("mousemove", function (e) {
    if (!isPanning) return;
    panX = panStartX + (e.clientX - panMouseStartX);
    panY = panStartY + (e.clientY - panMouseStartY);
    applyTransform();
  });
  document.addEventListener("mouseup", function (e) {
    if (isPanning && (e.button === 0 || e.button === 1)) {
      isPanning = false;
      canvasPanel.style.cursor = "";
    }
  });

  canvasPanel.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        var delta = e.deltaY;
        var factor = Math.abs(delta) > 50 ? 0.12 : 0.05;
        var dir = delta > 0 ? -1 : 1;
        var newZoom = Math.max(0.08, Math.min(5, zoom + dir * factor));
        var r = canvasPanel.getBoundingClientRect();
        var sx = e.clientX - r.left,
          sy = e.clientY - r.top;
        var cx = (sx - panX) / zoom,
          cy = (sy - panY) / zoom;
        zoom = newZoom;
        panX = sx - cx * zoom;
        panY = sy - cy * zoom;
        applyTransform();
      } else {
        var dx = e.deltaX || 0,
          dy = e.deltaY || 0;
        if (e.shiftKey && !e.deltaX) {
          dx = dy;
          dy = 0;
        }
        panX -= dx;
        panY -= dy;
        applyTransform();
      }
    },
    { passive: false },
  );
})();

function zoomStep(delta) {
  var panel = document.getElementById("canvas-panel");
  var newZoom = Math.max(0.08, Math.min(5, zoom + delta));
  var cx = panel.clientWidth / 2,
    cy = panel.clientHeight / 2;
  var ccx = (cx - panX) / zoom,
    ccy = (cy - panY) / zoom;
  zoom = newZoom;
  panX = cx - ccx * zoom;
  panY = cy - ccy * zoom;
  applyTransform();
}

function exportText() {
  var text = document.getElementById("editor").value;
  var blob = new Blob([text], { type: "text/plain" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "erd.txt";
  a.click();
  URL.revokeObjectURL(url);
}

var COLOR_SCHEMES = {
  blue: { border: "#3b82f6", header: "#eff6ff", text: "#3b82f6" },
  green: { border: "#22c55e", header: "#f0fdf4", text: "#22c55e" },
  red: { border: "#ef4444", header: "#fef2f2", text: "#ef4444" },
  grey: { border: "#6b7280", header: "#f9fafb", text: "#6b7280" },
  gray: { border: "#6b7280", header: "#f9fafb", text: "#6b7280" },
  purple: { border: "#7c3aed", header: "#f5f3ff", text: "#7c3aed" },
  orange: { border: "#f97316", header: "#fff7ed", text: "#f97316" },
};

function exportPNG() {
  var keys = Object.keys(entityElements);
  if (keys.length === 0) {
    alert("Nothing to export — add some tables first!");
    return;
  }

  var PAD = 60;
  var minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  keys.forEach(function (k) {
    var e = entityElements[k];
    if (e.x < minX) minX = e.x;
    if (e.y < minY) minY = e.y;
    if (e.x + e.width > maxX) maxX = e.x + e.width;
    if (e.y + e.height > maxY) maxY = e.y + e.height;
  });
  if (legendCardEl) {
    var lw = legendCardEl.offsetWidth || 180;
    var lh = legendCardEl.offsetHeight || 100;
    if (legendX < minX) minX = legendX;
    if (legendY < minY) minY = legendY;
    if (legendX + lw > maxX) maxX = legendX + lw;
    if (legendY + lh > maxY) maxY = legendY + lh;
  }

  var W = maxX - minX + PAD * 2,
    H = maxY - minY + PAD * 2;
  var ox = minX - PAD,
    oy = minY - PAD;

  var DPR = 2,
    cv = document.createElement("canvas");
  cv.width = W * DPR;
  cv.height = H * DPR;
  var ctx = cv.getContext("2d");
  ctx.scale(DPR, DPR);

  ctx.fillStyle = "#f0f2f5";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#c8cdd6";
  for (var gx = 0; gx <= W; gx += 24)
    for (var gy = 0; gy <= H; gy += 24) {
      ctx.beginPath();
      ctx.arc(gx, gy, 1, 0, Math.PI * 2);
      ctx.fill();
    }

  var parsed = parseERD(document.getElementById("editor").value);
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";

  // Compute spread spines for PNG export too
  var pngSpines = assignSpineX(parsed.relationships);

  parsed.relationships.forEach(function (rel, idx) {
    var fi = entityElements[rel.fromTable],
      ti = entityElements[rel.toTable];
    if (!fi || !ti) return;
    var y1 = getFieldCenterY(rel.fromTable, rel.fromField);
    var y2 = getFieldCenterY(rel.toTable, rel.toField);
    if (y1 === null || y2 === null) return;
    var fromCX = fi.x + fi.width / 2,
      toCX = ti.x + ti.width / 2;
    var x1 = fromCX <= toCX ? fi.x + fi.width : fi.x;
    var x2 = fromCX <= toCX ? ti.x : ti.x + ti.width;

    var mx = pngSpines[idx] !== undefined ? pngSpines[idx] : (x1 + x2) / 2;

    // Draw orthogonal elbow path on canvas (mirrors buildElbowPath)
    var R = 8;
    ctx.beginPath();
    if (Math.abs(y1 - y2) < 2) {
      ctx.moveTo(x1 - ox, y1 - oy);
      ctx.lineTo(x2 - ox, y2 - oy);
    } else {
      var goRight = x2 >= x1;
      var goDown  = y2 > y1;
      var hLen = Math.abs(mx - x1);
      var vLen = Math.abs(y2 - y1);
      var r = Math.min(R, hLen, vLen);
      var hs = goRight ? 1 : -1;
      var vs = goDown  ? 1 : -1;
      ctx.moveTo(x1 - ox, y1 - oy);
      ctx.lineTo((mx - hs * r) - ox, y1 - oy);
      ctx.quadraticCurveTo(mx - ox, y1 - oy, mx - ox, (y1 + vs * r) - oy);
      ctx.lineTo(mx - ox, (y2 - vs * r) - oy);
      ctx.quadraticCurveTo(mx - ox, y2 - oy, (mx + hs * r) - ox, y2 - oy);
      ctx.lineTo(x2 - ox, y2 - oy);
    }
    ctx.stroke();
    function chevron(px, py, pr) {
      var s = 7,
        d = pr ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(px - ox + d * s, py - oy - s);
      ctx.lineTo(px - ox, py - oy);
      ctx.lineTo(px - ox + d * s, py - oy + s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px - ox + d * (s + 5), py - oy - s);
      ctx.lineTo(px - ox + d * 5, py - oy);
      ctx.lineTo(px - ox + d * (s + 5), py - oy + s);
      ctx.stroke();
    }
    function tick(px, py, pr) {
      var d = pr ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(px - ox + d * 6, py - oy - 6);
      ctx.lineTo(px - ox + d * 6, py - oy + 6);
      ctx.stroke();
    }
    var ltr = fromCX <= toCX;
    if (rel.symbol === ">" || rel.symbol === "<>") chevron(x2, y2, ltr);
    if (rel.symbol === "<" || rel.symbol === "<>") chevron(x1, y1, !ltr);
    if (rel.symbol === ">") tick(x1, y1, !ltr);
    if (rel.symbol === "<") tick(x2, y2, ltr);
  });

  var R = 10;
  function rr(x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x + R, y);
    ctx.lineTo(x + w - R, y);
    ctx.arcTo(x + w, y, x + w, y + R, R);
    ctx.lineTo(x + w, y + h - R);
    ctx.arcTo(x + w, y + h, x + w - R, y + h, R);
    ctx.lineTo(x + R, y + h);
    ctx.arcTo(x, y + h, x, y + h - R, R);
    ctx.lineTo(x, y + R);
    ctx.arcTo(x, y, x + R, y, R);
    ctx.closePath();
  }

  keys.forEach(function (name) {
    var info = entityElements[name];
    var scheme =
      COLOR_SCHEMES[info.entity.meta.color] || COLOR_SCHEMES["grey"];
    var x = info.x - ox,
      y = info.y - oy,
      w = info.width,
      h = info.height;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.13)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    rr(x, y, w, h);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.restore();
    rr(x, y, w, h);
    ctx.fillStyle = "#fff";
    ctx.fill();
    rr(x, y, w, h);
    ctx.strokeStyle = scheme.border;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + R, y);
    ctx.lineTo(x + w - R, y);
    ctx.arcTo(x + w, y, x + w, y + R, R);
    ctx.lineTo(x + w, y + HEADER_HEIGHT);
    ctx.lineTo(x, y + HEADER_HEIGHT);
    ctx.lineTo(x, y + R);
    ctx.arcTo(x, y, x + R, y, R);
    ctx.closePath();
    ctx.fillStyle = scheme.header;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x, y + HEADER_HEIGHT);
    ctx.lineTo(x + w, y + HEADER_HEIGHT);
    ctx.strokeStyle = scheme.border;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillStyle = scheme.text;
    ctx.font = "bold 13px -apple-system,Arial,sans-serif";
    ctx.fillText(name, x + 36, y + HEADER_HEIGHT / 2);
    var fy = y + HEADER_HEIGHT;
    info.entity.fields.forEach(function (f, idx) {
      var cy = fy + FIELD_HEIGHT / 2;
      if (idx % 2 === 1) {
        ctx.fillStyle = "rgba(0,0,0,0.015)";
        ctx.fillRect(x + 1, fy, w - 2, FIELD_HEIGHT);
      }
      ctx.fillStyle = "#1a202c";
      ctx.font =
        (f.pk ? "600 " : "500 ") +
        '11.5px "JetBrains Mono",Menlo,"Courier New",monospace';
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(f.name, x + 14, cy);
      if (f.pk) {
        var bx = x + 14 + ctx.measureText(f.name).width + 5,
          bw = 24,
          bh = 13,
          by = cy - bh / 2;
        ctx.fillStyle = "#fef3c7";
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(bx, by, bw, bh, 3)
          : ctx.rect(bx, by, bw, bh);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#92400e";
        ctx.font = "bold 8px Arial,sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PK", bx + bw / 2, cy);
      }
      ctx.fillStyle = "#718096";
      ctx.font = '11px "JetBrains Mono",Menlo,"Courier New",monospace';
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(f.type, x + w - 14, cy);
      if (idx < info.entity.fields.length - 1) {
        ctx.beginPath();
        ctx.moveTo(x + 1, fy + FIELD_HEIGHT);
        ctx.lineTo(x + w - 1, fy + FIELD_HEIGHT);
        ctx.strokeStyle = "#f0f0f0";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      fy += FIELD_HEIGHT;
    });
  });

  cv.toBlob(function (blob) {
    var url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "erd-diagram.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }, "image/png");
}

(function () {
  defaultText = `users [icon: user, color: blue] {
  id bigInteger pk
  displayName string
  team_role string
  teams string
}

teams [icon: users, color: blue] {
  id bigInteger pk
  name string
}

workspaces [icon: home] {
  id bigInteger
  createdAt timestamp
  folderId string
  teamId string
}

folders [icon: folder] {
  id bigInteger
  name string
}

chat [icon: message-circle, color: green] {
  duration number
  startedAt timestamp
  endedAt timestamp
  workspaceId string
}

invite [icon: mail, color: green] {
  inviteId string
  type string
  workspaceId string
  inviterId string
}

// Relationships
users.teams <> teams.id
workspaces.folderId > folders.id
workspaces.teamId > teams.id
chat.workspaceId > workspaces.id
invite.workspaceId > workspaces.id
invite.inviterId > users.id

// Legend — drag it anywhere on canvas
legend {
  [connection: <>, label: Many to Many]
  [connection: >, label: Many to One]
  [connection: <, label: One to Many]
}`;

  var editor = document.getElementById("editor");
  editor.value = defaultText;

  editor.addEventListener("keydown", function (e) {
    if (e.key === "Tab") {
      e.preventDefault();
      var start = this.selectionStart;
      var end = this.selectionEnd;
      this.value =
        this.value.substring(0, start) +
        "  " +
        this.value.substring(end);
      this.selectionStart = this.selectionEnd = start + 2;
      updateHighlight();
    }
  });

  editor.addEventListener("scroll", function () {
    document.getElementById("highlight").scrollTop = editor.scrollTop;
    document.getElementById("highlight").scrollLeft = editor.scrollLeft;
  });

  var debounceTimer;
  editor.addEventListener("input", function () {
    updateHighlight();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      renderERD(editor.value);
      saveState();
    }, 280);
  });

  var _savedState = loadState();
  if (_savedState && _savedState.editorText !== undefined) {
    editor.value = _savedState.editorText;
    if (_savedState.legendPos) {
      legendX = _savedState.legendPos.x;
      legendY = _savedState.legendPos.y;
    }
    updateHighlight();
    requestAnimationFrame(function () {
      renderERD(editor.value, _savedState.positions || {});
    });
  } else {
    updateHighlight();
    requestAnimationFrame(function () {
      renderERD(defaultText);
    });
  }

  var toggleBtn = document.querySelector(".btn-sidebar-toggle");
  var editorPanel = document.querySelector(".editor-panel");

  toggleBtn.addEventListener("click", function () {
    editorPanel.classList.toggle("collapsed");
  });

  var modal = document.getElementById("info-modal");
  var openBtn = document.getElementById("openInfo-modal");
  var closeBtn = document.getElementById("close-modal");

  openBtn.addEventListener("click", function () {
    modal.showModal();
  });

  closeBtn.addEventListener("click", function () {
    modal.close();
  });
})();
