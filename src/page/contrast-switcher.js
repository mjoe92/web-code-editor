const prefersDark = window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const currentTheme = prefersDark ? 'dark' : 'light';

document.body.setAttribute('data-theme', currentTheme);

import { applyEditorThemes } from './theme-applier.js';

// Apply once after full page load so editors are ready
if (document.readyState === 'complete') {
  applyEditorThemes();
} else {
  window.addEventListener('load', () => {
    applyEditorThemes();
  });
}

document.getElementById('contrast-switcher')?.addEventListener('click', () => {
  const nextTheme = document.body.getAttribute('data-theme') === 'dark' ? '' : 'dark';
  document.body.setAttribute('data-theme', nextTheme);
  applyEditorThemes();
});
