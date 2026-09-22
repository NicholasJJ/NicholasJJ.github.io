/* ---------------------------------------------------------------------------
   sokobandl — the editable words.

   Everything in here is plain data; edit freely, no code knowledge needed.
   Keep the quotes and commas, and put a backslash before any apostrophe
   inside a single-quoted string ('it\'s daily!') — or use double quotes.

   1. `splashes`: the yellow tilted text next to the title, Minecraft style.
      One is picked at random on every visit. Short ones look best.

   2. `results`: things to tack onto the end of the copy-paste result, chosen
      by how long the solve took. The base sentence is

          I beat the 2026-09-28 sokobandl in 1:23 (34 moves)

      and the tail is appended to it verbatim, so start each tail with its own
      punctuation. If no tier matches (or the matching tier has no text) the
      sentence just ends with "!".

      Each tier has an optional `from` and/or `until` time ("m:ss" or
      "h:mm:ss"; `from` is inclusive, `until` exclusive) and a `text` list to
      pick from at random. The FIRST tier that matches wins, so order them
      from most to least specific if ranges overlap. The pick is made once,
      when the puzzle is solved, and remembered for that day.
   --------------------------------------------------------------------------- */
window.SOKOBANDL_TEXT = {

	splashes: [
		'now with crates!',
		'push responsibly',
		'cratemaxxing!',
		'no crates were harmed',
		'also try sokoban!',
		'made in a cave with a box of crates',
		'100% crate-free! (jk)',
		'who\'s building these warehouses?!',
		'less violent than minesweeper!',
		'you\'ll never guess what we put in the crates',
		'new and improved!',
		'****! I stubbed my toe!',
		'why are you blue?',
		'ya like jazz?'
	],

	results: [
		{ until: '0:20', text: [
			', which is suspiciously fast',
			', either because its an easy puzzle or I\'m a genius',
		] },
		{ until: '1:00', text: [
			' in one clean push',
			', no notes',
		] },
		{ from: '10:00', until: '30:00', text: [
			' after a long staring contest with a crate',
			', and I thought about it a lot',
		] },
		{ from: '30:00', until: '2:00:00', text: [
			', but only because I went afk to grab a snack',
			', with a lunch break in the middle',
		] },
		{ from: '2:00:00', text: [
			', and by "beat" I mean I left the tab open all day',
			', which is more of a lifestyle than a time',
		] },
	],

};
