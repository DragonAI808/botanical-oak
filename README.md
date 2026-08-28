# The Botanical Oak — website

A single-page, dependency-free site for the Wild Oak & Moss bar. Plain HTML, CSS
and JavaScript: no build step, no framework, no npm install. Open it, edit it, ship it.

## Preview it locally

```bash
node serve.js
```

Then open <http://localhost:4173>. (`serve.js` is a ~50-line static server that
supports HTTP range requests, which video scrubbing needs — `file://` will not
play the clips properly, so use the server rather than double-clicking the HTML.)

## Files

```
index.html            all the markup and copy
assets/css/site.css   design tokens + every style
assets/js/site.js     scroll, reveal, video and menu behavior
assets/img/           web-optimized images (generated — see below)
assets/video/         web-optimized video (generated — see below)
serve.js              local preview server
bar.jpg …  ugc2.mp4   your original masters, untouched
```

## What's on the page

| Section | Notes |
|---|---|
| Hero | Full-bleed video on wide screens, still image on phones. The still paints first (it is the LCP element) and the clip fades in over it once buffered; if the video fails or autoplay is refused, the still simply stays. Headline rises letter-by-letter. |
| Marquee | Infinite credential ticker. Pauses on hover. |
| Statement | Words light up one at a time as you scroll through. |
| The Bar | Pinned image on the left cross-fades through four images as the four process steps scroll past. |
| Reel | `stillvid.mp4` in a portrait frame, muted autoplay loop. |
| Lather | Split layout with a subtle parallax on the image. |
| Inside | Eight-ingredient grid. |
| Stories | Both UGC clips, muted autoplay in view — **tap for sound**; only one plays audio at a time. |
| Scents | Full-bleed shot of the six-bar lineup, then the five coming scents named, each with a color swatch matched to its bar. |
| Contact | Inquiries — the site's only call to action. Wholesale, press, and general questions, all routed to one email address. |
| Footer | Nav, batch-notice signup. |

**`testimonials.html`** is a second page, linked from the nav: a forest-green header,
ten quotes in a masonry grid with two darker feature cards, and a link back to the
process. It shares the same CSS and JS as the home page.

There is **no commerce** anywhere: no basket, no prices, no checkout. The site is a
showcase with a way to get in touch. `test/interactions.py` asserts this stays true
(it fails if a currency symbol or the word "basket" reappears). It also guards the
US wording — the suite fails if "England", "colour", "enquiries" or similar creep back in.

## Before this goes live — please read

Three things are **placeholder** and need your real content:

1. **Every testimonial on the site is fabricated.** That means the two quotes under
   the UGC clips in `index.html` *and* all ten on `testimonials.html`. I wrote them;
   no customer said them and none of those people exist.

   This matters more than ordinary placeholder copy. Publishing invented reviews as
   though they were genuine is prohibited by the FTC Rule on the Use of Consumer
   Reviews and Testimonials (16 CFR Part 465), which took effect in 2024 and carries
   civil penalties per violation. It applies to a business's own website, not just
   review platforms.

   While the site is a `noindex` draft this is fine — it is layout filler. Before it
   goes live for real, do one of:
   - replace all twelve with real customer words you have permission to publish, or
   - delete `testimonials.html`, drop the nav link, and remove the two `figcaption`
     quotes in the Stories section.

   `testimonials.html` carries a gold **Sample copy** banner saying the quotes are not
   real, plus an HTML comment block above the list. Remove the banner only once the
   quotes are genuine. `test/interactions.py` fails if the banner disappears while the
   page is still there — that guard is deliberate, so don't delete the check to make
   the suite pass.
2. **The contact email address.** I used `hello@thebotanicaloak.com` as a
   placeholder — it is almost certainly not yours and mail to it will go nowhere.
   It appears in three places: the Contact section button, the footer "Email us"
   link, and the footer column. Search the file for `thebotanicaloak.com` and
   replace all of them. I deliberately did not use your personal address, since
   this goes on a public page.
