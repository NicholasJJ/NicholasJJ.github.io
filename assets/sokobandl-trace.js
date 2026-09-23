/* ---------------------------------------------------------------------------
   sokobandl — action traces.

   Records what a player did on a day's puzzle, with timing, and packs it up
   for export. Shared by the game shell (assets/sokobandl.js, which records)
   and the replay page (assets/sokobandl-replay.js, which reads).

   Everything stays in the player's browser (localStorage, one entry per day
   under 'sokobandl:trace:<date>'). Nothing is sent anywhere: the site is
   static. A trace leaves the device only through the download / copy
   buttons, as a file or a pasteable string.

   THE TRACE FORMAT (v1)

     {
       v: 1, game: 'sokobandl',
       date: '2026-09-28', weekId: 'W21', file: 'levels/2026-09-28.html',
       levels: [{ index, name, tutorial }],   // from the page's `ready`
       t0: 1790104460170,                     // epoch ms of the first event
       player: '',                            // free label, set on export
       ua: '…', touch: true,                  // device hints
       truncated: false,                      // true if the event cap was hit
       events: [ { t, type, … } ]            // t = ms since t0, ascending
     }

   Event types (fields beyond t / type):
     session  n, w, h            a page load (n counts loads of this day)
     ready    level              the page is up, showing level `level`
     level    index, tutorial    a level was (re)loaded: first show, next, reset
     input    kind, dir?, src    an intent: kind 'move' (dir 0 up, 1 down,
                                 2 left, 3 right, 4 action), 'undo', 'reset',
                                 'next', 'prev'; src 'key' (in the board),
                                 'swipe', 'shell-key', 'button', 'rewind'.
                                 Recorded whether or not the page accepted it.
     move     index, moves, dir  an accepted move (dir as the page reports it;
                                 pages built before the player sent `dir`
                                 leave it out, and such traces cannot be
                                 replayed on the board)
     blocked  index, dir         an input the page rejected (newer pages only)
     undo     index, moves
     reset    index
     dead     index, moves
     win      index, moves, undos, tutorial
     hidden / visible            the tab was hidden / shown again
     error    message

   The replay page drives a sealed level page from `level`, `move` (needs
   dir), `undo` and `reset` events; everything else is annotation.
   --------------------------------------------------------------------------- */
