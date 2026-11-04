// Numbered screenshot details open in place, without changing the page URL.
for (const button of document.querySelectorAll('[data-store-detail]')) {
  const dialog = document.getElementById(button.dataset.storeDetail);
  button.disabled = false;
  button.addEventListener('click', () => {
    document.body.classList.add('detail-open');
    dialog.showModal();
  });
  dialog.querySelector('.store-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => document.body.classList.remove('detail-open'));
}
