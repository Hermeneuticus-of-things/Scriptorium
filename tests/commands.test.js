import { describe, it, expect } from 'vitest';
import { keyFromEvent, normalizeCombo, shortcutFor, conflicts } from '../src/lib/commands.js';

describe('commands', () => {
  it('builds combos from events', () => {
    expect(keyFromEvent({ key: 'k', ctrlKey: true, shiftKey: true })).toBe('Ctrl+Shift+K');
    expect(keyFromEvent({ key: 'ArrowDown', ctrlKey: true, altKey: true })).toBe('Ctrl+Alt+↓');
    expect(keyFromEvent({ key: 'F11' })).toBe('F11');
    expect(keyFromEvent({ key: 'Shift', shiftKey: true })).toBe('');
  });
  it('normalizes user input', () => {
    expect(normalizeCombo('shift + ctrl + k')).toBe('Ctrl+Shift+K');
    expect(normalizeCombo('cmd+alt+x')).toBe('Ctrl+Alt+X');
  });
  it('uses custom shortcuts, allows disabling, detects conflicts', () => {
    const s = { shortcuts: { split: 'Ctrl+J', duplicate: '', goto: 'Ctrl+J' } };
    expect(shortcutFor('split', s)).toBe('Ctrl+J');
    expect(shortcutFor('duplicate', s)).toBe('');
    expect(shortcutFor('save', s)).toBe('Ctrl+S');
    expect([...conflicts(['split', 'goto', 'save'], s)].sort()).toEqual(['goto', 'split']);
  });
});

describe('commands: layout-dependent keys', () => {
  it('uses the physical key when Option/Alt or Shift changes the character (macOS Option+R = ®)', () => {
    expect(keyFromEvent({ key: '®', code: 'KeyR', ctrlKey: true, altKey: true, shiftKey: true })).toBe('Ctrl+Alt+Shift+R');
    expect(keyFromEvent({ key: '†', code: 'KeyT', ctrlKey: true, altKey: true })).toBe('Ctrl+Alt+T');
    expect(keyFromEvent({ key: '%', code: 'Digit5', ctrlKey: true, shiftKey: true })).toBe('Ctrl+Shift+5');
  });
  it('normalizes named keys the way keyFromEvent spells them', () => {
    expect(normalizeCombo('ctrl+alt+down')).toBe('Ctrl+Alt+↓');
    expect(normalizeCombo('alt+left')).toBe('Alt+←');
    expect(normalizeCombo('escape')).toBe('Esc');
    expect(normalizeCombo('f11')).toBe('F11');
  });
});

describe('commands: non-QWERTY layouts', () => {
  it('keeps the typed letter when it is already a letter (AZERTY A sits on KeyQ)', () => {
    expect(keyFromEvent({ key: 'A', code: 'KeyQ', ctrlKey: true, shiftKey: true })).toBe('Ctrl+Shift+A');
  });
});
