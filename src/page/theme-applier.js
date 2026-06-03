export function applyEditorThemes() {
  const isDark = document.body.getAttribute('data-theme') === 'dark';

  document.querySelectorAll('code-editor, java-editor, javascript-editor').forEach((editor) => {
    const textSrc = editor.getAttribute('textSrc');
    const isConstantThemeExample = textSrc === '7-theme/right.js';
    if (isConstantThemeExample) {
      return;
    }

    const path = isDark ? 'dark-theme.json' : null;
    editor.updateThemeFrom && editor.updateThemeFrom(path);
  });
}