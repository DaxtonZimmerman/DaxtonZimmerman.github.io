// Public form receiver URL. It is not an account credential or an API key.
export const inquiryEndpoint =
  'https://script.google.com/macros/s/AKfycbzJ_PxDcnANppahbrIsW5MOaFdlOlTb-8aqX8NNYtu0_O8EeuHkP69Qlo_bby0b6NDm/exec';

export function acceptedDelivery(response, data) {
  return response.ok && data?.accepted === true;
}
export async function sendInquiry(data, send = fetch) {
  const response = await send(inquiryEndpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(25000),
    // A plain-text JSON body avoids an unnecessary cross-origin preflight.
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!acceptedDelivery(response, result)) {
    const error = new Error('Delivery unavailable');
    error.status = response.status;
    throw error;
  }
  return result;
}
const form = typeof document !== 'undefined' ? document.querySelector('#inquiry-form') : null;
if (form) {
  const button = document.querySelector('#inquiry-submit'),
    status = document.querySelector('#inquiry-status');
  const type = new URL(location.href).searchParams.get('type');
  if (['website', 'role', 'other'].includes(type)) form.elements.type.value = type;
  button.disabled = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity() || button.disabled) return;
    const data = Object.fromEntries(new FormData(form));
    if (data._honey) return;
    button.disabled = true;
    button.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Sending your message…';
    try {
      await sendInquiry(data);
      // Preserve any newer edits made while the request was sending.
      const unchanged = Object.entries(data).every(
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
      form.removeAttribute('aria-busy');
      button.disabled = false;
      button.textContent = 'Send message';
      status.focus();
    }
  });
}
