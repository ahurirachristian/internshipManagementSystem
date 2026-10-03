const fs = require('fs');
const path = require('path');

const {
  CONTROL_CLASS,
  COMPACT_CONTROL_CLASS,
  CONTROL_DISABLED_CLASS,
} = require('./formControls');

const SRC = path.resolve(__dirname, '..', '..');

/**
 * Native <select> and the date/time inputs were the one part of the form controls
 * that had no styling system: every field copy-pasted the class string, which is
 * how six dialects ended up in the app. These tests fail if that comes back.
 *
 * The failure mode they guard is silent — a hand-written class still renders, it
 * just renders in the wrong colours — so nothing else in the suite would notice.
 */

const DATE_TYPES = ['date', 'datetime-local', 'time', 'month', 'week'];

/** Every .js/.jsx source file under src, excluding tests and this file. */
function sourceFiles(dir = SRC) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    if (!/\.(js|jsx)$/.test(entry.name)) return [];
    if (/\.test\.jsx?$/.test(entry.name)) return [];
    // This module documents the controls it defines, so its own prose mentions
    // <select> in comments. Scanning it would test the documentation, not a field.
    if (entry.name === 'formControls.js') return [];
    return [full];
  });
}

/**
 * Read the whole opening tag, so a control's className is matched against its own
 * attributes only. A plain split on ">" would stop at the arrow in
 * `onChange={(e) => ...}` and read a truncated tag, which is how an earlier
 * version of this check reported false misses on every select it had fixed.
 */
function openingTag(source, startIndex) {
  let depth = 0;
  let quote = null;
  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
    } else if (char === '"' || char === "'" || char === '`') {
      quote = char;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
    } else if (char === '>' && depth === 0) {
      return source.slice(startIndex, i + 1);
    }
  }
  return '';
}

/** Every native select and date/time input in the app, with file and line. */
function nativeControls() {
  const found = [];
  for (const file of sourceFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    const tagPattern = /<(select|input)\b/g;
    let match;
    while ((match = tagPattern.exec(source)) !== null) {
      const tag = openingTag(source, match.index + match[0].length);
      const isDate = new RegExp(`type\\s*=\\s*["'](${DATE_TYPES.join('|')})["']`).test(tag);
      if (match[1] === 'input' && !isDate) continue;
      found.push({
        file: path.relative(SRC, file),
        line: source.slice(0, match.index).split('\n').length,
        tag,
      });
    }
  }
  return found;
}

describe('native form controls share one definition', () => {
  const controls = nativeControls();

  it('finds the controls it is meant to be checking', () => {
    // Guards the test itself: a scanner that silently matched nothing would make
    // every assertion below pass for the wrong reason.
    expect(controls.length).toBeGreaterThan(20);
  });

  it('gives every select and date input the shared class, not a hand-written one', () => {
    const offToken = controls.filter(
      (control) => !/className=\{[^}]*CONTROL_CLASS/.test(control.tag),
    );
    const report = offToken
      .map(({ file, line, tag }) => `${file}:${line} ${tag.replace(/\s+/g, ' ').slice(0, 90)}`)
      .join('\n');
    expect(report).toBe('');
  });

  it('keeps a control that can be disabled carrying the disabled treatment', () => {
    controls
      .filter((control) => /\bdisabled\b/.test(control.tag))
      .forEach(({ file, line, tag }) => {
        // A select with disabled={...} and no disabled styling reads as broken
        // rather than unavailable. Matched by reference, not by the literal
        // utility names, because the sites compose the token into a template
        // literal and the utilities never appear in the JSX.
        expect(/CONTROL_DISABLED_CLASS/.test(tag)).toBe(true);
        expect({ file, line }).toBeTruthy();
      });
  });
});