3. **Ingredients and process copy.** I wrote it to match what the packaging claims
   (cold process, natural/vegan/palm free, 4 oz / 115 g) and it reads plausibly for a
   cold-process bar — but you make the soap, so check every factual claim,
   especially the six-week cure and the "lasts three times longer" line.

## Known and decided: the packaging photography

The site copy says **California**. The cartons in the photographs still read
**"Handcrafted in England"**, and carry the **℮** estimated-quantity mark (an
EU/UK metrology symbol) next to `115g`. This is visible in four places: the mobile
hero, craft steps 03 and 04, and the reel video. The six-bar lineup is unaffected —
those bars are embossed with scent names only.

**This is a known state, not an oversight.** The decision was made to leave the
images and packaging as they are for now. Recording it here so nobody re-discovers
it later and assumes it slipped through. It resolves whenever the packaging is
reprinted and the product shots are redone.

## The two ways people can reach you

- **The Contact section** is a plain `mailto:` link. It needs no backend and works
  the moment you swap the address — nothing to configure, nothing to break.
- **The footer signup** is the one piece still wired to nothing. It shows a thank
  you and discards the address. It is marked `TODO` in `assets/js/site.js`; point
  it at Klaviyo, Mailchimp, or whatever list you keep. If you would rather not
  collect emails at all, delete the `<form class="foot__sign">` block from
  `index.html` and the `#signup` handler from `site.js`.

## Deploying — it is already live

**Review build:** <https://dragonai808.github.io/botanical-oak/>
**Repo:** <https://github.com/DragonAI808/botanical-oak>

GitHub Pages serves `main` from the repo root. To publish a change:

```bash
git add -A && git commit -m "your message" && git push
```

Pages rebuilds on its own in about 20 seconds. There is no build step.

### Two things to do when this stops being a draft

1. **Remove the noindex.** Delete the `<meta name="robots" content="noindex,
   nofollow">` line from `index.html` and delete `robots.txt`. Until you do,
   search engines will deliberately skip the site.
2. **Decide about the public repo.** Free-tier Pages requires a public repo, so
   the source and assets are public too. If that becomes a problem, Cloudflare
   Pages direct-upload serves the built site while keeping the source private.

### Notes

- The ~58 MB of original masters (`bar.jpg`, `ugc1.mp4`, …) are gitignored — the
  site never references them. **Those patterns are root-anchored on purpose**
  (`/ugc1.mp4`, not `ugc1.mp4`): `assets/video/` holds optimized files with the
  same names, and an unanchored pattern silently excludes those too, shipping the
  site with broken video cards.
- Fonts load from Google Fonts, so the page needs network access for type. To
  self-host, download Cormorant Garamond and Jost into `assets/fonts/` and swap
  the `<link>` in `index.html` for `@font-face` rules.

## Regenerating the images and video

The originals are large (12 MB of JPEG, 47 MB of video). Everything in
`assets/img` and `assets/video` was derived from them with ffmpeg and comes to
about 7.8 MB total, of which the hero costs ~120 KB. If you replace a master, rerun
the equivalent command:

```bash
ffmpeg -i bar.jpg -vf "scale='min(1600,iw)':-2:flags=lanczos" -c:v libwebp -quality 80 -compression_level 6 assets/img/bar-1600.webp
```

```bash
ffmpeg -i ugc1.mp4 -vf "scale=720:-2:flags=lanczos" -c:v libx264 -profile:v main -crf 28 -preset slow -pix_fmt yuv420p -c:a aac -b:a 96k -ac 2 -movflags +faststart assets/video/ugc1.mp4
```

The six-bar lineup for the Scents section comes from `newsoaps.jpeg`:

```bash
ffmpeg -i newsoaps.jpeg -vf "scale='min(1600,iw)':-2:flags=lanczos" -c:v libwebp -quality 82 -compression_level 6 assets/img/scents-1600.webp
```

The hero loop is built from a Higgsfield clip. It is ping-ponged — played
forward then reversed — because the source is a one-directional push that would
otherwise jump at the loop point. Reversing a slow dolly reads as a natural pull
back, and needs no crossfade, so nothing goes soft:

