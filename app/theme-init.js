(function () {
  var preference = localStorage.getItem("microapp-theme");
  if (preference !== "light" && preference !== "dark" && preference !== "auto") {
    preference = "auto";
  }

  var dark =
    preference === "dark" ||
    (preference === "auto" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.themePreference = preference;
})();
