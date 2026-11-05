import { sendInquiry } from './contact.js';

export function flyerInquiry(fields) {
  return {
    name: fields.name,
    email: fields.email,
    type: 'other',
    _honey: fields._honey || '',
    message: `Agent Flyers\nSample: ${fields.design}\n\n${fields.message}${fields.photos ? `\n\nPhoto or project link: ${fields.photos}` : ''}`,
  };
}

if (typeof document !== 'undefined') {
  const dialog = document.querySelector('#sample-dialog');
  const previewImage = document.querySelector('#preview-image');
  const previewTitle = document.querySelector('#preview-title');
  const previewDownload = document.querySelector('#preview-download');
  document.querySelectorAll('[data-preview]').forEach((button) => {
    button.disabled = false;
    button.addEventListener('click', () => {
      const sample = button.closest('.sample');
      const download = sample.querySelector('a[download]');
      previewImage.src = download.href;
      previewImage.alt = button.querySelector('img').alt;
      previewTitle.textContent = sample.querySelector('h3').textContent;
      previewDownload.href = download.href;
      dialog.showModal();
    });
  });
  dialog
    .querySelectorAll('.close')
    .forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      dialog.close();
  });
  const form = document.querySelector('#flyer-form');
  const submit = document.querySelector('#flyer-submit');
  const status = document.querySelector('#flyer-status');
  document.querySelectorAll('[data-choose]').forEach((link) =>
    link.addEventListener('click', () => {
      form.elements.design.value = link.dataset.choose;
      form.elements.name.focus({ preventScroll: true });
    }),
  );
  submit.disabled = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit.disabled || !form.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(form));
    if (fields._honey) return;
    const data = flyerInquiry(fields);
    submit.disabled = true;
    submit.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending your message…';
    try {
      await sendInquiry(data);
      const unchanged = Object.entries(fields).every(
        ([key, value]) => form.elements[key]?.value === value,
      );
      if (unchanged) form.reset();
      status.textContent = unchanged
        ? 'Message sent. Thanks for getting in touch.'
        : 'Message sent. Your newer changes are still in the form.';
    } catch (error) {
      status.textContent =
        error.status === 429
          ? 'Please wait a few minutes before trying again. Your message is still here.'
          : 'Your message could not be sent. Your text is still here. Please try again later.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'Send message';
      form.removeAttribute('aria-busy');
      status.focus();
    }
  });
}
