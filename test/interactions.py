"""Exercise every interactive control on The Botanical Oak site."""
import sys
from playwright.sync_api import sync_playwright

URL = "http://localhost:4173"
results = []

def check(name, got, want):
    ok = got == want
    results.append(ok)
    print(("  PASS  " if ok else "  FAIL  ") + name + f"   got={got!r} want={want!r}")

with sync_playwright() as p:
    b = p.chromium.launch(headless=True, channel="chrome")

    # ---------------- desktop ----------------
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(URL); pg.wait_for_load_state("networkidle")
    pg.wait_for_timeout(1500)  # preloader lift

    print("\n[1] STORY CLIPS — unmute toggle + one-at-a-time")
    pg.locator("#stories").scroll_into_view_if_needed()
    pg.wait_for_timeout(2500)  # let IO fire + videos start

    vids = pg.locator(".js-story")
    check("both clips start muted", vids.nth(0).evaluate("v=>v.muted") and vids.nth(1).evaluate("v=>v.muted"), True)
    check("clip 1 is playing", vids.nth(0).evaluate("v=>!v.paused"), True)

    # click the dedicated sound button on clip 1
    pg.locator(".story").nth(0).locator(".phone__sound").click()
    pg.wait_for_timeout(400)
    check("sound-button unmutes clip 1", vids.nth(0).evaluate("v=>v.muted"), False)

    # now unmute clip 2 -> clip 1 must go quiet
    pg.locator(".story").nth(1).locator(".phone__sound").click()
    pg.wait_for_timeout(400)
    check("clip 2 unmuted", vids.nth(1).evaluate("v=>v.muted"), False)
    check("clip 1 auto-muted (one at a time)", vids.nth(0).evaluate("v=>v.muted"), True)

    # clicking the frame body (not the button) should also toggle
    pg.locator(".story").nth(0).locator(".phone").click(position={"x": 20, "y": 300})
    pg.wait_for_timeout(400)
    check("frame click unmutes clip 1", vids.nth(0).evaluate("v=>v.muted"), False)
    check("clip 2 auto-muted", vids.nth(1).evaluate("v=>v.muted"), True)

    # icon should reflect state
    icon = pg.locator(".story").nth(0).locator(".phone__sound use").get_attribute("href")
    check("icon shows sound-on", icon, "#i-sound-on")

    print("\n[2] SCENTS + CONTACT")
    pg.locator("#scents").scroll_into_view_if_needed(); pg.wait_for_timeout(900)
    check("five named scents listed", pg.locator(".scents__list h3").count(), 5)
    check("range image loaded", pg.locator(".scents__media img").evaluate("i=>i.naturalWidth>0"), True)

    pg.locator("#contact").scroll_into_view_if_needed(); pg.wait_for_timeout(900)
    check("contact CTA is a mailto",
          (pg.locator(".contact__cta").get_attribute("href") or "").startswith("mailto:"), True)
    check("three enquiry rows", pg.locator(".contact__rows li").count(), 3)

    print("\n[3] NO COMMERCE REMNANTS")
    body = pg.locator("body").inner_text()
    check("no add-to-basket control", pg.locator("#addToCart").count(), 0)
    check("no quantity picker", pg.locator('input[name="qty"]').count(), 0)
    check("no currency anywhere", any(c in body for c in "£$€"), False)
    check("no basket/checkout wording",
          any(w in body.lower() for w in ("basket", "checkout", "add to cart", "delivery over")), False)
    check("nav CTA points at contact", pg.locator(".nav__cta").get_attribute("href"), "#contact")

    print("\n[3b] US ENGLISH — no UK wording")
    # the brand is Californian; the copy must not drift back to British English
    UK = ("england", "british", " uk ", "colour", "mould", "hedgerow", "fortnight",
          "stockist", "catalogue", "enquir", "co.uk", "behaviour", "optimise",
          "whilst", "amongst", "licence", "shop window")
    haystack = (body + " " + pg.content()).lower()
    check("no UK terms in page", sorted({t.strip() for t in UK if t in haystack}), [])
    check("lang is en-US", pg.locator("html").get_attribute("lang"), "en-US")
    check("email is not .co.uk",
          ".co.uk" in (pg.locator(".contact__cta").get_attribute("href") or ""), False)
    check("made-in line says California", "california" in body.lower(), True)

    print("\n[4] NEWSLETTER")
    pg.locator("#signup input").fill("hello@example.com")
    pg.locator("#signup button[type=submit]").click()
    pg.wait_for_timeout(400)
    check("field hidden after submit", pg.locator("#signup .field").is_hidden(), True)
    check("confirmation shown", pg.locator("#signupOk").is_visible(), True)
    pg.close()

    # ---------------- mobile ----------------
    print("\n[5] MOBILE MENU")
    m = b.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    m.goto(URL); m.wait_for_load_state("networkidle"); m.wait_for_timeout(1500)

    burger = m.locator("#burger")
    check("menu starts closed", burger.get_attribute("aria-expanded"), "false")
    burger.click(); m.wait_for_timeout(900)
    check("burger opens menu", burger.get_attribute("aria-expanded"), "true")
    check("menu has is-open", "is-open" in (m.locator("#navLinks").get_attribute("class") or ""), True)
    check("nav link clickable", m.locator("#navLinks a").first.is_visible(), True)

    m.keyboard.press("Escape"); m.wait_for_timeout(900)
    check("Escape closes menu", burger.get_attribute("aria-expanded"), "false")

    burger.click(); m.wait_for_timeout(900)
    m.locator("#navLinks a", has_text="Stories").click(); m.wait_for_timeout(900)
    check("link click closes menu", burger.get_attribute("aria-expanded"), "false")
    # body keeps overflow-x:hidden by design, so check the inline lock is released
    check("body scroll lock released", m.evaluate("document.body.style.overflow"), "")
    check("page can scroll", m.evaluate("(()=>{window.scrollTo(0,600);return window.scrollY>0})()"), True)

    print("\n[6] MOBILE STICKY CRAFT IMAGE")
    # Regression guard: the image used to scroll away above the steps on phones,
    # so the cross-fade fired off-screen. It must stay pinned, and it must never
    # cover the heading of the step it is illustrating.
    check("visual is sticky on phones",
          m.evaluate("getComputedStyle(document.querySelector('.craft__visual')).position"), "sticky")
    top = m.evaluate("document.querySelector('.craft').getBoundingClientRect().top+window.scrollY")
    seen = []
    for off in (150, 450, 750):
        # instant, not smooth: the CSS sets scroll-behavior:smooth and a
        # ~1100px animated jump can outlast the wait, giving a false failure
        m.evaluate("window.scrollTo({top:%d,behavior:'instant'})" % (top + off))
        m.wait_for_timeout(650)
        seen.append(m.evaluate("""(()=>{
            const v=document.querySelector('.craft__visual').getBoundingClientRect();
            const on=document.querySelector('.craft__step.is-on');
            const h=on.querySelector('h2').getBoundingClientRect();
            return {pinned: v.top<=2 && v.bottom>150,
                    headingClear: h.top >= v.bottom-6 && h.bottom <= window.innerHeight,
                    img: document.querySelector('.craft__img.is-active').dataset.step,
                    step: on.dataset.step}})()"""))
    check("image stays pinned while steps scroll past", all(x["pinned"] for x in seen), True)
    check("active step's heading is never behind the image", all(x["headingClear"] for x in seen), True)
    check("pinned image matches the active step", all(x["img"] == x["step"] for x in seen), True)
    m.close()

    # ---------------- testimonials page ----------------
    print("\n[7] TESTIMONIALS PAGE")
    t = b.new_page(viewport={"width": 1440, "height": 900})
    t.goto(URL + "/testimonials.html"); t.wait_for_load_state("networkidle"); t.wait_for_timeout(1600)
    check("page loads with a title", "Testimonials" in t.title(), True)
    check("ten testimonials", t.locator(".tcard").count(), 10)
    check("every one has an attribution", t.locator(".tcard figcaption b").count(), 10)

    # These are fabricated quotes on a real business's site. The banner is what
    # stops them reading as genuine reviews, so it must not quietly disappear.
    check("placeholder banner present", t.locator(".draftnote").is_visible(), True)
    check("banner says they are not real",
          "not real customer reviews" in t.locator(".draftnote").inner_text(), True)
    check("page is noindex",
          t.locator('meta[name="robots"]').get_attribute("content"), "noindex, nofollow")

    # cross-page nav has to resolve back to the home sections, not to dead #anchors
    hrefs = t.eval_on_selector_all(".nav__links a", "els=>els.map(e=>e.getAttribute('href'))")
    check("no bare # anchors in subpage nav", [h for h in hrefs if h.startswith("#")], [])
    check("nav points home", "index.html#bar" in hrefs, True)
    check("current page marked",
          t.locator('.nav__links a[aria-current="page"]').count(), 1)
    dead = t.evaluate("""[...document.querySelectorAll('a[href^="#"]')]
        .map(a=>a.getAttribute('href')).filter(h=>h!=='#'&&!document.querySelector(h))""")
    check("no dead anchors on the page", dead, [])
    t.close()

    # and the home page must actually link to it
    h = b.new_page(viewport={"width": 1440, "height": 900})
    h.goto(URL); h.wait_for_load_state("networkidle"); h.wait_for_timeout(1200)
    check("home nav links to testimonials",
          h.locator('.nav__links a[href="testimonials.html"]').count(), 1)
    h.close()

    b.close()

print(f"\n{'='*52}\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
