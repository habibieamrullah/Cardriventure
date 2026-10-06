/**
 * Level Editor "Drift Maze" — antarmuka editor visual berbasis canvas.
 *
 * Semua pengelolaan level dilakukan di sisi klien (state.levels), lalu
 * disimpan sekaligus ke server melalui api.php (action: save).
 */
(function () {
    'use strict';

    var CFG = window.EDITOR_CONFIG || {};
    var ASSETS = CFG.assetsUrl || '../assets/assets/';
    var API = CFG.apiUrl || 'api.php';

    // Kategori tile mengikuti logika game (main.js).
    var CAT = {
        road: ['tile2', 'tile3', 'tile4', 'tile5'],
        wall: ['tile6', 'tile7', 'tile8', 'tile10', 'tile11', 'tile12', 'tile13',
               'tile14', 'tile15', 'tile17', 'tile18', 'tile19', 'tile20',
               'tile21', 'tile22', 'tile23', 'tile24'],
        tele: ['tile9'],
        deco: ['tile1', 'tile16', 'tile25', 'tile26', 'tile27']
    };

    function categoryOf(name) {
        if (CAT.road.indexOf(name) > -1) return 'road';
        if (CAT.wall.indexOf(name) > -1) return 'wall';
        if (CAT.tele.indexOf(name) > -1) return 'tele';
        return 'deco';
    }
    var CAT_LABEL = { road: 'jalur', wall: 'dinding', tele: 'teleport', deco: 'hiasan' };

    // ---------------------------------------------------------------- //
    // State
    // ---------------------------------------------------------------- //
    var state = {
        levels: [],
        tiles: [],
        current: 0,
        brush: null,
        tool: 'brush',
        snap: 32,
        showGrid: true,
        selected: null,
        view: { x: 0, y: 0, scale: 1 },
        dirty: false,
        undo: [],
        redo: [],
        imgCache: {},
        grass: null,
        cw: 0,
        ch: 0,
        dpr: 1,
        panning: null,
        dragging: null,
        hover: null
    };

    // ---------------------------------------------------------------- //
    // Dom
    // ---------------------------------------------------------------- //
    var el = function (id) { return document.getElementById(id); };
    var canvas, ctx, wrap, toastEl, statusEl;

    // ---------------------------------------------------------------- //
    // Util
    // ---------------------------------------------------------------- //
    function currentLevel() { return state.levels[state.current]; }
    function tileSize() {
        var lv = currentLevel();
        return (lv && parseInt(lv.tilesize, 10)) || 32;
    }
    function snapTo(v) {
        if (state.snap <= 0) return Math.round(v);
        return Math.round(v / state.snap) * state.snap;
    }
    function getImage(name) {
        if (state.imgCache[name]) return state.imgCache[name];
        var im = new Image();
        im.onload = scheduleDraw;
        im.src = ASSETS + name + '.png';
        state.imgCache[name] = im;
        return im;
    }

    function toast(message, kind) {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.className = 'toast show' + (kind ? ' ' + kind : '');
        clearTimeout(toast._t);
        toast._t = setTimeout(function () { toastEl.className = 'toast'; }, 2600);
    }
    function setStatus(html) { if (statusEl) statusEl.innerHTML = html; }

    // ---------------------------------------------------------------- //
    // Canvas & viewport
    // ---------------------------------------------------------------- //
    function resizeCanvas() {
        if (!canvas || !wrap) return;
        var dpr = window.devicePixelRatio || 1;
        var w = wrap.clientWidth, h = wrap.clientHeight;
        state.dpr = dpr;
        state.cw = w;
        state.ch = h;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        scheduleDraw();
    }

    function screenToWorld(sx, sy) {
        return { x: state.view.x + sx / state.view.scale, y: state.view.y + sy / state.view.scale };
    }

    var drawQueued = false;
    function scheduleDraw() {
        if (drawQueued) return;
        drawQueued = true;
        requestAnimationFrame(function () { drawQueued = false; draw(); });
    }

    function fitView() {
        var lv = currentLevel();
        if (!lv || !state.cw) return;
        var pad = 40;
        var sx = (state.cw - pad) / lv.width;
        var sy = (state.ch - pad) / lv.height;
        var s = Math.min(sx, sy);
        state.view.scale = s > 0 ? s : 1;
        state.view.x = (lv.width - state.cw / state.view.scale) / 2;
        state.view.y = (lv.height - state.ch / state.view.scale) / 2;
        updateZoomLabel();
        scheduleDraw();
    }

    function zoomAt(cx, cy, factor) {
        var before = screenToWorld(cx, cy);
        state.view.scale = Math.min(4, Math.max(0.1, state.view.scale * factor));
        var after = screenToWorld(cx, cy);
        state.view.x += before.x - after.x;
        state.view.y += before.y - after.y;
        updateZoomLabel();
        scheduleDraw();
    }

    function updateZoomLabel() {
        var lbl = el('zoomLabel');
        if (lbl) lbl.textContent = Math.round(state.view.scale * 100) + '%';
    }

    // ---------------------------------------------------------------- //
    // Drawing
    // ---------------------------------------------------------------- //
    function draw() {
        var lv = currentLevel();
        if (!ctx) return;
        var dpr = state.dpr, s = state.view.scale;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, state.cw, state.ch);
        ctx.fillStyle = '#0d0f13';
        ctx.fillRect(0, 0, state.cw, state.ch);
        if (!lv) return;

        // Transformasi dunia -> layar (termasuk skala zoom & dpr).
        ctx.setTransform(s * dpr, 0, 0, s * dpr, -state.view.x * s * dpr, -state.view.y * s * dpr);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, lv.width, lv.height);
        ctx.clip();
        if (state.grass && state.grass.complete && state.grass.naturalWidth) {
            var pat = ctx.createPattern(state.grass, 'repeat');
            if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, lv.width, lv.height); }
        } else {
            ctx.fillStyle = '#3f5136';
            ctx.fillRect(0, 0, lv.width, lv.height);
        }
        ctx.restore();

        if (state.showGrid) drawGrid(lv, s);
        drawTiles(lv, s);

        ctx.lineWidth = 2 / s;
        ctx.strokeStyle = 'rgba(255,255,255,.5)';
        ctx.strokeRect(0, 0, lv.width, lv.height);
    }

    function drawGrid(lv, s) {
        var ts = tileSize();
        if (ts * s < 5) return; // terlalu rapat untuk digambar
        ctx.lineWidth = 1 / s;
        ctx.strokeStyle = 'rgba(255,255,255,.10)';
        ctx.beginPath();
        for (var x = 0; x <= lv.width; x += ts) { ctx.moveTo(x, 0); ctx.lineTo(x, lv.height); }
        for (var y = 0; y <= lv.height; y += ts) { ctx.moveTo(0, y); ctx.lineTo(lv.width, y); }
        ctx.stroke();
    }

    function drawTiles(lv, s) {
        var x0 = state.view.x, y0 = state.view.y;
        var x1 = state.view.x + state.cw / s, y1 = state.view.y + state.ch / s;
        for (var i = 0; i < lv.tiles.length; i++) {
            var t = lv.tiles[i];
            var im = state.imgCache[t.spritename];
            if (!im) { im = getImage(t.spritename); }
            if (!im.complete || !im.naturalWidth) continue;
            var w = im.naturalWidth, h = im.naturalHeight;
            var rad = Math.max(w, h) * 0.75 + 8;
            if (t.x + rad < x0 || t.x - rad > x1 || t.y + rad < y0 || t.y - rad > y1) continue;

            ctx.save();
            ctx.translate(t.x, t.y);
            if (t.rotation) ctx.rotate(t.rotation * Math.PI / 180);
            ctx.scale(t.flipx === -1 ? -1 : 1, 1);
            // tile9 tidak terlihat di game -> dibuat semi transparan agar terlihat di editor.
            ctx.globalAlpha = (t.spritename === 'tile9') ? 0.55 : 1;
            ctx.drawImage(im, -w / 2, -h / 2, w, h);
            ctx.restore();
        }

        if (state.selected) drawSelection(state.selected, s);
        if (state.tool === 'brush' && state.brush && state.hover) drawGhost(s);
    }

    function tileDims(name) {
        var im = state.imgCache[name];
        var ts = tileSize();
        return {
            w: (im && im.naturalWidth) ? im.naturalWidth : ts,
            h: (im && im.naturalHeight) ? im.naturalHeight : ts
        };
    }

    function drawSelection(t, s) {
        var d = tileDims(t.spritename);
        ctx.save();
        ctx.translate(t.x, t.y);
        if (t.rotation) ctx.rotate(t.rotation * Math.PI / 180);
        ctx.lineWidth = 2 / s;
        ctx.strokeStyle = '#ffd54a';
        ctx.strokeRect(-d.w / 2, -d.h / 2, d.w, d.h);
        ctx.restore();
        ctx.fillStyle = '#ffd54a';
        ctx.beginPath();
        ctx.arc(t.x, t.y, 3 / s + 1, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawGhost(s) {
        var ts = tileSize();
        var cx = snapTo(state.hover.x), cy = snapTo(state.hover.y);
        var im = getImage(state.brush);
        var w = im.naturalWidth || ts, h = im.naturalHeight || ts;
        ctx.save();
        if (im.complete && im.naturalWidth) {
            ctx.globalAlpha = 0.65;
            ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h);
            ctx.globalAlpha = 1;
        }
        ctx.lineWidth = 1.5 / s;
        ctx.strokeStyle = '#4caf50';
        ctx.setLineDash([6 / s, 4 / s]);
        ctx.strokeRect(cx - ts / 2, cy - ts / 2, ts, ts);
        ctx.restore();
    }

    function hitTest(lv, wx, wy) {
        for (var i = lv.tiles.length - 1; i >= 0; i--) {
            var t = lv.tiles[i];
            var d = tileDims(t.spritename);
            var dx = wx - t.x, dy = wy - t.y;
            var a = -(t.rotation || 0) * Math.PI / 180;
            var rx = dx * Math.cos(a) - dy * Math.sin(a);
            var ry = dx * Math.sin(a) + dy * Math.cos(a);
            if (Math.abs(rx) <= d.w / 2 && Math.abs(ry) <= d.h / 2) return i;
        }
        return -1;
    }

    // ---------------------------------------------------------------- //
    // Riwayat (undo/redo) & mutasi
    // ---------------------------------------------------------------- //
    function snapshot() { return JSON.stringify(currentLevel()); }

    function markDirty() { state.dirty = true; updateStatus(); }

    function pushHistory() {
        state.undo.push(snapshot());
        if (state.undo.length > 80) state.undo.shift();
        state.redo.length = 0;
        markDirty();
    }

    function applySnapshot(json) {
        var lv = currentLevel();
        var data = JSON.parse(json);
        lv.width = data.width;
        lv.height = data.height;
        lv.tilesize = data.tilesize;
        lv.tiles = data.tiles;
        state.selected = null;
        state.dragging = null;
        renderLevelProps();
        renderTileProps();
        renderLevelList();
        updateStatus();
        scheduleDraw();
    }

    function undo() {
        if (!state.undo.length) return;
        state.redo.push(snapshot());
        applySnapshot(state.undo.pop());
    }

    function redo() {
        if (!state.redo.length) return;
        state.undo.push(snapshot());
        applySnapshot(state.redo.pop());
    }

    function addTileAt(wx, wy) {
        if (!state.brush) { toast('Pilih tile dari palet terlebih dahulu.', 'warn'); return; }
        pushHistory();
        var t = { x: snapTo(wx), y: snapTo(wy), flipx: 1, spritename: state.brush, rotation: 0, param: '' };
        currentLevel().tiles.push(t);
        state.selected = t;
        renderTileProps();
        renderLevelList();
        updateStatus();
        scheduleDraw();
    }

    function removeTileAt(wx, wy) {
        var lv = currentLevel();
        var i = hitTest(lv, wx, wy);
        if (i < 0) return;
        pushHistory();
        var t = lv.tiles[i];
        lv.tiles.splice(i, 1);
        if (state.selected === t) state.selected = null;
        renderTileProps();
        renderLevelList();
        updateStatus();
        scheduleDraw();
    }

    function deleteSelected() {
        var lv = currentLevel();
        if (!state.selected) return;
        var i = lv.tiles.indexOf(state.selected);
        if (i < 0) return;
        pushHistory();
        lv.tiles.splice(i, 1);
        state.selected = null;
        renderTileProps();
        renderLevelList();
        updateStatus();
        scheduleDraw();
    }

    function duplicateSelected() {
        var t = state.selected;
        if (!t) return;
        pushHistory();
        var copy = deepCopy(t);
        copy.x += tileSize();
        currentLevel().tiles.push(copy);
        state.selected = copy;
        renderTileProps();
        renderLevelList();
        updateStatus();
        scheduleDraw();
    }

    // ---------------------------------------------------------------- //
    // Interaksi canvas
    // ---------------------------------------------------------------- //
    var spaceDown = false;

    function canvasPos(e) {
        var r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function onMouseDown(e) {
        if (!currentLevel()) return;
        var p = canvasPos(e);
        var w = screenToWorld(p.x, p.y);

        if (e.button === 1 || (e.button === 0 && spaceDown)) {
            state.panning = { x: p.x, y: p.y, vx: state.view.x, vy: state.view.y };
            e.preventDefault();
            return;
        }
        if (e.button === 2) { // klik kanan = hapus
            removeTileAt(w.x, w.y);
            return;
        }
        if (e.button !== 0) return;

        var lv = currentLevel();
        if (state.tool === 'brush') {
            addTileAt(w.x, w.y);
        } else if (state.tool === 'erase') {
            removeTileAt(w.x, w.y);
        } else { // select
            var i = hitTest(lv, w.x, w.y);
            if (i >= 0) {
                state.selected = lv.tiles[i];
                state.dragging = { pushed: false };
            } else {
                state.selected = null;
            }
            renderTileProps();
            scheduleDraw();
        }
    }

    function onMouseMove(e) {
        var p = canvasPos(e);
        var w = screenToWorld(p.x, p.y);

        if (state.panning) {
            state.view.x = state.panning.vx - (p.x - state.panning.x) / state.view.scale;
            state.view.y = state.panning.vy - (p.y - state.panning.y) / state.view.scale;
            scheduleDraw();
            return;
        }
        if (state.dragging && state.selected) {
            if (!state.dragging.pushed) { pushHistory(); state.dragging.pushed = true; }
            state.selected.x = snapTo(w.x);
            state.selected.y = snapTo(w.y);
            renderTileProps();
            scheduleDraw();
            return;
        }
        state.hover = { x: w.x, y: w.y };
        var hi = el('hoverInfo');
        if (hi) hi.textContent = 'x ' + Math.round(w.x) + ', y ' + Math.round(w.y) + '  ·  grid ' + tileSize();
        scheduleDraw();
    }

    function onMouseUp() {
        state.panning = null;
        state.dragging = null;
    }

    function onWheel(e) {
        e.preventDefault();
        var p = canvasPos(e);
        zoomAt(p.x, p.y, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }

    // ---------------------------------------------------------------- //
    // Render panel
    // ---------------------------------------------------------------- //
    function esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function setTool(tool) {
        state.tool = tool;
        var btns = document.querySelectorAll('.tool[data-tool]');
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.toggle('active', btns[i].getAttribute('data-tool') === tool);
        }
        updateStatus();
        scheduleDraw();
    }

    function selectLevel(i) {
        if (i < 0 || i >= state.levels.length) return;
        state.current = i;
        state.selected = null;
        state.undo.length = 0;
        state.redo.length = 0;
        renderLevelList();
        renderLevelProps();
        renderTileProps();
        updateStatus();
        fitView();
        currentLevel().tiles.forEach(function (t) { getImage(t.spritename); });
    }

    function opBtn(label, title, fn, cls) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = label;
        b.title = title;
        if (cls) b.className = cls;
        b.addEventListener('click', fn);
        return b;
    }

    function renderLevelList() {
        var box = el('levelList');
        if (!box) return;
        box.innerHTML = '';
        state.levels.forEach(function (lv, i) {
            var item = document.createElement('div');
            item.className = 'level-item' + (i === state.current ? ' active' : '');

            var num = document.createElement('div');
            num.className = 'num';
            num.textContent = (i + 1);

            var meta = document.createElement('div');
            meta.className = 'meta';
            meta.innerHTML = '<b>' + lv.width + '×' + lv.height + '</b><br>' + lv.tiles.length + ' tile';

            var ops = document.createElement('div');
            ops.className = 'ops';
            ops.appendChild(opBtn('\u25B2', 'Naikkan', function (e) { e.stopPropagation(); moveLevel(i, -1); }));
            ops.appendChild(opBtn('\u25BC', 'Turunkan', function (e) { e.stopPropagation(); moveLevel(i, 1); }));
            ops.appendChild(opBtn('\u29C9', 'Duplikat', function (e) { e.stopPropagation(); duplicateLevel(i); }));
            ops.appendChild(opBtn('\u2715', 'Hapus', function (e) { e.stopPropagation(); deleteLevel(i); }, 'danger'));

            item.appendChild(num);
            item.appendChild(meta);
            item.appendChild(ops);
            item.addEventListener('click', function () { selectLevel(i); });
            box.appendChild(item);
        });
        var c = el('levelCount');
        if (c) c.textContent = state.levels.length;
    }

    function renderPalette() {
        var box = el('palette');
        if (!box) return;
        box.innerHTML = '';
        state.tiles.forEach(function (name) {
            var cat = categoryOf(name);
            var d = document.createElement('div');
            d.className = 'tile' + (state.brush === name ? ' active' : '');
            d.title = name + ' — ' + CAT_LABEL[cat];

            var img = document.createElement('img');
            img.src = ASSETS + name + '.png';
            img.alt = name;

            var s = document.createElement('span');
            s.textContent = name;

            var c = document.createElement('div');
            c.className = 'cat ' + cat;
            c.textContent = CAT_LABEL[cat];

            d.appendChild(img);
            d.appendChild(s);
            d.appendChild(c);
            d.addEventListener('click', function () {
                state.brush = name;
                setTool('brush');
                renderPalette();
                scheduleDraw();
            });
            box.appendChild(d);
        });
    }

    function on(id, ev, fn) {
        var node = el(id);
        if (node) node.addEventListener(ev, function () { fn(node); });
    }

    function renderTileProps() {
        var box = el('tileProps');
        if (!box) return;
        var t = state.selected;
        if (!t) {
            box.innerHTML = '<div class="empty">Belum ada tile terpilih.<br><br>' +
                'Gunakan alat <b>Pilih</b> lalu klik sebuah tile untuk mengubah propertinya, ' +
                'atau klik kanan di kanvas untuk menghapus tile.</div>';
            return;
        }
        var cat = categoryOf(t.spritename);
        var opts = state.tiles.map(function (n) {
            return '<option value="' + n + '"' + (n === t.spritename ? ' selected' : '') + '>' + n + '</option>';
        }).join('');

        box.innerHTML = '' +
            '<div class="tile-preview"><img src="' + ASSETS + t.spritename + '.png" alt="">' +
                '<div><div class="name">' + esc(t.spritename) + '</div>' +
                '<div class="hint">' + CAT_LABEL[cat] + '</div></div></div>' +
            '<div class="grid2">' +
                '<label>X<input type="number" id="txX" value="' + t.x + '"></label>' +
                '<label>Y<input type="number" id="txY" value="' + t.y + '"></label>' +
            '</div>' +
            '<div class="grid2">' +
                '<label>Rotasi<input type="number" id="txR" value="' + Math.round(t.rotation || 0) + '"></label>' +
                '<label>Flip X<select id="txF">' +
                    '<option value="1"' + (t.flipx === 1 ? ' selected' : '') + '>Normal</option>' +
                    '<option value="-1"' + (t.flipx === -1 ? ' selected' : '') + '>Cermin</option>' +
                '</select></label>' +
            '</div>' +
            '<label class="collab">Jenis tile<select id="txN">' + opts + '</select></label>' +
            '<label class="collab">Param<input type="text" id="txP" value="' + esc(t.param || '') + '" placeholder="mis. 3,1"></label>' +
            '<div class="btnrow">' +
                '<button type="button" id="txRotL">-90°</button>' +
                '<button type="button" id="txRotR">+90°</button>' +
                '<button type="button" id="txFlip">Flip</button>' +
            '</div>' +
            '<div class="btnrow">' +
                '<button type="button" id="txDup">Duplikat</button>' +
                '<button type="button" class="danger" id="txDel">Hapus</button>' +
            '</div>' +
            '<div class="hint">' + esc(paramHint(t)) + '</div>';

        on('txX', 'input', function (n) { t.x = Math.round(parseFloat(n.value) || 0); touchTile(); });
        on('txY', 'input', function (n) { t.y = Math.round(parseFloat(n.value) || 0); touchTile(); });
        on('txR', 'input', function (n) { t.rotation = Math.round(parseFloat(n.value) || 0); touchTile(); });
        on('txF', 'change', function (n) { t.flipx = parseInt(n.value, 10) === -1 ? -1 : 1; touchTile(); });
        on('txN', 'change', function (n) { t.spritename = n.value; renderTileProps(); touchTile(); });
        on('txP', 'input', function (n) { t.param = n.value; touchTile(); });
        on('txRotL', 'click', function () { t.rotation = Math.round(t.rotation || 0) - 90; renderTileProps(); touchTile(); });
        on('txRotR', 'click', function () { t.rotation = Math.round(t.rotation || 0) + 90; renderTileProps(); touchTile(); });
        on('txFlip', 'click', function () { t.flipx = t.flipx === -1 ? 1 : -1; renderTileProps(); touchTile(); });
        on('txDup', 'click', duplicateSelected);
        on('txDel', 'click', deleteSelected);
    }

    function paramHint(t) {
        if (t.spritename === 'tile9') {
            return 'Tile teleport. Param berisi "levelTujuan,titikMasuk" (mis. "3,1" = level 3, titik ke-1). ';
        }
        if (t.spritename === 'tile16') {
            return 'Pada data lama tile16 kadang memiliki param; biasanya dibiarkan kosong.';
        }
        return 'Param umumnya dibiarkan kosong untuk tile selain teleport.';
    }

    function touchTile() {
        markDirty();
        scheduleDraw();
    }

    function renderLevelProps() {
        var box = el('levelProps');
        if (!box) return;
        var lv = currentLevel();
        if (!lv) { box.innerHTML = '<div class="empty">Tidak ada level.</div>'; return; }
        box.innerHTML = '' +
            '<div class="grid2">' +
                '<label>Lebar (px)<input type="number" id="lvW" value="' + lv.width + '"></label>' +
                '<label>Tinggi (px)<input type="number" id="lvH" value="' + lv.height + '"></label>' +
            '</div>' +
            '<div class="row"><span>Tilesize</span><input type="number" id="lvT" value="' + lv.tilesize + '"></div>' +
            '<div class="row"><span>Jumlah tile</span><b>' + lv.tiles.length + '</b></div>' +
            '<div class="btnrow">' +
                '<button type="button" id="lvFit">Fit tampilan</button>' +
                '<button type="button" class="danger" id="lvClear">Kosongkan</button>' +
            '</div>' +
            '<div class="hint">Lebar &amp; tinggi sebaiknya kelipatan tilesize. Grid kanvas mengikuti tilesize.</div>';

        on('lvW', 'change', function (n) { lv.width = Math.max(1, parseInt(n.value, 10) || 1); afterMeta(); });
        on('lvH', 'change', function (n) { lv.height = Math.max(1, parseInt(n.value, 10) || 1); afterMeta(); });
        on('lvT', 'change', function (n) { lv.tilesize = String(Math.max(1, parseInt(n.value, 10) || 32)); afterMeta(); });
        on('lvFit', 'click', fitView);
        on('lvClear', 'click', function () {
            if (!lv.tiles.length) return;
            if (!confirm('Hapus semua tile pada level ' + (state.current + 1) + '?')) return;
            pushHistory();
            lv.tiles = [];
            state.selected = null;
            renderLevelProps(); renderTileProps(); renderLevelList(); updateStatus(); scheduleDraw();
        });
    }

    function afterMeta() {
        markDirty();
        renderLevelList();
        scheduleDraw();
    }

    function updateStatus() {
        var lv = currentLevel();
        var parts = [];
        if (lv) {
            parts.push('Level ' + (state.current + 1) + ' / ' + state.levels.length);
            parts.push(lv.tiles.length + ' tile');
        }
        var toolName = { brush: 'Kuas', select: 'Pilih', erase: 'Hapus' }[state.tool] || state.tool;
        parts.push('Alat: ' + toolName);
        parts.push(state.dirty ? '<span class="dirty">\u25CF Belum disimpan</span>' : '<span class="ok">\u2713 Tersimpan</span>');
        setStatus(parts.join(' &nbsp;·&nbsp; '));
    }

    // ---------------------------------------------------------------- //
    // Operasi level (tambah / duplikat / hapus / pindah)
    // ---------------------------------------------------------------- //
    function resetHistory() { state.undo.length = 0; state.redo.length = 0; }

    function addLevel() {
        resetHistory();
        state.levels.push({ width: 1024, height: 1024, tilesize: '32', tiles: [] });
        markDirty();
        selectLevel(state.levels.length - 1);
        toast('Level baru ditambahkan.');
    }

    function duplicateLevel(i) {
        resetHistory();
        var copy = deepCopy(state.levels[i]);
        state.levels.splice(i + 1, 0, copy);
        markDirty();
        selectLevel(i + 1);
        toast('Level ' + (i + 1) + ' diduplikasi.');
    }

    function deleteLevel(i) {
        if (state.levels.length <= 1) { toast('Minimal harus ada satu level.', 'warn'); return; }
        if (!confirm('Hapus level ' + (i + 1) + ' secara permanen?')) return;
        resetHistory();
        state.levels.splice(i, 1);
        markDirty();
        selectLevel(Math.min(i, state.levels.length - 1));
        toast('Level ' + (i + 1) + ' dihapus.');
    }

    function moveLevel(i, dir) {
        var j = i + dir;
        if (j < 0 || j >= state.levels.length) return;
        resetHistory();
        var tmp = state.levels[i];
        state.levels[i] = state.levels[j];
        state.levels[j] = tmp;
        if (state.current === i) state.current = j;
        else if (state.current === j) state.current = i;
        markDirty();
        renderLevelList();
        renderLevelProps();
        toast('Level dipindah.');
    }

    // ---------------------------------------------------------------- //
    // Simpan / muat / export / import
    // ---------------------------------------------------------------- //
    function save() {
        setStatus('Menyimpan…');
        fetch(API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save', levels: state.levels })
        }).then(function (r) {
            return r.json().then(function (d) { return { ok: r.ok, d: d }; });
        }).then(function (res) {
            if (!res.ok || !res.d.ok) throw new Error((res.d && res.d.error) || 'Gagal menyimpan');
            state.dirty = false;
            updateStatus();
            toast('Tersimpan \u2713 (' + res.d.saved + ' level)');
        }).catch(function (err) {
            toast('Gagal menyimpan: ' + err.message, 'error');
            updateStatus();
        });
    }

    function load() {
        setStatus('Memuat data level…');
        return fetch(API + '?action=state').then(function (r) {
            return r.json().then(function (d) { return { ok: r.ok, d: d }; });
        }).then(function (res) {
            if (!res.ok || !res.d.ok) throw new Error((res.d && res.d.error) || 'Gagal memuat data');
            var d = res.d;
            state.levels = d.levels || [];
            state.tiles = d.tiles || [];
            state.current = 0;
            state.dirty = false;
            state.imgCache = {};
            state.grass = new Image();
            state.grass.onload = scheduleDraw;
            state.grass.src = ASSETS + 'grass.jpg';
            (d.tiles || []).forEach(getImage);
            state.levels.forEach(function (lv) {
                (lv.tiles || []).forEach(function (t) { getImage(t.spritename); });
            });
            state.brush = state.tiles[0] || null;

            renderLevelList();
            renderPalette();
            renderLevelProps();
            renderTileProps();
            setTool(state.tool);
            if (state.levels.length) {
                selectLevel(0);
                toast('Berhasil memuat ' + state.levels.length + ' level.');
            } else {
                updateStatus();
                toast('Tidak ada level pada file.', 'warn');
            }
        }).catch(function (err) {
            toast('Gagal memuat: ' + err.message, 'error');
            setStatus('<span class="dirty">Gagal memuat data level.</span>');
        });
    }

    function exportJson() {
        var blob = new Blob([JSON.stringify(state.levels, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'leveltiles.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        toast('Data level diekspor sebagai JSON.');
    }

    function importJson(file) {
        var reader = new FileReader();
        reader.onload = function () {
            try {
                var raw = String(reader.result);
                // Dukung file JSON murni maupun file leveltiles.js.
                var s = raw.indexOf('['), e = raw.lastIndexOf(']');
                var text = (s > -1 && e > s) ? raw.slice(s, e + 1) : raw;
                text = text.split(/\r\n|\r|\n/).filter(function (l) {
                    return !/^\s*\/\//.test(l);
                }).join('\n');
                var levels = JSON.parse(text);
                if (!Array.isArray(levels) || !levels.length) throw new Error('data kosong');
                if (!confirm('Ganti seluruh level di editor dengan ' + levels.length +
                    ' level dari file ini? Perubahan baru tersimpan setelah menekan Simpan.')) return;
                state.levels = levels;
                state.current = 0;
                state.dirty = true;
                state.levels.forEach(function (lv) {
                    (lv.tiles || []).forEach(function (t) { getImage(t.spritename); });
                });
                renderLevelList();
                selectLevel(0);
                toast('Import berhasil: ' + levels.length + ' level.');
            } catch (err) {
                toast('Import gagal: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    // ---------------------------------------------------------------- //
    // UI & input
    // ---------------------------------------------------------------- //
    function bindUI() {
        on('btnNew', 'click', addLevel);
        on('btnSave', 'click', save);
        on('btnReload', 'click', function () {
            if (state.dirty && !confirm('Perubahan yang belum disimpan akan hilang. Muat ulang dari file?')) return;
            load();
        });
        on('btnUndo', 'click', undo);
        on('btnRedo', 'click', redo);
        on('btnExport', 'click', exportJson);
        on('btnImport', 'click', function () { var f = el('importFile'); if (f) f.click(); });
        on('importFile', 'change', function (n) {
            if (n.files && n.files[0]) { importJson(n.files[0]); n.value = ''; }
        });
        on('btnZoomIn', 'click', function () { zoomAt(state.cw / 2, state.ch / 2, 1.2); });
        on('btnZoomOut', 'click', function () { zoomAt(state.cw / 2, state.ch / 2, 1 / 1.2); });
        on('btnFit', 'click', fitView);
        on('snapSelect', 'change', function (n) { state.snap = parseInt(n.value, 10) || 0; scheduleDraw(); });
        on('gridToggle', 'change', function (n) { state.showGrid = n.checked; scheduleDraw(); });

        var tools = document.querySelectorAll('.tool[data-tool]');
        for (var i = 0; i < tools.length; i++) {
            (function (btn) {
                btn.addEventListener('click', function () { setTool(btn.getAttribute('data-tool')); });
            })(tools[i]);
        }
    }

    function nudge(dx, dy, e) {
        if (!state.selected) return;
        e.preventDefault();
        var step = state.snap > 0 ? state.snap : 1;
        state.selected.x += dx * step;
        state.selected.y += dy * step;
        touchTile();
        renderTileProps();
    }

    function onKeyDown(e) {
        if (e.target && /^(input|select|textarea)$/i.test(e.target.tagName)) return;
        if (e.code === 'Space') { spaceDown = true; e.preventDefault(); return; }
        var ctrl = e.ctrlKey || e.metaKey;
        var k = (e.key || '').toLowerCase();
        if (ctrl && k === 's') { e.preventDefault(); save(); return; }
        if (ctrl && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
        if (ctrl && k === 'y') { e.preventDefault(); redo(); return; }

        switch (k) {
            case 'b': setTool('brush'); break;
            case 's': setTool('select'); break;
            case 'e': setTool('erase'); break;
            case 'delete': case 'backspace':
                if (state.selected) { e.preventDefault(); deleteSelected(); }
                break;
            case '+': case '=': zoomAt(state.cw / 2, state.ch / 2, 1.2); break;
            case '-': zoomAt(state.cw / 2, state.ch / 2, 1 / 1.2); break;
            case 'arrowleft': nudge(-1, 0, e); break;
            case 'arrowright': nudge(1, 0, e); break;
            case 'arrowup': nudge(0, -1, e); break;
            case 'arrowdown': nudge(0, 1, e); break;
        }
    }

    function init() {
        canvas = el('board');
        wrap = el('canvasWrap');
        toastEl = el('toast');
        statusEl = el('statusBar');
        if (!canvas || !wrap) return;
        ctx = canvas.getContext('2d');

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        if (window.ResizeObserver) {
            new ResizeObserver(function () { resizeCanvas(); }).observe(wrap);
        }

        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('wheel', onWheel, { passive: false });
        canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', function (e) { if (e.code === 'Space') spaceDown = false; });
        window.addEventListener('beforeunload', function (e) {
            if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
        });

        bindUI();
        setTool('brush');
        load();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
