/* No Stress Here — shared theme (light default, optional dark) */
(function () {
  var KEY = "nsh-theme";
  var root = document.documentElement;

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(v) {
    try { localStorage.setItem(KEY, v); } catch (e) {}
  }
  function apply(theme) {
    root.setAttribute("data-theme", theme);
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < buttons.length; i++) {
      var dark = theme === "dark";
      buttons[i].setAttribute("aria-pressed", dark ? "true" : "false");
      buttons[i].setAttribute(
        "title",
        dark ? "Lights on! (for the morning people)" : "Lights off (your eyes deserve a nap)"
      );
      var label = buttons[i].querySelector(".theme-label");
      if (label) label.textContent = dark ? "Light" : "Dark";
    }
  }

  // White is the default; dark only when the visitor picked it.
  apply(read() === "dark" ? "dark" : "light");

  document.addEventListener("DOMContentLoaded", function () {
    apply(root.getAttribute("data-theme"));
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-theme-toggle]");
      if (!btn) return;
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      apply(next);
      write(next);
    });
  });
})();