describe('the shared definition itself', () => {
  const surface = [
    'bg-white',
    'dark:bg-slate-900',
    'text-slate-900',
    'dark:text-slate-100',
    'rounded-xl',
    'border',
    'border-slate-300',
    'dark:border-slate-700',
  ];

  it('gives both densities the same surface and border, so only padding differs', () => {
    surface.forEach((token) => {
      expect(CONTROL_CLASS).toContain(token);
      expect(COMPACT_CONTROL_CLASS).toContain(token);
    });
    expect(COMPACT_CONTROL_CLASS).not.toBe(CONTROL_CLASS);
  });

  it('styles both themes, or the control falls back to the UA default', () => {
    [CONTROL_CLASS, COMPACT_CONTROL_CLASS].forEach((token) => {
      expect(token).toContain('dark:');
      expect(token).toContain('focus:ring-teal-600');
    });
  });

  it('emits complete Tailwind utilities rather than partial class names', () => {
    // Tailwind scans these files as plain text, so a token it cannot recognise is
    // simply dropped from the build and the field loses that property silently.
    [CONTROL_CLASS, COMPACT_CONTROL_CLASS, CONTROL_DISABLED_CLASS]
      .join(' ')
      .split(/\s+/)
      .filter(Boolean)
      .forEach((token) => {
        expect(token).toMatch(
          /^(dark:|focus:|disabled:)?(w|bg|text|border|ring|rounded|shadow|opacity|cursor|transition|outline|font|px|py|p|m)[a-z0-9/[\].:%-]*$/,
        );
      });
  });
});

describe('the hand-built dropdown follows the same definition', () => {
  // CustomSelect is a <button> and a <ul>, so the scanner above cannot see it —
  // it is the reason 17 dropdowns still rendered a token off after the native
  // selects had all been migrated. These assertions are the guard for that gap.
  const source = fs.readFileSync(path.join(SRC, 'components', 'CustomSelect.jsx'), 'utf8');

  it('takes its trigger from the shared class rather than restating the palette', () => {
    const trigger = openingTag(source, source.indexOf('<button') + '<button'.length);
    expect(trigger).toMatch(/className=\{`\$\{CONTROL_CLASS\}/);
    // Restating the palette is exactly how the trigger ended up text-sm while every
    // native select moved to text-xs, so the surface utilities must not reappear
    // as literals here.
    ['rounded-xl', 'border-slate-300', 'dark:border-slate-700', 'bg-white'].forEach((token) => {
      expect(trigger).not.toContain(token);
    });
  });

  it('keeps the utilities a <button> needs that the shared class does not have', () => {
    const trigger = openingTag(source, source.indexOf('<button') + '<button'.length);
    ['cursor-pointer', 'text-left', 'flex', 'items-center', 'justify-between', 'gap-2'].forEach(
      (token) => {
        expect(trigger).toContain(token);
      },
    );
  });

  it('styles every option row for both themes', () => {
    // The menu container and the trigger already had dark variants; the rows did
    // not, which put a light teal-50 chip on a slate-900 menu. Matched on the whole
    // branch rather than a line, because the hover variant hangs its dark pair off
    // dark:hover: and a line-scoped search reads that as a missing one.
    const branches = source.match(/'[^']*teal-50[^']*'/g) || [];
    expect(branches).toHaveLength(2);
    branches.forEach((branch) => {
      expect(branch).toMatch(/dark:(hover:)?bg-teal-900\//);
      expect(branch).toMatch(/dark:(hover:)?text-teal-1/);
    });
  });

  it('holds the browser-drawn datalist popups at their known count', () => {
    // RegisterPage binds two <input list="..."> autocomplete popups. The popup is
    // drawn by the browser, so it cannot be styled, and plainInputClass is
    // light-only — opting it into color-scheme: dark risks a dark input sitting on
    // a light field. Left alone by decision, and pinned to 2 so that adding a third
    // resurfaces the question instead of quietly inheriting an unexamined state.
    const register = fs.readFileSync(
      path.join(SRC, 'components', 'RegisterPage.js'),
      'utf8',
    );
    expect((register.match(/<datalist\b/g) || []).length).toBe(2);
  });
});