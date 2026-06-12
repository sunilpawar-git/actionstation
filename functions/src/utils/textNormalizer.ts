/**
 * Text Normalizer — Unicode normalization for pattern-match security.
 *
 * Applies a 3-step pipeline to close homoglyph injection bypass attacks:
 *   1. NFKD decomposition  — decomposes ligatures (ﬁ→fi), superscripts (²→2),
 *                            fullwidth chars (Ａ→A) into canonical form.
 *   2. Combining char strip — removes diacritical combining marks that survive
 *                            NFKD (e.g. combining acute U+0301 over 'i').
 *   3. Confusables map      — maps Cyrillic/Greek codepoints that are visually
 *                            identical to ASCII letters but are distinct Unicode
 *                            codepoints that NFKD leaves untouched.
 *
 * SECURITY NOTE: Always count string length on the ORIGINAL text before calling
 * normalizeForPatternMatch. Normalizing before length check allows an attacker
 * to pad input with multi-byte confusables to bypass length limits.
 *
 * Usage:
 *   const normalized = normalizeForPatternMatch(originalText);
 *   for (const pattern of INJECTION_PATTERNS) {
 *     if (pattern.test(normalized)) { ... }
 *   }
 */

// ─── Combining character regex ────────────────────────────────────────────

/**
 * Matches all Unicode Non-spacing Marks (combining diacritical marks).
 * Using \p{Mn} with the u flag is more complete and correct than manual ranges,
 * and avoids the no-misleading-character-class ESLint rule.
 */
const COMBINING_CHARS_RE = /\p{Mn}/gu;

// ─── Confusables map ──────────────────────────────────────────────────────

/**
 * Maps visually confusable Unicode codepoints to their ASCII equivalents.
 *
 * Only includes characters that are VISUAL homoglyphs (look identical or
 * near-identical to the ASCII target), not phonetic equivalents.
 *
 * Sources: Unicode Consortium confusables.txt (restricted to security-relevant
 * Cyrillic and Greek blocks that appear in real injection bypass attempts).
 */
const CONFUSABLES_MAP = {
    // ── Cyrillic lowercase → ASCII lowercase ──────────────────────────────
    // Block: U+0400–U+04FF (Cyrillic)
    '\u0430': 'a', // а CYRILLIC SMALL LETTER A
    '\u0431': 'b', // б CYRILLIC SMALL LETTER BE (partial match — included for completeness)
    '\u0435': 'e', // е CYRILLIC SMALL LETTER IE
    '\u043E': 'o', // о CYRILLIC SMALL LETTER O
    '\u0440': 'p', // р CYRILLIC SMALL LETTER ER
    '\u0441': 'c', // с CYRILLIC SMALL LETTER ES
    '\u0443': 'y', // у CYRILLIC SMALL LETTER U
    '\u0445': 'x', // х CYRILLIC SMALL LETTER HA

    // ── Cyrillic uppercase → ASCII uppercase ──────────────────────────────
    '\u0410': 'A', // А CYRILLIC CAPITAL LETTER A
    '\u0412': 'B', // В CYRILLIC CAPITAL LETTER VE
    '\u0415': 'E', // Е CYRILLIC CAPITAL LETTER IE
    '\u041A': 'K', // К CYRILLIC CAPITAL LETTER KA
    '\u041C': 'M', // М CYRILLIC CAPITAL LETTER EM
    '\u041D': 'H', // Н CYRILLIC CAPITAL LETTER EN
    '\u041E': 'O', // О CYRILLIC CAPITAL LETTER O
    '\u0420': 'P', // Р CYRILLIC CAPITAL LETTER ER
    '\u0421': 'C', // С CYRILLIC CAPITAL LETTER ES
    '\u0422': 'T', // Т CYRILLIC CAPITAL LETTER TE
    '\u0425': 'X', // Х CYRILLIC CAPITAL LETTER HA

    // ── Greek lowercase → ASCII lowercase ────────────────────────────────
    // Block: U+0370–U+03FF (Greek and Coptic)
    '\u03B1': 'a', // α GREEK SMALL LETTER ALPHA
    '\u03B2': 'b', // β GREEK SMALL LETTER BETA
    '\u03B5': 'e', // ε GREEK SMALL LETTER EPSILON
    '\u03B7': 'n', // η GREEK SMALL LETTER ETA (looks like n)
    '\u03B9': 'i', // ι GREEK SMALL LETTER IOTA
    '\u03BF': 'o', // ο GREEK SMALL LETTER OMICRON
    '\u03C1': 'p', // ρ GREEK SMALL LETTER RHO
    '\u03C5': 'u', // υ GREEK SMALL LETTER UPSILON
    '\u03C7': 'x', // χ GREEK SMALL LETTER CHI

    // ── Greek uppercase → ASCII uppercase ────────────────────────────────
    '\u0391': 'A', // Α GREEK CAPITAL LETTER ALPHA
    '\u0392': 'B', // Β GREEK CAPITAL LETTER BETA
    '\u0395': 'E', // Ε GREEK CAPITAL LETTER EPSILON
    '\u0397': 'H', // Η GREEK CAPITAL LETTER ETA
    '\u0399': 'I', // Ι GREEK CAPITAL LETTER IOTA
    '\u039A': 'K', // Κ GREEK CAPITAL LETTER KAPPA
    '\u039C': 'M', // Μ GREEK CAPITAL LETTER MU
    '\u039D': 'N', // Ν GREEK CAPITAL LETTER NU
    '\u039F': 'O', // Ο GREEK CAPITAL LETTER OMICRON
    '\u03A1': 'P', // Ρ GREEK CAPITAL LETTER RHO
    '\u03A4': 'T', // Τ GREEK CAPITAL LETTER TAU
    '\u03A5': 'Y', // Υ GREEK CAPITAL LETTER UPSILON
    '\u03A7': 'X', // Χ GREEK CAPITAL LETTER CHI
} as const;

/** Pre-built lookup for O(1) per-character replacement */
const CONFUSABLES_LOOKUP = CONFUSABLES_MAP as Record<string, string>;

// ─── Private helpers ────────────────────────────────────────────────────

function applyConfusablesMap(text: string): string {
    return Array.from(text)
        .map(ch => CONFUSABLES_LOOKUP[ch] ?? ch)
        .join('');
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Normalize text for security pattern matching.
 *
 * Applies the 3-step pipeline: NFKD → strip combining chars → confusables map.
 *
 * IMPORTANT: call this AFTER length checks on the original text.
 */
export function normalizeForPatternMatch(text: string): string {
    return applyConfusablesMap(
        text
            .normalize('NFKD')
            .replace(COMBINING_CHARS_RE, ''),
    );
}
