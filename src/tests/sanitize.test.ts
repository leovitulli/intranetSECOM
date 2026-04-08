import { describe, it, expect } from 'vitest'
import { sanitizeHTML, sanitizeText } from '../utils/sanitize'

describe('sanitizeText', () => {
  it('returns plain text unchanged', () => {
    expect(sanitizeText('Hello World')).toBe('Hello World')
  })

  it('removes script tags completely', () => {
    const result = sanitizeText('<script>alert("XSS")</script>')
    expect(result).toBe('')
  })

  it('strips all HTML tags from input', () => {
    const result = sanitizeText('<b>bold</b> and <i>italic</i>')
    expect(result).toBe('bold and italic')
  })

  it('removes event handlers from elements', () => {
    const result = sanitizeText('<img src=x onerror="alert(1)">')
    expect(result).toBe('')
  })

  it('removes javascript: URLs', () => {
    const result = sanitizeText('<a href="javascript:alert(1)">click</a>')
    expect(result).toBe('click')
  })

  it('handles empty string', () => {
    expect(sanitizeText('')).toBe('')
  })

  it('handles unicode characters', () => {
    expect(sanitizeText('Olá 🎉 Mundo')).toBe('Olá 🎉 Mundo')
  })
})

describe('sanitizeHTML', () => {
  it('allows safe formatting tags', () => {
    const result = sanitizeHTML('<b>bold</b> and <i>italic</i>')
    expect(result).toContain('<b>bold</b>')
    expect(result).toContain('<i>italic</i>')
  })

  it('allows safe links with target and rel', () => {
    const result = sanitizeHTML('<a href="https://example.com" target="_blank" rel="noopener">link</a>')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('link')
  })

  it('blocks javascript: URLs in links', () => {
    const result = sanitizeHTML('<a href="javascript:alert(1)">click</a>')
    expect(result).not.toContain('javascript:')
  })

  it('blocks script tags', () => {
    const result = sanitizeHTML('<script>alert("XSS")</script>')
    expect(result).not.toContain('<script>')
  })

  it('blocks event handlers', () => {
    const result = sanitizeHTML('<img src="x" onerror="alert(1)">')
    expect(result).not.toContain('onerror')
  })

  it('blocks iframe injection', () => {
    const result = sanitizeHTML('<iframe src="https://evil.com"></iframe>')
    expect(result).not.toContain('iframe')
  })

  it('allows basic list elements', () => {
    const result = sanitizeHTML('<ul><li>item 1</li><li>item 2</li></ul>')
    expect(result).toContain('<li>')
  })

  it('handles empty string', () => {
    expect(sanitizeHTML('')).toBe('')
  })
})
