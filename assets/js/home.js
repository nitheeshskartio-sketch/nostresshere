/* ============ Home page interactions ============ */
(function () {
  var blobbyLines = [
    "Hey! That tickles. 😆",
    "I'm made of 97% chill and 3% jelly.",
    "Have you drunk water today? Go on. I'll wait.",
    "Your shoulders are up near your ears. Drop them. Yep, there.",
    "Deadlines? Never heard of them.",
    "Breathe in… breathe out… now poke me again.",
    "I'm not squishy, I'm emotionally flexible.",
    "Fun fact: worrying is like a rocking chair. Lots of motion, zero places.",
    "Please stop. Actually no, continue.",
    "Error 404: stress not found.",
    "Boop received. Processing boop… boop processed.",
    "You're doing great. Statistically, at least one person thinks so. It's me.",
    "If you poke me 1000 times, nothing happens. But it feels nice.",
    "Have you tried turning your worries off and on again?",
    "I've been poked so much I'm basically a pop it now."
  ];
  var forecasts = [
    "Today's forecast: 100% chance of chill",
    "Today's forecast: scattered naps, light snacks",
    "Today's forecast: high pressure… on bubbles only",
    "Today's forecast: zero meetings, partly cuddly",
    "Today's forecast: a gentle breeze of 'eh, it's fine'"
  ];

  function read(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function write(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var forecast = document.getElementById("forecast");
  if (forecast) forecast.textContent = forecasts[Math.floor(Math.random() * forecasts.length)];

  // ---- Blobby ----
  var mascot = document.getElementById("mascot");
  var speech = document.getElementById("speech");
  var pokeCount = document.getElementById("pokeCount");
  var pokes = parseInt(read("nsh-blobby-pokes", "0"), 10) || 0;
  var lastLine = -1;

  function renderPokes() {
    pokeCount.textContent = "Blobby has been poked " + pokes.toLocaleString() + (pokes === 1 ? " time." : " times.");
  }
  renderPokes();

  mascot.addEventListener("click", function () {
    pokes++;
    write("nsh-blobby-pokes", String(pokes));
    renderPokes();

    mascot.classList.remove("squish");
    void mascot.offsetWidth; // restart animation
    mascot.classList.add("squish");

    var i;
    do { i = Math.floor(Math.random() * blobbyLines.length); } while (i === lastLine);
    lastLine = i;
    var line = blobbyLines[i];
    if (pokes === 10) line = "10 pokes! We're basically best friends now.";
    if (pokes === 100) line = "100 pokes?! I'm getting you a trophy. 🏆 (It's imaginary.)";
    speech.textContent = line;
    speech.classList.remove("pop");
    void speech.offsetWidth;
    speech.classList.add("pop");
  });

  // ---- Mini pop-it on the game card ----
  var mini = document.getElementById("miniPopit");
  if (mini) {
    var colors = ["#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7"];
    var board = document.createElement("div");
    board.className = "mini-board";
    for (var r = 0; r < 4; r++) {
      for (var c = 0; c < 5; c++) {
        var tile = document.createElement("div");
        tile.className = "mini-tile";
        tile.style.setProperty("--c", colors[c]);
        var b = document.createElement("button");
        b.type = "button";
        b.className = "mini-bubble";
        b.setAttribute("aria-label", "Pop bubble");
        tile.appendChild(b);
        board.appendChild(tile);
      }
    }
    board.addEventListener("click", function (e) {
      var bub = e.target.closest(".mini-bubble");
      if (bub) bub.classList.toggle("pressed");
    });
    mini.appendChild(board);
  }
})();
