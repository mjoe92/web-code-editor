const prefersDark = window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const currentTheme = prefersDark ? 'dark' : 'light';

document.body.setAttribute('data-theme', currentTheme);

document.getElementById('contrast-switcher')?.addEventListener('click', () => {
  const nextTheme = document.body.getAttribute('data-theme') === 'dark' ? '' : 'dark';
  document.body.setAttribute('data-theme', nextTheme);
});