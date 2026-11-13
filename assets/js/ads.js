/* ============ No Stress Here — Google AdSense slots ============
   Ads stay OFF until a publisher ID and slot IDs are filled in below.
   While off, every slot keeps its `hidden` attribute and no Google script is loaded,
   so visitors see exactly the same site as before.

   To switch on:
     1. Put your publisher ID in CLIENT, e.g. "ca-pub-1234567890123456".
     2. Create display ad units in AdSense and paste each unit's data-ad-slot number into SLOTS.
     3. Put your publisher line into /ads.txt (see the comment in that file).

   Rules this file follows so ads never get in the way of playing:
     - only the fixed slots placed in the pages are used (no Auto ads, pop-ups, sticky bars or interstitials);
     - a slot is filled only when it scrolls near the screen, after the page has finished loading;
     - game pages show their single slot only when the page actually scrolls, so full-screen games never get one;
     - each slot reserves its height up front, so content never jumps when an ad arrives.

   Preview the positions without AdSense: add ?adpreview=1 to any page URL. */
(function () {
  "use strict";

  const CLIENT = "";              // "ca-pub-XXXXXXXXXXXXXXXX"
  const SLOTS = {
    "home-mid": "",               // inside the game list on the home page
    "home-bottom": "",            // under the game list on the home page
    "game-bottom": ""             // under the content of scrolling game pages (menus, quizzes)
  };

  const slots = [...document.querySelectorAll(".ad-slot[data-ad]")];
  if (!slots.length) return;

  const preview = /[?&]adpreview=1\b/.test(location.search);
  const live = /^ca-pub-\d{10,}$/.test(CLIENT) && /^https?:$/.test(location.protocol);
  if (!preview && !live) return;   // ads off: leave every slot hidden

  // a game page slot only makes sense when the page scrolls (menus, quizzes) — never on full-screen play areas
  const scrolls = () => document.documentElement.scrollHeight > innerHeight + 80;
  const wanted = (el) => (el.dataset.ad === "game-bottom" ? scrolls() : true);

  // un-hide a slot only if it really takes up space on the page (never serve an ad nobody can see)
  function reveal(el) {
    el.hidden = false;
    const r = el.getBoundingClientRect();
    if (r.width < 200 || r.height < 60 || !el.offsetParent) { el.hidden = true; return false; }
    return true;
  }

  function showPreview(el) {
    if (!reveal(el)) return;
    el.classList.add("ad-preview");
    el.innerHTML = `<span>Ad space · ${el.dataset.ad}</span>`;
  }

  let scriptAdded = false;
  function addScript() {
    if (scriptAdded) return;
    scriptAdded = true;
    const s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(CLIENT);
    document.head.appendChild(s);
  }
  function fill(el) {
    const id = SLOTS[el.dataset.ad];
    if (!id || el.dataset.filled) return;
    if (!reveal(el)) return;
    el.dataset.filled = "1";
    el.classList.add("ad-on");
    addScript();
    const ins = document.createElement("ins");
    ins.className = "adsbygoogle";
    ins.style.display = "block";
    ins.setAttribute("data-ad-client", CLIENT);
    ins.setAttribute("data-ad-slot", id);
    ins.setAttribute("data-ad-format", "auto");
    ins.setAttribute("data-full-width-responsive", "true");
    el.appendChild(ins);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* blocked by an ad blocker — the slot just stays empty */ }
  }

  function start() {
    const todo = slots.filter(wanted);
    if (preview) { todo.forEach(showPreview); return; }
    if (!("IntersectionObserver" in window)) { todo.forEach(fill); return; }
    // fill a slot only when it comes within ~400px of the screen;
    // hidden elements never intersect, so watch a tiny marker in the slot's place
    for (const el of todo) {
      const mark = document.createElement("span");
      mark.className = "ad-mark";
      el.before(mark);
      const io2 = new IntersectionObserver((en) => { if (en[0].isIntersecting) { io2.disconnect(); mark.remove(); fill(el); } }, { rootMargin: "400px 0px" });
      io2.observe(mark);
    }
  }

  // wait until the page (and the game) has fully loaded and the browser is idle
  const later = () => ("requestIdleCallback" in window ? requestIdleCallback(start, { timeout: 3000 }) : setTimeout(start, 1500));
  if (document.readyState === "complete") later(); else addEventListener("load", later, { once: true });
})();