(function () {
	'use strict';

	var VERSION = 1;
	var PREFIX = 'sokobandl:trace:';
	var MAGIC = 'sokobandl-trace:';
	var CAP = 50000;

	function key(date) { return PREFIX + date; }

	function load(date) {
		try { return JSON.parse(localStorage.getItem(key(date)) || 'null'); }
		catch (e) { return null; }
	}

	function listLocal() {
		var out = [];
		try {
			for (var i = 0; i < localStorage.length; i++) {
				var k = localStorage.key(i);
				if (k && k.indexOf(PREFIX) === 0) {
					var t = load(k.slice(PREFIX.length));
					if (t && t.events && t.events.length) out.push(t);
				}
			}
		} catch (e) { /* storage unavailable */ }
		return out.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
	}

	// A recorder for one day. `add()` appends an event and schedules a save;
	// `flush()` writes immediately (used on pagehide).
	function open(day) {
		var trace = load(day.date);
		if (!trace || trace.v !== VERSION) {
			trace = {
				v: VERSION, game: 'sokobandl',
				date: day.date, weekId: day.weekId, file: day.file,
				levels: [], t0: 0, player: '',
				ua: navigator.userAgent,
				touch: !!(navigator.maxTouchPoints || 'ontouchstart' in window),
				truncated: false,
				events: []
			};
		}
		var sessions = trace.events.filter(function (e) { return e.type === 'session'; }).length;
		var timer = null;

		function flush() {
			if (timer) { clearTimeout(timer); timer = null; }
			try { localStorage.setItem(key(trace.date), JSON.stringify(trace)); } catch (e) { /* full / private */ }
		}
		function add(type, fields) {
			if (trace.events.length >= CAP) { trace.truncated = true; return null; }
			var now = Date.now();
			if (!trace.t0) trace.t0 = now;
			var ev = Object.assign({ t: now - trace.t0, type: type }, fields || {});
			trace.events.push(ev);
			if (!timer) timer = setTimeout(flush, 250);
			return ev;
		}

		add('session', { n: sessions + 1, w: window.innerWidth, h: window.innerHeight });
		document.addEventListener('visibilitychange', function () {
			add(document.hidden ? 'hidden' : 'visible');
			if (document.hidden) flush();
		});
		window.addEventListener('pagehide', flush);

		return { trace: trace, add: add, flush: flush };
	}

	// ---- packing ---------------------------------------------------------

	function bytesToB64(bytes) {
		var s = '';
		for (var i = 0; i < bytes.length; i += 0x8000) {
			s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
		}
		return btoa(s);
	}
	function b64ToBytes(b64) {
		var s = atob(b64), out = new Uint8Array(s.length);
		for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
		return out;
	}
	function pipe(bytes, stream) {
		return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()
			.then(function (buf) { return new Uint8Array(buf); });
	}

	// A single pasteable line: 'sokobandl-trace:v1:<base64 gzip json>', or
	// 'sokobandl-trace:v1j:<base64 json>' where gzip is unavailable.
	function encode(trace) {
		var json = JSON.stringify(trace);
		var bytes = new TextEncoder().encode(json);
		if (typeof CompressionStream === 'function') {
			return pipe(bytes, new CompressionStream('gzip')).then(function (gz) {
				return MAGIC + 'v' + VERSION + ':' + bytesToB64(gz);
			});
		}
		return Promise.resolve(MAGIC + 'v' + VERSION + 'j:' + bytesToB64(bytes));
	}

	function decode(str) {
		str = String(str).trim();
		if (str.indexOf(MAGIC) !== 0) return Promise.reject(new Error('not a sokobandl trace'));
		var rest = str.slice(MAGIC.length);
		var colon = rest.indexOf(':');
		var tag = rest.slice(0, colon), body = rest.slice(colon + 1).replace(/\s+/g, '');
		var bytes = b64ToBytes(body);
		var text = tag.slice(-1) === 'j'
			? Promise.resolve(bytes)
			: pipe(bytes, new DecompressionStream('gzip'));
		return text.then(function (b) { return check(JSON.parse(new TextDecoder().decode(b))); });
	}

	function check(t) {
		if (!t || t.game !== 'sokobandl' || !Array.isArray(t.events) || !t.date) {
			throw new Error('not a sokobandl trace');
		}
		return t;
	}

	// Accepts either the raw JSON of a downloaded trace or a copied line.
	function parse(text) {
		text = String(text).trim();
		if (text.indexOf(MAGIC) === 0) return decode(text);
		try { return Promise.resolve(check(JSON.parse(text))); }
		catch (e) { return Promise.reject(new Error('not a sokobandl trace')); }
	}

	function download(trace) {
		var name = 'sokobandl-' + trace.date + (trace.player ? '-' + trace.player.replace(/[^\w-]+/g, '_') : '') + '.json';
		var blob = new Blob([JSON.stringify(trace)], { type: 'application/json' });
		var url = URL.createObjectURL(blob);
		var a = document.createElement('a');
		a.href = url; a.download = name;
		document.body.appendChild(a); a.click(); a.remove();
		setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
		return name;
	}

	// ---- summary -----------------------------------------------------------

	// Counts and the clip that matters: from the first non-tutorial `level`
	// (or `ready`) to the first non-tutorial `win`, if any.
	function summarize(trace) {
		var s = { moves: 0, undos: 0, resets: 0, deaths: 0, inputs: 0, sessions: 0,
			solved: false, startT: null, winT: null, endT: 0, hasDirs: true, longestPause: 0 };
		var tutorialOf = {};
		(trace.levels || []).forEach(function (l) { tutorialOf[l.index] = !!l.tutorial; });
		var lastAct = null, cur = null;
		trace.events.forEach(function (e) {
			s.endT = e.t;
			switch (e.type) {
				case 'session': s.sessions++; break;
				case 'ready': cur = e.level; if (s.startT == null && !tutorialOf[cur]) s.startT = e.t; break;
				case 'level': cur = e.index; if (s.startT == null && !e.tutorial) s.startT = e.t; break;
				case 'input': s.inputs++; break;
				case 'move': if (s.winT == null) { s.moves++; if (typeof e.dir !== 'number') s.hasDirs = false; } break;
				case 'undo': if (s.winT == null) s.undos++; break;
				case 'reset': if (s.winT == null) s.resets++; break;
				case 'dead': if (s.winT == null) s.deaths++; break;
				case 'win': if (!e.tutorial && s.winT == null) { s.winT = e.t; s.solved = true; } break;
			}
			if (e.type === 'move' || e.type === 'undo' || e.type === 'reset' || e.type === 'level' || e.type === 'ready') {
				if (lastAct != null && s.winT == null) s.longestPause = Math.max(s.longestPause, e.t - lastAct);
				lastAct = e.t;
			}
		});
		s.elapsedMs = s.startT == null ? null : ((s.winT == null ? s.endT : s.winT) - s.startT);
		return s;
	}

	window.SokobandlTrace = {
		VERSION: VERSION, PREFIX: PREFIX,
		open: open, load: load, listLocal: listLocal,
		encode: encode, decode: decode, parse: parse,
		download: download, summarize: summarize
	};
})();
