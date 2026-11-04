// Shared navigation, email copy, and the TriasWear screenshot tabs.
const findElement = (selector) => document.querySelector(selector);

findElement('#copy-email')?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('daxtonmz0021@gmail.com');
    findElement('#copy-email').textContent = 'Copied to clipboard';
    findElement('#copy-status').textContent = 'Email address copied.';
    setTimeout(() => {
      findElement('#copy-email').textContent = 'Copy email address';
    }, 2500);
  } catch {
    findElement('#copy-email').textContent = 'Select the address above to copy';
    findElement('#copy-status').textContent =
      'Copy is unavailable here. The address is shown above.';
  }
});

const mobileMenu = findElement('.mobile-nav');
if (mobileMenu) {
  const menuButton = mobileMenu.querySelector('summary');
  mobileMenu.addEventListener('toggle', () => {
    menuButton.setAttribute('aria-label', mobileMenu.open ? 'Close navigation' : 'Open navigation');
  });
  document.addEventListener('click', (event) => {
    if (!mobileMenu.contains(event.target)) mobileMenu.open = false;
  });
  mobileMenu.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', () => {
      mobileMenu.open = false;
    }),
  );
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileMenu.open) {
      mobileMenu.open = false;
      mobileMenu.querySelector('summary').focus();
    }
  });
}

const galleryTabs = findElement('.gallery-toolbar [role="tablist"]');
if (galleryTabs) {
  const version = new URL(import.meta.url).searchParams.get('v') || 'local';
  const { setupTabs } = await import(`./tabs.js?v=${version}`);
  setupTabs(galleryTabs);
}

// Home enables its controls after the room has initialized.
if (!findElement('.home-page')) document.documentElement.classList.add('enhanced');
