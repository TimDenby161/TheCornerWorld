// The Light or Dark theme picked with the Theme button, applied before the page draws.
// Nothing stored: the page follows the device's setting.
try {
  const theme = localStorage.getItem("tcw.theme");
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
} catch { /* storage blocked: follow the device */ }
