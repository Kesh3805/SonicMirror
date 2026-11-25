// Resolve theme and reduced motion before first paint (PDS §2). Default light.
(function () {
  try {
    var pref = localStorage.getItem("sm-theme") || "light";
    var dark =
      pref === "dark" ||
      (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    if (localStorage.getItem("sm-reduced-motion") === "true") {
      document.documentElement.dataset.reducedMotion = "true";
    }
  } catch (e) {
    document.documentElement.dataset.theme = "light";
  }
})();
