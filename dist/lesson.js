// A small HTML/CSS example. The full learning workspace is in Codepath.
const htmlInput = document.querySelector('#lesson-html');
const cssInput = document.querySelector('#lesson-css');
const preview = document.querySelector('#lesson-preview');
const resetButton = document.querySelector('#lesson-reset');
const status = document.querySelector('#lesson-status');
const initialHtml = htmlInput.value;
const initialCss = cssInput.value;
let updateTimer;

function updatePreview() {
  // The sandbox blocks scripts and access to the portfolio. CSP also blocks
  // network requests, forms, and external assets in the visitor's example.
  preview.srcdoc = `<!doctype html><html><head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>* { box-sizing: border-box; } body { margin: 0; overflow-wrap: anywhere; } ${cssInput.value}</style>
    </head><body>${htmlInput.value}</body></html>`;
}

function schedulePreview() {
  clearTimeout(updateTimer);
  updateTimer = setTimeout(() => {
    updatePreview();
    status.textContent =
      'Preview updated. Your changes stay in this page until you leave or reset.';
  }, 400);
}

htmlInput.addEventListener('input', schedulePreview);
cssInput.addEventListener('input', schedulePreview);
resetButton.addEventListener('click', () => {
  clearTimeout(updateTimer);
  htmlInput.value = initialHtml;
  cssInput.value = initialCss;
  updatePreview();
  status.textContent = 'Original example restored. Try another idea.';
});

updatePreview();
resetButton.disabled = false;
