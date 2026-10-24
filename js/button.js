/**
 * TugasIn - Button Component
 * Standardized Button helper complying with Task 2 Design System tokens.
 * Variants: primary, secondary, ghost, danger, outline
 * Sizes: sm (32px), md (40px, default), lg (48px)
 * Supports icons, loading state, disabled, and mobile touch targets.
 */

function Button(props = {}) {
  const {
    text = '',
    variant = 'secondary', // primary, secondary, ghost, danger, outline
    size = 'md',           // sm, md, lg
    icon = '',
    type = 'button',
    id = '',
    className = '',
    onClick = '',
    title = '',
    disabled = false,
    loading = false,
    style = '',
    isIconOnly = false
  } = props;

  const classes = ['btn'];

  // Variant
  if (['primary', 'secondary', 'ghost', 'danger', 'danger-solid', 'outline'].includes(variant)) {
    classes.push(`btn-${variant}`);
  } else {
    classes.push('btn-secondary');
  }

  // Size
  if (size === 'sm') {
    classes.push('btn-sm');
  } else if (size === 'lg') {
    classes.push('btn-lg');
  } else {
    classes.push('btn-md');
  }

  // Square icon only button
  if (isIconOnly || (!text && icon)) {
    classes.push('btn-icon');
    if (size === 'sm') classes.push('btn-icon-sm');
    if (size === 'lg') classes.push('btn-icon-lg');
  }

  if (className) classes.push(className);

  const idAttr = id ? ` id="${id}"` : '';
  const titleAttr = title ? ` title="${escapeAttr(title)}"` : '';
  const styleAttr = style ? ` style="${style}"` : '';
  const disabledAttr = (disabled || loading) ? ' disabled' : '';
  const onClickAttr = onClick ? ` onclick="${onClick}"` : '';

  let content = '';
  if (loading) {
    content += '<span class="btn-spinner" style="display:inline-block; width:14px; height:14px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:btnSpin 0.7s linear infinite;"></span> ';
  } else if (icon) {
    content += `<span class="btn-icon-element">${icon}</span> `;
  }
  if (text) {
    content += `<span class="btn-text">${text}</span>`;
  }

  return `<button type="${type}" class="${classes.join(' ')}"${idAttr}${titleAttr}${styleAttr}${disabledAttr}${onClickAttr}>${content}</button>`;
}

Button.createElement = function(props = {}) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = Button(props);
  return wrapper.firstElementChild;
};

function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

window.Button = Button;