```bash
ffmpeg -i soaplight.mp4 -filter_complex "[0:v]split[a][b];[b]reverse,trim=start_frame=1:end_frame=120,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1:a=0[v]" -map "[v]" -c:v libx264 -profile:v main -crf 26 -preset slow -pix_fmt yuv420p -an -movflags +faststart assets/video/hero-loop.mp4
```

Trimming one frame off each end of the reversed half removes the duplicate
frames at the joins. Verify a new loop is seamless by diffing first against last
frame — it should be near black.

The hero's vertical crop is pulled from a frame of `stillvid.mp4`:

```bash
ffmpeg -i stillvid.mp4 -vf "select='eq(n\,6)',crop=1440:1843:0:717" -frames:v 1 -q:v 2 hero.jpg
```

## Adding a new UGC clip

Generate the clip in Higgsfield, then:

```bash
./tools/add-clip.sh ~/Downloads/whatever.mp4 ugc3 --poster 8.5
```

That transcodes it to web-safe H.264 + stereo AAC at 720px wide, writes a poster
frame from the second you name, reports the size saving, and prints the markup to
paste into the Stories row. Rerun with a different timestamp if the poster caught
a blink — it just overwrites.

**Trimming.** Generated video tends to fail *locally* — an extra hand appears at
0:12 and the rest of the take is fine. Cut the bad seconds instead of throwing the
clip away:

```bash
./tools/add-clip.sh ~/Downloads/whatever.mp4 ugc3 --from 0 --to 11.5 --poster 6
```

`--poster` is timed against the original clip, not the trimmed one, so you can read
the number straight off whatever player you spotted it in. The script warns if the
poster time falls outside the range you kept.

**The transcode is not optional.** Higgsfield's Seedance models output HEVC/H.265,
which most browsers refuse to decode; the clip appears broken or silent with no
useful error. The script always re-encodes and tells you when the source was HEVC,
so the cause is never a mystery.

Shoot vertical (9:16) to match the existing cards, and keep clips to roughly
15-20s — they autoplay muted in view and only get sound on tap, so length costs
bandwidth without buying attention.

## Interaction tests (optional)

`test/interactions.py` clicks every interactive control — the clip unmute toggles
and their one-at-a-time logic, the scents and contact sections, the newsletter form, and the mobile
menu (open, Escape, link-close, scroll-lock release). It found two real bugs the
first time it ran. 31 checks; worth rerunning after you touch `site.js`.

It needs the server running in another terminal, then:

```bash
py -3 test/interactions.py
```

Requires `py -3 -m pip install playwright`. On this machine `python` and `python3`
are Microsoft Store stubs that do not work — use the `py -3` launcher. The script
drives your installed Chrome via `channel="chrome"`, so there is no browser
download. This is dev tooling only; do not upload `test/` with the site.

## Changing the look

Everything visual is a custom property at the top of `assets/css/site.css` —
colors, the two typefaces, page padding, easing. The palette was sampled from
your packaging: `--forest` is the box spine, `--cream` the uncoated board,
`--oak` the windowsill, `--gold` the oil bottle. Change a token and the whole
page follows.

## Accessibility and performance

- Every animation is disabled under `prefers-reduced-motion`.
- Video is `muted` + `playsinline` so it autoplays on iOS, never with sound.
- Images are responsive `<picture>` sets, lazy below the fold, WebP with JPEG fallback.
- Focus rings are visible throughout; the mobile menu traps nothing and closes on Escape.
- Motion is transform/opacity only and batched into a single rAF, so scrolling stays smooth.
- All 191 text elements meet WCAG AA contrast (4.5:1 body, 3:1 large). `--oak` was
  darkened from `#9C7550` to `#825C33` to clear 4.5:1 on cream — if you lighten it
  again, the small uppercase eyebrow labels fall below AA.
- No horizontal overflow at 360 / 390 / 414 / 768 / 1024 / 1280 / 1440 / 1920 px.
