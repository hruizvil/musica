# Site map

Every page of Abadá Música at phone (390), iPad (820) and desktop (1440) widths, plus the
phone overlays and a diagram of how the pages link to each other.

**Live canvas:** https://claude.ai/artifact/Si8PPZ9RGBkxiWnCr1RVSB (private to the owner)

`generate.py` rebuilds the canvas files from the site's real data
(`src/assets/data/*.json`) into `project/` (ignored by git). Republish `project/canvas.json`
plus every `project/*.dc.html` to the canvas URL above to update it.

It is a hand-built picture of the site, not a screenshot: when a page's layout changes,
update its `page_*` function in `generate.py` too.
