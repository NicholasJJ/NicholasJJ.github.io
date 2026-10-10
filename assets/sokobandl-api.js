/* ---------------------------------------------------------------------------
   sokobandl — talking to the leaderboard API (the separate sokobandl-api
   project on Vercel). Used by the puzzle page (sending a solve) and the
   replay page (the day's leaderboard, other players' replays).

   Nothing here is on the game's critical path: every call has a timeout and
   resolves to { ok: false, ... } instead of throwing, so if the API is down
   or slow the puzzle, timer and share line carry on exactly as before.

   Per day, the browser keeps what the server handed back after sending:
   the name used and a private token ("pass") that unlocks other players'
   replays for that day. Stored in localStorage under 'sokobandl:lb:<date>'.
   The last name used is remembered as a suggestion ('sokobandl:lb-name').

   Local testing: add ?api=local to any sokobandl page address to use the
   in-memory dev server from the API repo (`npm run dev`, localhost:3001).
   It sticks for the rest of that browser tab (sessionStorage), so ordinary
   links can't drop it, and a small "local API" badge shows while it's on.
   ?api=live switches back.
   --------------------------------------------------------------------------- */
(function () {
	'use strict';

	var PRODUCTION = 'https://sokobandl-api-three.vercel.app';
	var LOCAL = 'http://localhost:3001';
	var TIMEOUT = 8000;
	var LOCAL_KEY = 'sokobandl:api-local';
	var mode = new URLSearchParams(location.search).get('api');
	try {
		if (mode === 'local') sessionStorage.setItem(LOCAL_KEY, '1');
		else if (mode === 'live') sessionStorage.removeItem(LOCAL_KEY);
	} catch (e) { /* storage blocked */ }
	var isLocal = mode === 'local';
	try { isLocal = isLocal || (mode !== 'live' && sessionStorage.getItem(LOCAL_KEY) === '1'); } catch (e) { /* ignore */ }
	var base = isLocal ? LOCAL : PRODUCTION;

	if (isLocal) {
		var showBadge = function () {
			var b = document.createElement('a');
			b.href = '?api=live';
			b.title = 'Using the local test API (localhost:3001). Click to switch back to the real one.';
			b.textContent = 'local API';
			b.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:50;padding:4px 10px;border-radius:999px;' +
				'background:#3b2438;color:#ffea00;font:600 12px/1.4 system-ui,sans-serif;text-decoration:none;opacity:.85';
			document.body.appendChild(b);
		};
		if (document.body) showBadge(); else document.addEventListener('DOMContentLoaded', showBadge);
	}

	function request(method, path, body) {
		var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
		var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT) : null;
		return fetch(base + path, {
			method: method,
			headers: body ? { 'Content-Type': 'application/json' } : undefined,
			body: body ? JSON.stringify(body) : undefined,
			signal: ctrl ? ctrl.signal : undefined,
			cache: 'no-store'
		}).then(function (res) {
			return res.json().catch(function () { return {}; }).then(function (data) {
				return { ok: res.ok, status: res.status, data: data };
			});
		}).catch(function () {
			return { ok: false, status: 0, data: { error: 'unreachable' } };
		}).then(function (out) {
			if (timer) clearTimeout(timer);
			return out;
		});
	}

	function read(key) {
		try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
	}
	function write(key, value) {
		try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
	}

	var API = {
		NAME_RE: /^[A-Za-z]{3}$/,
		isLocal: isLocal,

		// This browser's entry for a day, if it sent one: { name, token, result }.
		pass: function (date) { return read('sokobandl:lb:' + date); },
		lastName: function () { return read('sokobandl:lb-name') || ''; },

		// Send a solved trace. Resolves to
		//   { ok: true, result, alreadySubmitted }       (and remembers the pass)
		//   { ok: false, reason: 'taken' | 'invalid' | 'unreachable', message }
		submit: function (date, name, trace) {
			return request('POST', '/api/submit', { date: date, name: name, trace: trace }).then(function (r) {
				if (r.ok && r.data && r.data.token) {
					write('sokobandl:lb:' + date, { name: r.data.result.name, token: r.data.token, result: r.data.result });
					write('sokobandl:lb-name', r.data.result.name);
					return { ok: true, result: r.data.result, alreadySubmitted: !!r.data.alreadySubmitted };
				}
				if (r.status === 409) return { ok: false, reason: 'taken', message: (r.data && r.data.error) || 'name taken' };
				if (r.status === 0 || r.status >= 500) return { ok: false, reason: 'unreachable', message: 'unreachable' };
				return { ok: false, reason: 'invalid', message: (r.data && r.data.error) || 'rejected' };
			});
		},

		// The public board: resolves to { ok, total, entries: [{ rank, name, timeMs }] }.
		leaderboard: function (date) {
			return request('GET', '/api/leaderboard?d=' + encodeURIComponent(date)).then(function (r) {
				return r.ok ? { ok: true, total: r.data.total, entries: r.data.entries || [] } : { ok: false };
			});
		},

		// Other players' replays for a day; needs this browser's pass for it.
		// Resolves to { ok, traces: [{ name, timeMs, moves, undos, restarts, touch, trace }] }.
		traces: function (date, names) {
			var p = API.pass(date);
			if (!p) return Promise.resolve({ ok: false, reason: 'no-pass' });
			return request('POST', '/api/traces', { date: date, token: p.token, names: names }).then(function (r) {
				if (r.ok) return { ok: true, traces: r.data.traces || [] };
				return { ok: false, reason: r.status === 403 ? 'no-pass' : 'unreachable' };
			});
		}
	};

	window.SokobandlAPI = API;
})();
