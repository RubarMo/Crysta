// Applies the saved theme and language direction before the app renders,
// so the window doesn't flash the light theme on startup.
(function () {
  try {
    var theme = localStorage.getItem('theme');
    var dark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';

    var lang = localStorage.getItem('crysta_lang') === 'en' ? 'en' : 'ar';
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  } catch (e) {
    // Storage unavailable: keep the defaults.
  }
})();
