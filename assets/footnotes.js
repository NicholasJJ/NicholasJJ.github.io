/* ---------------------------------------------------------------------------
   Popup footnotes.

   Posts are written with ordinary markdown footnote syntax:

       Some claim.[^why]

       [^why]: The reasoning, which can contain *markup*, [links](...), images.

   kramdown turns that into a reference link plus an endnote list at the bottom
   of the page. This script lifts each note into a popup anchored at its
   reference, then hides the bottom list. If the script never runs the page is
   still perfectly readable as classic bottom-of-page footnotes, so the markdown
   stays portable and the behaviour is pure presentation.
   --------------------------------------------------------------------------- */
(function () {
	'use strict';

	function init() {
		var container = document.querySelector('.post-body') || document.body;
		var refs = container.querySelectorAll('a.footnote, a[rel="footnote"]');
		if (!refs.length) return;

		var popup = document.createElement('div');
		popup.className = 'fn-popup';
		popup.setAttribute('role', 'tooltip');
		popup.id = 'fn-popup';

		var arrow = document.createElement('span');
		arrow.className = 'fn-popup-arrow';

		var closeBtn = document.createElement('button');
		closeBtn.type = 'button';
		closeBtn.className = 'fn-popup-close';
		closeBtn.setAttribute('aria-label', 'Close footnote');
		closeBtn.innerHTML = '&times;';

		var body = document.createElement('div');
		body.className = 'fn-popup-body';

		popup.appendChild(arrow);
		popup.appendChild(closeBtn);
		popup.appendChild(body);
		document.body.appendChild(popup);

		var activeRef = null;
		var lifted = 0;

		function noteFor(ref) {
			var href = ref.getAttribute('href') || '';
			if (href.charAt(0) !== '#') return null;
			// kramdown ids look like "fn:1" — the colon is not a valid bare CSS
			// selector, so getElementById is required here.
			var target = document.getElementById(decodeURIComponent(href.slice(1)));
			if (!target) return null;
			var clone = target.cloneNode(true);
			// Drop the "return to text" backlink; the popup has its own close.
			clone.querySelectorAll('.reversefootnote, .footnote-backref').forEach(function (el) {
				var p = el.parentNode;
				el.remove();
				// Tidy the stray whitespace the backlink leaves behind.
				if (p && p.lastChild && p.lastChild.nodeType === 3 && !p.lastChild.textContent.trim()) {
					p.removeChild(p.lastChild);
				}
			});
			return clone.innerHTML;
		}

		function place() {
			if (!activeRef) return;
			var r = activeRef.getBoundingClientRect();
			var sx = window.pageXOffset;
			var sy = window.pageYOffset;
			var pw = popup.offsetWidth;
			var ph = popup.offsetHeight;
			var margin = 10;

			// Prefer below the reference; flip above when there is not room.
			var below = r.bottom + ph + margin <= window.innerHeight || r.top < ph + margin;
			var top = below ? r.bottom + sy + margin : r.top + sy - ph - margin;
			popup.classList.toggle('below', below);
			popup.classList.toggle('above', !below);

			// Centre on the reference, then clamp inside the viewport.
			var left = r.left + sx + r.width / 2 - pw / 2;
			var min = sx + margin;
			var max = sx + window.innerWidth - pw - margin;
			if (left < min) left = min;
			if (left > max) left = max;

			popup.style.top = top + 'px';
			popup.style.left = left + 'px';

			// Keep the arrow pointing at the reference even after clamping.
			var arrowX = r.left + sx + r.width / 2 - left - 5;
			arrowX = Math.max(12, Math.min(pw - 22, arrowX));
			arrow.style.left = arrowX + 'px';
		}

		function open(ref) {
			var html = noteFor(ref);
			if (html === null) return;
			if (activeRef && activeRef !== ref) activeRef.setAttribute('aria-expanded', 'false');
			activeRef = ref;
			body.innerHTML = html;
			ref.setAttribute('aria-expanded', 'true');
			ref.setAttribute('aria-describedby', 'fn-popup');
			popup.classList.add('is-open');
			place();
		}

		function close() {
			if (!activeRef) return;
			activeRef.setAttribute('aria-expanded', 'false');
			activeRef.removeAttribute('aria-describedby');
			activeRef = null;
			popup.classList.remove('is-open');
		}

		Array.prototype.forEach.call(refs, function (ref) {
			if (noteFor(ref) === null) return;
			lifted++;
			ref.setAttribute('aria-expanded', 'false');
			ref.addEventListener('click', function (e) {
				e.preventDefault();
				e.stopPropagation();
				if (activeRef === ref) close();
				else open(ref);
			});
		});

		if (!lifted) return;
		// Only now is it safe to hide the bottom list.
		document.body.classList.add('fn-popups-ready');

		closeBtn.addEventListener('click', function (e) {
			e.stopPropagation();
			close();
		});

		popup.addEventListener('click', function (e) { e.stopPropagation(); });

		document.addEventListener('click', close);

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') close();
		});

		var ticking = false;
		function reflow() {
			if (ticking || !activeRef) return;
			ticking = true;
			requestAnimationFrame(function () {
				ticking = false;
				place();
			});
		}
		window.addEventListener('scroll', reflow, { passive: true });
		window.addEventListener('resize', reflow);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
