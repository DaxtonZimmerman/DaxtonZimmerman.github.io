// The same small tab controller powers instruments, previews, and the store gallery.
export function setupTabs(group, onSelect = () => {}) {
  if (!group) return () => {};
  const tabs = [...group.querySelectorAll('[role="tab"]')];
  function select(tab, focus = false) {
    if (!tab) return;
    tabs.forEach((button) => {
      const selected = button === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      document.getElementById(button.getAttribute('aria-controls')).hidden = !selected;
    });
    onSelect(tab);
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (
        event.key ===
        (group.getAttribute('aria-orientation') === 'vertical' ? 'ArrowDown' : 'ArrowRight')
      )
        next = (index + 1) % tabs.length;
      if (
        event.key ===
        (group.getAttribute('aria-orientation') === 'vertical' ? 'ArrowUp' : 'ArrowLeft')
      )
        next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        select(tabs[next], true);
      }
    });
  });
  return select;
}
