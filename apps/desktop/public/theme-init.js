// Resolve theme before first paint (PDS §2). Default light on fresh install.
(function () {
  try {
    var pref = localStorage.getItem("sm-theme") || "light";
    var dark =
      pref === "dark" ||
      (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch (e) {
    document.documentElement.dataset.theme = "light";
  }
})();
