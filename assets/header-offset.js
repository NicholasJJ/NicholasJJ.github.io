/* ---------------------------------------------------------------------------
   Keep blog content clear of the fixed header.

   The header is `position: fixed` with `flex-wrap: wrap`, so its height depends
   on whether the nav wraps to a second row — 160px wide, 229px narrow. A single
   `padding-top` constant in styles.css therefore cannot fit both, and the wavy
   clip-path edge ends up painted over the top of the page.

   So measure the header and publish its height as --header-offset, which
   assets/blog.css consumes. blog.css keeps static per-breakpoint fallbacks so
   the layout is already close before this runs (and correct without JS).
   --------------------------------------------------------------------------- */
(function () {
	'use strict';

	function apply() {
		var header = document.querySelector('header');
		if (!header) return;
		var h = Math.ceil(header.getBoundingClientRect().height);
		if (h > 0) {
			document.documentElement.style.setProperty('--header-offset', h + 'px');
		}
	}

	function init() {
		apply();

		// The nav re-wraps as the window changes, which changes the height.
		// Listen both ways: ResizeObserver catches height changes that happen
		// without a window resize, and the resize event still fires in contexts
		// where observer callbacks are throttled (e.g. a backgrounded tab).
		var header = document.querySelector('header');
		if (header && window.ResizeObserver) {
			new ResizeObserver(apply).observe(header);
		}
		window.addEventListener('resize', apply);

		// Webfonts landing late can also change the header's height.
		if (document.fonts && document.fonts.ready) {
			document.fonts.ready.then(apply).catch(function () {});
		}
		// The face images are in the header and affect its layout.
		window.addEventListener('load', apply);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
