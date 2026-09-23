/* ---------------------------------------------------------------------------
   sokobandl replay — plays recorded traces (assets/sokobandl-trace.js) back on
   the day's sealed level page, several players side by side.

   Each lane is one trace: an iframe of ../levels/<date>.html?embed=1 driven
   over postMessage ('sokoban-player-host': load / move / undo / reset) by the
   trace's events, plus a timeline strip. Lanes are aligned at the moment the
   day's puzzle (first non-tutorial level) appeared, so the clock reads "time
   since the board was on screen" for everyone.

   One shared playback clock scrubs all lanes. With "skip pauses" on, stretches
   where nobody did anything for more than IDLE ms are compressed to IDLE, on
   a common axis so the lanes stay aligned. Seeking is a reset of the level
   page followed by a fast re-dispatch of every event up to the target.
   --------------------------------------------------------------------------- */
(function () {
	'use strict';

	var Trace = window.SokobandlTrace;
	var HOST = 'sokoban-player-host';
	var PLAYER = 'sokoban-player';
	var IDLE = 5000;
	var TAIL = 1200;          // ms shown after a win when clipping

	var $ = function (id) { return document.getElementById(id); };
	var pad = function (n) { return String(n).padStart(2, '0'); };
	function fmt(ms) {
		var s = Math.floor(Math.max(0, ms) / 1000);
		var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
		return (h ? h + ':' + pad(m) : m) + ':' + pad(s % 60);
	}
	function el(tag, cls, text) {
		var n = document.createElement(tag);
		if (cls) n.className = cls;
		if (text != null) n.textContent = text;
		return n;
	}

	var lanes = [];
	var playing = false;
	var playT = 0;            // playback clock, ms (compressed axis)
	var duration = 1;
	var axis = null;          // compression table: [{p, a}] play-time -> aligned-time knots
	var rafId = 0, lastFrame = 0;

	// ---- axis --------------------------------------------------------------

	function aligned(lane, ev) { return ev.t - lane.origin; }
	function isAction(ev) {
		return ev.type === 'move' || ev.type === 'undo' || ev.type === 'reset' ||
			ev.type === 'level' || ev.type === 'ready' || ev.type === 'win' || ev.type === 'dead';
	}

	// Build the shared axis from every lane's actions between 0 and its end.
	function rebuildAxis() {
		var times = [0];
		var end = 0;
		lanes.forEach(function (lane) {
			end = Math.max(end, lane.end);
			lane.trace.events.forEach(function (ev) {
				var a = aligned(lane, ev);
				if (isAction(ev) && a > 0 && a <= lane.end) times.push(a);
			});
		});
		times.push(end);
		times.sort(function (x, y) { return x - y; });
		var skip = $('rpSkipIdle').checked;
		var knots = [{ p: 0, a: 0 }];
		var p = 0, prev = 0;
		times.forEach(function (a) {
			if (a <= prev) return;
			var gap = a - prev;
			p += skip ? Math.min(gap, IDLE) : gap;
			knots.push({ p: p, a: a });
			prev = a;
		});
		axis = knots;
		duration = Math.max(1, p);
	}
	function toAligned(pt) {
		if (!axis) return pt;
		for (var i = 1; i < axis.length; i++) {
			if (pt <= axis[i].p) {
				var k0 = axis[i - 1], k1 = axis[i];
				var f = k1.p === k0.p ? 1 : (pt - k0.p) / (k1.p - k0.p);
				return k0.a + f * (k1.a - k0.a);
			}
		}
		return axis[axis.length - 1].a;
	}
	function toPlay(at) {
		if (!axis) return at;
		for (var i = 1; i < axis.length; i++) {
			if (at <= axis[i].a) {
				var k0 = axis[i - 1], k1 = axis[i];
				var f = k1.a === k0.a ? 1 : (at - k0.a) / (k1.a - k0.a);
				return k0.p + f * (k1.p - k0.p);
			}
		}
		return axis[axis.length - 1].p;
	}

	// ---- lanes -------------------------------------------------------------

	function addLane(trace, label) {
		var sum = Trace.summarize(trace);
		var lane = {
			trace: trace, sum: sum,
			origin: sum.startT == null ? (trace.events[0] ? trace.events[0].t : 0) : sum.startT,
			cursor: 0, ready: false, live: { moves: 0, state: '' }
		};
		lane.end = 0;
		setLaneEnd(lane);

		var box = el('div', 'sok-lane');
		var head = el('div', 'sok-lane-head');
		var name = el('input');
		name.value = label || trace.player || ('player ' + (lanes.length + 1));
		name.title = 'label';
		name.addEventListener('change', function () { trace.player = name.value; });
		head.appendChild(name);
		var meta = el('div', 'sok-lane-meta',
			trace.date + ' · ' + (sum.solved ? 'solved in ' + fmt(sum.elapsedMs) : 'unsolved') +
			' · ' + sum.moves + ' moves, ' + sum.undos + ' undos, ' + sum.resets + ' resets' +
			(sum.sessions > 1 ? ', ' + sum.sessions + ' sittings' : ''));
		head.appendChild(meta);
		var remove = el('button', 'sok-lane-remove', 'remove');
		remove.type = 'button';
		remove.addEventListener('click', function () { removeLane(lane); });
		head.appendChild(remove);
		box.appendChild(head);

		var frame = el('iframe');
		frame.title = 'replay of ' + name.value;
		frame.setAttribute('allowtransparency', 'true');
		box.appendChild(frame);

		var live = el('p', 'sok-lane-live');
		box.appendChild(live);
		var tl = el('canvas', 'sok-timeline');
		tl.addEventListener('click', function (e) {
			var r = tl.getBoundingClientRect();
			seek(duration * (e.clientX - r.left) / r.width);
		});
		box.appendChild(tl);
		if (!sum.hasDirs) {
			box.appendChild(el('p', 'sok-lane-warn',
				'This trace has moves without a direction (recorded before the player reported them), so the board cannot be driven; the timeline still plays.'));
		}
		if (lanes.length && lanes[0].trace.date !== trace.date) {
			box.appendChild(el('p', 'sok-lane-warn', 'Different day from the first lane (' + lanes[0].trace.date + ').'));
		}

		lane.el = box; lane.frame = frame; lane.live = live; lane.tl = tl; lane.name = name;
		lanes.push(lane);
		$('rpLanes').appendChild(box);
		$('rpTransport').hidden = false;
		$('rpClear').hidden = false;

		var levels = trace.levels && trace.levels.length ? trace.levels.length : 1;
		var file = trace.file || ('levels/' + trace.date + '.html');
		frame.src = '../' + file + '?embed=1' + (levels > 1 ? '' : '&bar=0');

		rebuildAxis();
		drawAll();
		updateLive(lane, toAligned(playT));
	}

	function setLaneEnd(lane) {
		var sum = lane.sum;
		var clip = $('rpClip').checked && sum.winT != null;
		lane.end = (clip ? sum.winT + TAIL : sum.endT) - lane.origin;
		if (lane.end < 0) lane.end = 0;
	}

	function removeLane(lane) {
		lanes = lanes.filter(function (l) { return l !== lane; });
		lane.el.remove();
		if (!lanes.length) { $('rpTransport').hidden = true; $('rpClear').hidden = true; pause(); playT = 0; }
		rebuildAxis();
		drawAll();
		updateScrub();
	}

	function post(lane, msg) {
		if (lane.frame.contentWindow) {
			lane.frame.contentWindow.postMessage(Object.assign({ source: HOST }, msg), '*');
		}
	}

	function drive(lane, ev) {
		switch (ev.type) {
			case 'level': post(lane, { type: 'load', index: ev.index }); break;
			case 'move': if (typeof ev.dir === 'number') post(lane, { type: 'move', dir: ev.dir }); break;
			case 'undo': post(lane, { type: 'undo' }); break;
			case 'reset': post(lane, { type: 'reset' }); break;
		}
	}

	// Dispatch every event up to aligned time `at` from the lane's cursor.
	function advance(lane, at) {
		var evs = lane.trace.events;
		while (lane.cursor < evs.length && aligned(lane, evs[lane.cursor]) <= at) {
			if (lane.ready && aligned(lane, evs[lane.cursor]) <= lane.end) drive(lane, evs[lane.cursor]);
			lane.cursor++;
		}
	}

	// Put the lane's board at aligned time `at` from scratch.
	function seekLane(lane, at) {
		lane.cursor = 0;
		if (lane.ready) post(lane, { type: 'load', index: 0 });
		advance(lane, at);
		updateLive(lane, at);
	}

	// What the live line should say at aligned time `at`, from the trace.
	function updateLive(lane, at) {
		var moves = 0, state = '', tutorial = false, cur = null;
		var evs = lane.trace.events;
		for (var i = 0; i < evs.length && aligned(lane, evs[i]) <= at; i++) {
			var e = evs[i];
			if (e.type === 'ready') { cur = e.level; tutorial = !!(lane.trace.levels[cur] && lane.trace.levels[cur].tutorial); }
			if (e.type === 'level') { cur = e.index; tutorial = !!e.tutorial; moves = 0; state = ''; }
			if (e.type === 'move' || e.type === 'undo') { moves = e.moves; state = ''; }
			if (e.type === 'dead') state = 'dead';
			if (e.type === 'win') state = e.tutorial ? 'tutorial done' : 'won';
		}
		var t = at < 0 ? 'tutorial' : fmt(at);
		lane.live.className = 'sok-lane-live' + (state === 'dead' ? ' is-dead' : state === 'won' ? ' is-won' : '');
		lane.live.innerHTML = '<b>' + t + '</b> · ' + moves + ' moves' +
			(tutorial ? ' · tutorial' : '') +
			(state === 'dead' ? ' · fell in' : state === 'won' ? ' · solved' : state === 'tutorial done' ? ' · tutorial done' : '');
	}

	// ---- timelines ---------------------------------------------------------

	var COLORS = { move: '#9B50CE', undo: '#d9534f', reset: '#3b2438', dead: '#e0862c', win: '#2f9a5a', hidden: 'rgba(80,60,75,0.14)' };

	function drawLane(lane) {
		var c = lane.tl, dpr = window.devicePixelRatio || 1;
		var w = c.clientWidth || 300, h = 44;
		if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr; }
		var g = c.getContext('2d');
		g.setTransform(dpr, 0, 0, dpr, 0, 0);
		g.clearRect(0, 0, w, h);
		var x = function (a) { return Math.round(toPlay(a) / duration * (w - 2)) + 1; };

		// hidden-tab spans, then the part past this lane's end
		var evs = lane.trace.events, hiddenAt = null;
		g.fillStyle = COLORS.hidden;
		evs.forEach(function (e) {
			var a = aligned(lane, e);
			if (e.type === 'hidden') hiddenAt = a;
			if (e.type === 'visible' && hiddenAt != null) { g.fillRect(x(hiddenAt), 0, Math.max(1, x(a) - x(hiddenAt)), h); hiddenAt = null; }
		});
		g.fillStyle = 'rgba(255,255,255,0.55)';
		g.fillRect(x(lane.end), 0, w, h);

		evs.forEach(function (e) {
			var a = aligned(lane, e);
			if (a < 0 || a > lane.end) return;
			var px = x(a);
			switch (e.type) {
				case 'move': g.fillStyle = COLORS.move; g.fillRect(px, 14, 1.5, 16); break;
				case 'undo': g.fillStyle = COLORS.undo; g.fillRect(px, 20, 1.5, 20); break;
				case 'reset': g.fillStyle = COLORS.reset; g.fillRect(px - 1, 6, 3, 34); break;
				case 'dead': g.fillStyle = COLORS.dead; g.beginPath(); g.arc(px, 10, 3, 0, 7); g.fill(); break;
				case 'win': if (!e.tutorial) { g.fillStyle = COLORS.win; g.fillRect(px - 2, 4, 4, 36); } break;
			}
		});

		// playhead
		g.fillStyle = 'rgba(59,36,56,0.8)';
		g.fillRect(Math.round(playT / duration * (w - 2)) + 1, 0, 1.5, h);
	}
	function drawAll() { lanes.forEach(drawLane); }

	// ---- transport ---------------------------------------------------------

	function updateScrub() {
		$('rpScrub').value = Math.round(playT / duration * 1000);
		$('rpClock').textContent = fmt(toAligned(playT));
	}

	function seek(pt) {
		playT = Math.max(0, Math.min(duration, pt));
		var at = toAligned(playT);
		lanes.forEach(function (lane) { seekLane(lane, at); });
		updateScrub();
		drawAll();
		if (playT >= duration) pause();
	}

	function tick(now) {
		if (!playing) return;
		var dt = lastFrame ? now - lastFrame : 0;
		lastFrame = now;
		playT += dt * Number($('rpSpeed').value);
		if (playT >= duration) { playT = duration; }
		var at = toAligned(playT);
		lanes.forEach(function (lane) { advance(lane, at); updateLive(lane, at); });
		updateScrub();
		drawAll();
		if (playT >= duration) { pause(); return; }
		rafId = requestAnimationFrame(tick);
	}

	function play() {
		if (playing || !lanes.length) return;
		if (playT >= duration) seek(0);
		playing = true; lastFrame = 0;
		$('rpPlay').innerHTML = '&#x23F8; pause';
		rafId = requestAnimationFrame(tick);
	}
	function pause() {
		playing = false;
		cancelAnimationFrame(rafId);
		$('rpPlay').innerHTML = '&#x25B6; play';
	}

	$('rpPlay').addEventListener('click', function () { playing ? pause() : play(); });
	$('rpRestart').addEventListener('click', function () { pause(); seek(0); });
	$('rpScrub').addEventListener('input', function () {
		var was = playing; pause();
		seek(duration * Number(this.value) / 1000);
		if (was) play();
	});
	['rpClip', 'rpSkipIdle'].forEach(function (id) {
		$(id).addEventListener('change', function () {
			var at = toAligned(playT);
			lanes.forEach(setLaneEnd);
			rebuildAxis();
			seek(toPlay(at));
		});
	});
	window.addEventListener('resize', drawAll);
	window.addEventListener('keydown', function (e) {
		var tag = (e.target && e.target.tagName) || '';
		if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
		if (e.key === ' ') { e.preventDefault(); playing ? pause() : play(); }
	});

	// Lanes catch up when their page is ready (it may load after a seek).
	window.addEventListener('message', function (e) {
		var m = e.data;
		if (!m || m.source !== PLAYER) return;
		lanes.forEach(function (lane) {
			if (e.source !== lane.frame.contentWindow) return;
			if (m.type === 'size') {
				var h = m.height;
				try { h = lane.frame.contentDocument.documentElement.getBoundingClientRect().height; } catch (err) { /* keep reported */ }
				lane.frame.style.height = Math.min(700, Math.ceil(h) + 8) + 'px';
			} else if (m.type === 'ready' && !lane.ready) {
				lane.ready = true;
				seekLane(lane, toAligned(playT));
			}
		});
	});

	// ---- loading -----------------------------------------------------------

	function note(text) { $('rpNote').textContent = text; }

	function addText(text, label) {
		return Trace.parse(text).then(function (trace) {
			addLane(trace, label);
			note('loaded ' + lanes.length + ' trace' + (lanes.length === 1 ? '' : 's'));
		}).catch(function (err) { note((label ? label + ': ' : '') + err.message); });
	}
	function addFiles(files) {
		Array.prototype.forEach.call(files, function (f) {
			f.text().then(function (text) { addText(text, f.name.replace(/\.(json|txt)$/i, '').replace(/^sokobandl-\d{4}-\d\d-\d\d-?/, '') || undefined); });
		});
	}

	var drop = $('rpDrop');
	$('rpFiles').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
	['dragenter', 'dragover'].forEach(function (ev) {
		drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
	});
	['dragleave', 'drop'].forEach(function (ev) {
		drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
	});
	drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });

	$('rpAdd').addEventListener('click', function () {
		var text = $('rpPaste').value.trim();
		if (!text) return;
		// Several pasted lines at once are fine.
		var parts = text.split(/\s+(?=sokobandl-trace:)/);
		Promise.all(parts.map(function (p) { return addText(p); })).then(function () { $('rpPaste').value = ''; });
	});
	$('rpLocal').addEventListener('click', function () {
		var mine = Trace.listLocal();
		if (!mine.length) { note('no traces recorded in this browser yet'); return; }
		mine.forEach(function (t) { addLane(t, 'me · ' + t.date); });
		note('loaded ' + lanes.length + ' trace' + (lanes.length === 1 ? '' : 's'));
	});
	$('rpClear').addEventListener('click', function () {
		pause();
		lanes.slice().forEach(removeLane);
		note('');
	});

	// legend
	var legend = el('div', 'sok-legend');
	[['move', 'move'], ['undo', 'undo'], ['reset', 'reset'], ['dead', 'fell in'], ['win', 'solved'], ['hidden', 'tab hidden']].forEach(function (p) {
		var s = el('span'); var i = el('i'); i.style.background = COLORS[p[0]]; s.appendChild(i); s.appendChild(document.createTextNode(p[1])); legend.appendChild(s);
	});
	$('rpTransport').appendChild(legend);
})();
