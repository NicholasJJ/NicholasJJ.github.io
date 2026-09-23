/* ---------------------------------------------------------------------------
   sokobandl — the daily sokoban shell.

   The puzzle generator publishes ./index.json (a manifest of days) and one
   sealed, self-contained page per day under ./levels/. This script:

     1. reads the manifest and picks a day: today's (or the latest before
        it), or ?d=YYYY-MM-DD. Only days up to today are *listed* (archive,
        prev/next); a typed ?d= link to a later day still loads, which is fine
        for a puzzle;
     2. shows that day's page in the iframe with ?embed=1 and sizes the frame
        from the page's own `size` messages;
     3. listens to the page (postMessage, source 'sokoban-player') for the
        timer and the result, and drives it (source 'sokoban-player-host')
        from the undo/reset buttons and forwarded keys;
     4. keeps per-day progress in localStorage under 'sokobandl:<date>'.

   The protocol is documented in sokobandl/README.md and must not change; the
   look is ours (assets/sokobandl.css).
   --------------------------------------------------------------------------- */
(function () {
	'use strict';

	var PLAYER = 'sokoban-player';
	var HOST = 'sokoban-player-host';
	var STORE = 'sokobandl:';

	var $ = function (id) { return document.getElementById(id); };
	var pad = function (n) { return String(n).padStart(2, '0'); };
	var localDate = function (d) {
		return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
	};
	var today = localDate(new Date());

	function fmt(ms) {
		var s = Math.floor(ms / 1000);
		var h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
		return (h ? h + ':' + pad(m) : m) + ':' + pad(s % 60);
	}
	function prettyDate(iso) {
		// Noon avoids the day shifting under a timezone offset.
		var d = new Date(iso + 'T12:00:00');
		return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
	}
	function summary(day) {
		var s = day.w + '×' + day.h + ', ' + day.boxes + (day.boxes === 1 ? ' crate' : ' crates');
		if (day.mechanics && day.mechanics.length) s += ' · ' + day.mechanics.join(', ');
		return s;
	}

	function loadRecord(date) {
		try { return JSON.parse(localStorage.getItem(STORE + date) || 'null') || {}; }
		catch (e) { return {}; }
	}
	function saveRecord(date, rec) {
		try { localStorage.setItem(STORE + date, JSON.stringify(rec)); } catch (e) { /* private mode etc. */ }
	}

	// The editable strings (assets/sokobandl-text.js); tolerate it missing.
	var TEXT = window.SOKOBANDL_TEXT || {};
	function pick(list) {
		return (list && list.length) ? list[Math.floor(Math.random() * list.length)] : '';
	}
	// "m:ss" or "h:mm:ss" -> milliseconds; anything unparsable -> null.
	function parseClock(str) {
		if (str == null) return null;
		var parts = String(str).trim().split(':').map(Number);
		if (!parts.length || parts.some(isNaN)) return null;
		var s = 0;
		parts.forEach(function (n) { s = s * 60 + n; });
		return s * 1000;
	}
	// The tail for a solve of `elapsedMs`: the first tier in TEXT.results whose
	// [from, until) range contains it, or '' if none does.
	function resultTail(elapsedMs) {
		var tiers = TEXT.results || [];
		for (var i = 0; i < tiers.length; i++) {
			var from = parseClock(tiers[i].from), until = parseClock(tiers[i].until);
			if (from != null && elapsedMs < from) continue;
			if (until != null && elapsedMs >= until) continue;
			return pick(tiers[i].text);
		}
		return '';
	}

	function dayLink(date) { return '?d=' + date; }
	function shareLink(date) { return location.origin + location.pathname + dayLink(date); }

	function el(tag, cls, text) {
		var n = document.createElement(tag);
		if (cls) n.className = cls;
		if (text != null) n.textContent = text;
		return n;
	}

	// ---- views -------------------------------------------------------------

	function showEmpty(text) {
		$('sokEmpty').textContent = text;
		$('sokEmpty').hidden = false;
	}

	// `listed` is always the released days only (date <= today), oldest first.
	function showArchive(listed) {
		document.title = 'sokobandl · archive';
		$('sokDate').textContent = listed.length ? 'every puzzle so far' : 'no puzzles yet';
		var nav = $('sokNav');
		var latest = el('a', null, '← back to today');
		latest.href = './';
		nav.appendChild(latest);

		var list = $('sokArchive');
		listed.slice().reverse().forEach(function (day) {
			var rec = loadRecord(day.date);
			var li = el('li');
			var a = el('a');
			a.href = dayLink(day.date);
			if (rec.finishedAt) a.classList.add('is-done');
			a.appendChild(el('span', 'sok-arch-date', day.date));
			var meta = summary(day);
			if (rec.finishedAt) meta += ' · ✓ ' + fmt(rec.elapsedMs) + ', ' + rec.moves + ' moves';
			a.appendChild(el('span', 'sok-arch-meta', meta));
			li.appendChild(a);
			list.appendChild(li);
		});
		list.hidden = false;
	}

	function showDay(day, listed) {
		// Neighbours come from the released days only, so the page never links
		// forward to an unreleased puzzle (even when viewing one directly).
		var prev = null, next = null;
		listed.forEach(function (d) {
			if (d.date < day.date) prev = d;
			else if (d.date > day.date && !next) next = d;
		});
		var latest = listed[listed.length - 1];
		var isLatest = !!latest && latest.date === day.date;
		document.title = 'sokobandl · ' + day.date;

		var dateEl = $('sokDate');
		dateEl.appendChild(el('b', null, prettyDate(day.date)));
		var tag = day.date === today ? 'today' : (day.date > today ? 'upcoming' : '');
		dateEl.appendChild(document.createTextNode((tag ? ' · ' + tag : '') + ' · ' + summary(day)));
		if (day.tutorials && day.tutorials.length) {
			dateEl.appendChild(el('br'));
			dateEl.appendChild(document.createTextNode(
				'New today: ' + day.tutorials.join(', ') + '. A short untimed tutorial comes first.'));
		}

		var nav = $('sokNav');
		if (prev) { var p = el('a', null, '← ' + prev.date); p.href = dayLink(prev.date); nav.appendChild(p); }
		var arch = el('a', null, 'archive'); arch.href = '?archive'; nav.appendChild(arch);
		if (next) { var n = el('a', null, next.date + ' →'); n.href = dayLink(next.date); nav.appendChild(n); }
		else if (!isLatest && latest) { var l = el('a', null, 'latest'); l.href = './'; nav.appendChild(l); }

		$('sokGame').hidden = false;
		runGame(day);
	}

	// ---- the game ----------------------------------------------------------

	function runGame(day) {
		var frame = $('sokFrame');
		var status = $('sokStatus');
		var rec = loadRecord(day.date);
		var ticking = null;
		var moves = 0;
		var onTutorial = false;

		// ---- the action trace (assets/sokobandl-trace.js): every intent and
		// every accepted move, with timing, kept in this browser only.
		var Trace = window.SokobandlTrace;
		var recorder = Trace ? Trace.open(day) : { add: function () {}, flush: function () {}, trace: null };
		// Directions come from the page itself: its `move` message carries
		// `dir` (0 up, 1 down, 2 left, 3 right, 4 action). Intents are recorded
		// separately (watchInputs below) so rejected inputs are visible too.
		function noteInput(kind, dir, src) {
			return recorder.add('input', dir == null ? { kind: kind, src: src } : { kind: kind, dir: dir, src: src });
		}

		// Host-driven inputs carry their source with them; the page ignores the
		// extra field and the capture listener inside the frame records it.
		function post(msg, src) {
			if (frame.contentWindow) {
				frame.contentWindow.postMessage(Object.assign({ source: HOST, src: src || 'host' }, msg), '*');
			}
		}

		// The page reports documentElement.scrollHeight, which is never smaller
		// than the frame it sits in, so trusting it alone only ever grows the
		// frame. The pages are same-origin, so measure the content directly and
		// fall back to the reported height if that is ever not possible.
		function fitFrame(reported) {
			var h = reported;
			try {
				var doc = frame.contentDocument;
				if (doc && doc.documentElement) h = doc.documentElement.getBoundingClientRect().height;
			} catch (e) { /* cross-origin: use the reported height */ }
			frame.style.height = Math.min(900, Math.ceil(h) + 8) + 'px';
		}

		function setStatus(html, dead) {
			status.innerHTML = html;
			status.classList.toggle('is-dead', !!dead);
		}
		function showTimer(deadHint) {
			var t = rec.startedAt ? fmt(Date.now() - rec.startedAt) : '0:00';
			setStatus('time <b>' + t + '</b> · ' + moves + ' moves' +
				(deadHint ? ' · you fell in — undo or reset' : ''), deadHint);
		}
		// Crossword rules: the clock runs from the moment the day's board is on
		// screen, and survives reloads (startedAt is stored immediately).
		function startTimer() {
			if (rec.finishedAt) return;
			if (!rec.startedAt) { rec.startedAt = Date.now(); saveRecord(day.date, rec); }
			if (!ticking) ticking = setInterval(function () { showTimer(false); }, 250);
			showTimer(false);
		}
		function finish(m, undos) {
			if (ticking) { clearInterval(ticking); ticking = null; }
			if (!rec.finishedAt) {
				rec.finishedAt = Date.now();
				rec.elapsedMs = rec.finishedAt - (rec.startedAt || rec.finishedAt);
				rec.moves = m;
				rec.undos = undos;
			}
			// The joke tail is picked once and kept, so the copied text is stable.
			if (typeof rec.tail !== 'string') rec.tail = resultTail(rec.elapsedMs);
			saveRecord(day.date, rec);
			setStatus('solved in <b>' + fmt(rec.elapsedMs) + '</b> · ' + rec.moves + ' moves', false);
			$('sokResultText').textContent = 'I beat the ' + day.date + ' sokobandl in ' +
				fmt(rec.elapsedMs) + ' (' + rec.moves + ' moves)' + (rec.tail || '!');
			$('sokResult').hidden = false;
		}
		function shareText() { return $('sokResultText').textContent + '\n' + shareLink(day.date); }

		$('sokCopy').addEventListener('click', function () {
			var text = shareText();
			var done = function () { $('sokCopied').textContent = 'copied'; };
			var fail = function () { $('sokCopied').textContent = text; };
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(text).then(done, fail);
			} else { fail(); }
		});
		if (navigator.share) {
			$('sokShare').hidden = false;
			$('sokShare').addEventListener('click', function () {
				navigator.share({ text: shareText() }).catch(function () { /* dismissed */ });
			});
		}

		function record(m) {
			switch (m.type) {
				case 'ready':
					if (recorder.trace) recorder.trace.levels = m.levels;
					recorder.add('ready', { level: m.current });
					$('sokTrace').hidden = false;
					break;
				case 'level': recorder.add('level', { index: m.index, tutorial: !!m.tutorial }); break;
				case 'move':
					recorder.add('move', typeof m.dir === 'number'
						? { index: m.index, moves: m.moves, dir: m.dir }
						: { index: m.index, moves: m.moves });
					break;
				case 'blocked': recorder.add('blocked', { index: m.index, dir: m.dir }); break;
				case 'undo': recorder.add('undo', { index: m.index, moves: m.moves }); break;
				case 'reset': recorder.add('reset', { index: m.index }); break;
				case 'dead': recorder.add('dead', { index: m.index, moves: m.moves }); break;
				case 'win': recorder.add('win', { index: m.index, moves: m.moves, undos: m.undos, tutorial: !!m.tutorial }); recorder.flush(); break;
				case 'error': recorder.add('error', { message: String(m.message) }); break;
			}
		}

		// ---- messages from the sealed page
		window.addEventListener('message', function (e) {
			var m = e.data;
			if (!m || m.source !== PLAYER || e.source !== frame.contentWindow) return;
			if (m.type === 'size') { fitFrame(m.height); return; }
			record(m);
			if (m.type === 'error') { setStatus(m.message, true); return; }
			if (rec.finishedAt) return;                     // already solved: the result line stays put
			switch (m.type) {
				case 'ready':
					onTutorial = !!m.levels[m.current].tutorial;
					moves = 0;
					if (onTutorial) setStatus('tutorial first — the clock starts on the day’s puzzle', false);
					else startTimer();
					break;
				case 'level':
					onTutorial = !!m.tutorial;
					moves = 0;
					if (onTutorial) { if (!rec.startedAt) setStatus('tutorial first — the clock starts on the day’s puzzle', false); else showTimer(false); }
					else startTimer();
					break;
				case 'move':
				case 'undo':
					moves = m.moves;
					if (!onTutorial) showTimer(false);
					break;
				case 'dead':
					moves = m.moves;
					if (!onTutorial) showTimer(true);
					else setStatus('you fell in — undo or reset', true);
					break;
				case 'win':
					if (!m.tutorial) finish(m.moves, m.undos);
					else setStatus('tutorial done — on to the puzzle', false);
					break;
			}
		});

		// ---- driving the page: buttons, hold-to-rewind, forwarded keys
		var rewind = null;
		function startRewind() {
			if (rewind) return;
			post({ type: 'undo' }, 'button');
			rewind = { delay: setTimeout(function () {
				rewind.tick = setInterval(function () { post({ type: 'undo' }, 'rewind'); }, 90);
			}, 320) };
			$('sokUndo').classList.add('is-held');
		}
		function stopRewind() {
			if (!rewind) return;
			clearTimeout(rewind.delay);
			clearInterval(rewind.tick);
			rewind = null;
			$('sokUndo').classList.remove('is-held');
		}

		var undoBtn = $('sokUndo');
		undoBtn.addEventListener('pointerdown', function (e) { e.preventDefault(); startRewind(); });
		['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
			undoBtn.addEventListener(ev, function () { stopRewind(); undoBtn.blur(); });
		});
		undoBtn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
		undoBtn.addEventListener('keydown', function (e) {
			// Space/Enter on the focused button: one undo, and don't let the key
			// fall through to the forwarding handler below as an action press.
			if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); post({ type: 'undo' }, 'button'); }
		});

		$('sokReset').addEventListener('click', function () { post({ type: 'reset' }, 'button'); this.blur(); });

		// Two fingers resting anywhere on the shell (outside the board — the
		// iframe is its own document and keeps its touches) rewinds until lifted.
		var game = $('sokGame');
		game.addEventListener('touchstart', function (e) {
			if (e.touches.length >= 2) { e.preventDefault(); startRewind(); }
		}, { passive: false });
		game.addEventListener('touchmove', function (e) {
			if (rewind) e.preventDefault();
		}, { passive: false });
		['touchend', 'touchcancel'].forEach(function (ev) {
			game.addEventListener(ev, function (e) { if (e.touches.length < 2) stopRewind(); });
		});
		window.addEventListener('blur', stopRewind);

		// The sealed page's own touch handlers are passive, so a swipe on the
		// board would also scroll (or pull-to-refresh, or back-navigate) the
		// page around it. The pages are same-origin, so add a guard from here
		// rather than changing them: nothing inside the embed needs to scroll,
		// so a touch that moves inside it is always the player's swipe.
		function lockTouches(doc) {
			if (!doc || !doc.body || doc.body.dataset.sokLocked) return;
			doc.body.dataset.sokLocked = '1';
			var style = doc.createElement('style');
			style.textContent = 'html, body, canvas { touch-action: none; overscroll-behavior: none; }';
			doc.head.appendChild(style);
			doc.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
		}

		// Every input reaches the sealed page as one of three events on its
		// window: a keydown, a touchend (swipe), or a host message. Capture-phase
		// listeners there see each one just before the page's own handler runs
		// and record the intent. The key map and the swipe rule (18px dead zone,
		// dominant axis) mirror the page's; keep them in step if that changes.
		var BOARD_KEYS = {
			arrowup: ['move', 0], w: ['move', 0], arrowdown: ['move', 1], s: ['move', 1],
			arrowleft: ['move', 2], a: ['move', 2], arrowright: ['move', 3], d: ['move', 3],
			x: ['move', 4], ' ': ['move', 4], r: ['reset'], z: ['undo'], u: ['undo'],
			n: ['next'], enter: ['next'], p: ['prev']
		};
		function watchInputs(doc) {
			if (!doc || !doc.body || doc.body.dataset.sokWatched) return;
			doc.body.dataset.sokWatched = '1';
			var win = doc.defaultView;
			win.addEventListener('keydown', function (e) {
				if (e.metaKey || e.ctrlKey || e.altKey) return;
				var k = BOARD_KEYS[e.key.toLowerCase()];
				if (k) noteInput(k[0], k[1], 'key');
			}, true);
			var start = null;
			win.addEventListener('touchstart', function (e) {
				start = e.target && e.target.tagName === 'CANVAS' ? [e.touches[0].clientX, e.touches[0].clientY] : null;
			}, { capture: true, passive: true });
			win.addEventListener('touchend', function (e) {
				if (!start) return;
				var dx = e.changedTouches[0].clientX - start[0], dy = e.changedTouches[0].clientY - start[1];
				start = null;
				if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
				noteInput('move', Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 1 : 0), 'swipe');
			}, { capture: true, passive: true });
			win.addEventListener('message', function (e) {
				var d = e.data;
				if (!d || d.source !== HOST) return;
				if (d.type === 'move') noteInput('move', d.dir, d.src);
				else if (d.type === 'undo' || d.type === 'reset' || d.type === 'next' || d.type === 'prev') noteInput(d.type, undefined, d.src);
			}, true);
		}

		// ---- exporting the trace
		function traceNote(text) { $('sokTraceNote').textContent = text; }
		$('sokTraceSave').addEventListener('click', function () {
			if (!recorder.trace) return;
			recorder.flush();
			traceNote('saved ' + Trace.download(recorder.trace));
		});
		$('sokTraceCopy').addEventListener('click', function () {
			if (!recorder.trace) return;
			recorder.flush();
			Trace.encode(recorder.trace).then(function (text) {
				if (navigator.clipboard && navigator.clipboard.writeText) {
					return navigator.clipboard.writeText(text).then(function () {
						traceNote('copied (' + Math.round(text.length / 1024) + ' KB) — paste it to Nick');
					});
				}
				throw new Error('no clipboard');
			}).catch(function () { traceNote('could not copy — use download instead'); });
		});

		// Keys pressed while the shell (not the iframe) has focus still play.
		var KEYS = {
			arrowup: { type: 'move', dir: 0 }, w: { type: 'move', dir: 0 },
			arrowdown: { type: 'move', dir: 1 }, s: { type: 'move', dir: 1 },
			arrowleft: { type: 'move', dir: 2 }, a: { type: 'move', dir: 2 },
			arrowright: { type: 'move', dir: 3 }, d: { type: 'move', dir: 3 },
			x: { type: 'move', dir: 4 }, ' ': { type: 'move', dir: 4 },
			z: { type: 'undo' }, u: { type: 'undo' }, r: { type: 'reset' }
		};
		window.addEventListener('keydown', function (e) {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			var msg = KEYS[e.key.toLowerCase()];
			if (!msg) return;
			e.preventDefault();
			post(msg, 'shell-key');
		});

		frame.addEventListener('load', function () {
			try {
				frame.contentWindow.focus();
				lockTouches(frame.contentDocument);
				watchInputs(frame.contentDocument);
			} catch (e) { /* cross-origin guard */ }
		});

		if (rec.finishedAt) finish(rec.moves, rec.undos);   // beaten on this device already: show it, let them replay
		// The level bar is only useful when there is more than one level (a
		// tutorial day): it is how the player sees "1. tutorial, 2. the puzzle".
		frame.src = day.file + '?embed=1' + (day.levels > 1 ? '' : '&bar=0');
	}

	// ---- boot ----------------------------------------------------------------

	$('sokSplash').textContent = pick(TEXT.splashes);

	fetch('index.json', { cache: 'no-cache' })
		.then(function (res) { if (!res.ok) throw new Error('index.json ' + res.status); return res.json(); })
		.then(function (manifest) {
			var days = (manifest.days || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
			// The gate: only days whose date has arrived (local time) are listed
			// or linked. The whole week is committed ahead; this is what hides it.
			var listed = days.filter(function (d) { return d.date <= today; });
			var params = new URLSearchParams(location.search);

			if (params.has('archive')) { showArchive(listed); return; }

			var want = params.get('d');
			var day;
			if (want) {
				// A direct link loads even before its date (guessable filename,
				// fine for a puzzle); it just is not listed anywhere until then.
				day = days.find(function (d) { return d.date === want; });
				if (!day) { showEmpty('There is no puzzle for ' + want + '.'); return; }
			} else {
				day = listed[listed.length - 1];   // today's, or the latest before it
				if (!day) {
					var first = days[0];
					showEmpty(first
						? 'The first puzzle arrives on ' + prettyDate(first.date) + '.'
						: 'No puzzles published yet.');
					return;
				}
			}
			showDay(day, listed);
		})
		.catch(function (err) {
			showEmpty('The puzzle list could not be loaded (' + err.message + ').');
		});
})();
