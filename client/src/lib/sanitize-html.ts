import DOMPurify from 'dompurify'

// The HTML of a customer's email is untrusted: anyone can send one. DOMPurify's defaults still allow forms, inputs,
// buttons, <style> and images, which would let a sender draw a fake login form over the app (or track who opens the
// ticket), so only plain formatting is kept. The allow-list is the main defence; the forbid lists below are a second
// layer and always win over it
const ALLOWED_TAGS = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'caption', 'code', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i',
  'li', 'ol', 'p', 'pre', 'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr',
  'u', 'ul',
]
const ALLOWED_ATTR = ['href', 'title', 'colspan', 'rowspan']
const FORBID_TAGS = [
  'style', 'form', 'input', 'button', 'textarea', 'select', 'option', 'img', 'iframe', 'object', 'embed', 'link', 'meta',
  'base',
]
// class and id too: the app's own Tailwind classes (fixed, inset-0, z-50...) could build an overlay without any <style>
const FORBID_ATTR = ['style', 'action', 'formaction', 'class', 'id']

// Every link opens in a new tab with no access to the app's window. This module is the only DOMPurify user, so the
// global hook affects nothing else. DOMPurify drops `target`, so it is set here, after the attributes were cleaned
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

// Returns safe HTML for dangerouslySetInnerHTML. javascript: and data: links are dropped by DOMPurify's own URL check
export function sanitizeEmailHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, FORBID_TAGS, FORBID_ATTR, ALLOW_DATA_ATTR: false })
}
