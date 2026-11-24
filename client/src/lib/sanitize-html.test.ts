import { describe, expect, it } from 'vitest'
import { sanitizeEmailHtml } from './sanitize-html'

// Parses the result, so the tests look at real elements and attributes and not at strings
function parse(html: string) {
  const root = document.createElement('div')
  root.innerHTML = sanitizeEmailHtml(html)
  return root
}

describe('sanitizeEmailHtml', () => {
  describe('removes interactive and styling elements', () => {
    it.each([
      ['form', '<form action="https://evil.example/steal"><p>Sign in</p></form>'],
      ['input', '<input type="password" name="pw">'],
      ['button', '<button type="submit">Log in</button>'],
      ['textarea', '<textarea>secret</textarea>'],
      ['select', '<select><option>a</option></select>'],
      ['option', '<option>a</option>'],
      ['style', '<style>body{display:none}</style>'],
      ['img', '<img src="https://tracker.example/pixel.gif">'],
      ['iframe', '<iframe src="https://evil.example"></iframe>'],
      ['object', '<object data="https://evil.example"></object>'],
      ['embed', '<embed src="https://evil.example">'],
      ['link', '<link rel="stylesheet" href="https://evil.example/x.css">'],
      ['meta', '<meta http-equiv="refresh" content="0;url=https://evil.example">'],
      ['base', '<base href="https://evil.example/">'],
      ['script', '<script>alert(1)</script>'],
    ])('removes <%s>', (tag, html) => {
      expect(parse(`<p>Hello</p>${html}`).querySelector(tag)).toBeNull()
    })

    it('leaves no CSS text behind from a removed <style>', () => {
      const out = sanitizeEmailHtml('<p>Hello</p><style>.x{position:fixed;inset:0}</style>')

      expect(out).not.toContain('position')
      expect(out).toContain('Hello')
    })

    it('keeps the text around a removed form but none of its controls', () => {
      const root = parse('<form action="https://evil.example"><p>Session expired</p><input name="pw"><button>Go</button></form>')

      expect(root.textContent).toContain('Session expired')
      expect(root.querySelector('form, input, button')).toBeNull()
    })

    it('gives plain text, with no elements, for input made only of forbidden tags', () => {
      const root = parse('<style>a{}</style><input><img src="x"><iframe></iframe>')

      expect(root.querySelectorAll('*')).toHaveLength(0)
    })
  })

  describe('removes dangerous attributes', () => {
    it('removes action, formaction, style, class, id and data attributes', () => {
      const root = parse(
        '<p style="position:fixed" class="fixed inset-0 z-50 bg-background" id="x" data-x="1" action="https://evil.example" formaction="https://evil.example">Hi</p>',
      )
      const p = root.querySelector('p')!

      expect(p).toHaveTextContent('Hi')
      for (const attr of ['style', 'class', 'id', 'data-x', 'action', 'formaction']) {
        expect(p.hasAttribute(attr), attr).toBe(false)
      }
    })

    it('removes event handler attributes', () => {
      const root = parse('<p onclick="alert(1)" onmouseover="alert(2)">Hi</p><a href="https://example.com" onclick="alert(3)">x</a>')

      expect(root.querySelector('[onclick], [onmouseover]')).toBeNull()
    })

    it('drops a javascript: link target', () => {
      const root = parse('<a href="javascript:alert(1)">click</a>')

      expect(root.textContent).toBe('click')
      expect(root.querySelector('a')?.getAttribute('href') ?? null).toBeNull()
    })
  })

  describe('keeps a normal formatted email', () => {
    const email =
      '<p>Hi team,</p><p>I <b>really</b> need <i>help</i> with <a href="https://example.com/order/42">my order</a>.<br>Thanks</p>' +
      '<ul><li>first</li><li>second</li></ul><ol><li>one</li></ol><blockquote>On Monday you wrote</blockquote>'

    it('keeps paragraphs, bold, italic, line breaks, lists and quotes', () => {
      const root = parse(email)

      expect(root.querySelectorAll('p')).toHaveLength(2)
      expect(root.querySelector('b')).toHaveTextContent('really')
      expect(root.querySelector('i')).toHaveTextContent('help')
      expect(root.querySelector('br')).not.toBeNull()
      expect([...root.querySelectorAll('ul > li')].map((li) => li.textContent)).toEqual(['first', 'second'])
      expect(root.querySelector('ol > li')).toHaveTextContent('one')
      expect(root.querySelector('blockquote')).toHaveTextContent('On Monday you wrote')
    })

    it('keeps the link and its address', () => {
      const link = parse(email).querySelector('a')!

      expect(link).toHaveTextContent('my order')
      expect(link).toHaveAttribute('href', 'https://example.com/order/42')
    })

    it('returns an empty string for an empty input', () => {
      expect(sanitizeEmailHtml('')).toBe('')
    })
  })

  describe('links', () => {
    it('opens every link in a new tab without access to the app window', () => {
      const links = [...parse('<a href="https://a.example">a</a><p><a href="mailto:b@example.com">b</a></p>').querySelectorAll('a')]

      expect(links).toHaveLength(2)
      for (const link of links) {
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      }
    })

    it('overwrites a target and rel the sender chose', () => {
      const link = parse('<a href="https://a.example" target="_self" rel="opener">a</a>').querySelector('a')!

      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })
})
