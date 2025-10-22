document.getElementById('contrast-switcher').addEventListener('click', () => {
    document.body.setAttribute(
        'data-theme',
        document.body.getAttribute('data-theme') === 'dark' ? '' : 'dark'
    );
});