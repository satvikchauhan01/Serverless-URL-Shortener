// Runs before the page paints, so a saved light/dark choice never flashes the other theme.
try {
  const theme = localStorage.getItem('hop.theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch {
  // Storage can be blocked (private windows, strict settings); the system theme applies.
}
