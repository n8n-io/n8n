import { sanitizeCustomCss } from './form-utils';

/**
 * Shared form appearance/theming model.
 *
 * This is the single source of truth for the form-trigger CSS-variable surface:
 * the editable variable catalog, the built-in theme presets, and the pure
 * helpers that turn CSS-variable overrides into a `customCss` string and back.
 *
 * It lives in `n8n-workflow` (next to `form-utils.ts`) so every surface can
 * consume it without duplicating the catalog: the editor-ui appearance editor,
 * the Instance AI forms tool, and — later — the MCP server. Keep this module
 * dependency-free (no i18n, no Vue); UI concerns like translation keys stay in
 * the frontend and map onto `variable`.
 */

export type FormCssVarType = 'color' | 'px' | 'text' | 'opacity';
export type FormCssVarGroup = 'page' | 'form' | 'input' | 'button';

export interface FormCssVarControl {
	/** The CSS custom property name, e.g. `--color-background`. */
	variable: string;
	/** Value kind — drives editor widgets and value validation. */
	type: FormCssVarType;
	/** Which section of the form the variable affects. */
	group: FormCssVarGroup;
	/** Default value used when the variable is not overridden. */
	default: string;
	/** Plain-English description — context for the UI and for LLM theme generation. */
	description: string;
}

export const FORM_CSS_VARIABLE_GROUPS: Array<{ key: FormCssVarGroup; description: string }> = [
	{ key: 'page', description: 'The page around the form (background, width, font)' },
	{ key: 'form', description: 'The form card (header, borders, spacing)' },
	{ key: 'input', description: 'Input fields and labels' },
	{ key: 'button', description: 'Submit button and links' },
];

export const FORM_CSS_VARIABLE_CONTROLS: FormCssVarControl[] = [
	// ── Page ─────────────────────────────────────────────────────────────────
	{
		variable: '--font-family',
		type: 'text',
		group: 'page',
		default: "'Open Sans', sans-serif",
		description: 'Font family for the whole form',
	},
	{
		variable: '--color-background',
		type: 'color',
		group: 'page',
		default: '#fbfcfe',
		description: 'Page background color behind the form card',
	},
	{
		variable: '--container-width',
		type: 'px',
		group: 'page',
		default: '448px',
		description: 'Maximum width of the form container',
	},
	{
		variable: '--padding-container-top',
		type: 'px',
		group: 'page',
		default: '24px',
		description: 'Space above the form card',
	},

	// ── Form card ─────────────────────────────────────────────────────────────
	{
		variable: '--color-card-bg',
		type: 'color',
		group: 'form',
		default: '#ffffff',
		description: 'Form card background color',
	},
	{
		variable: '--color-card-border',
		type: 'color',
		group: 'form',
		default: '#dbdfe7',
		description: 'Form card border color',
	},
	{
		variable: '--color-header',
		type: 'color',
		group: 'form',
		default: '#525356',
		description: 'Form title (header) text color',
	},
	{
		variable: '--color-header-subtext',
		type: 'color',
		group: 'form',
		default: '#7e8186',
		description: 'Form description (subheader) text color',
	},
	{
		variable: '--font-size-header',
		type: 'px',
		group: 'form',
		default: '20px',
		description: 'Form title font size',
	},
	{
		variable: '--font-size-subheader',
		type: 'px',
		group: 'form',
		default: '14px',
		description: 'Form description font size',
	},
	{
		variable: '--border-radius-card',
		type: 'px',
		group: 'form',
		default: '8px',
		description: 'Corner rounding of the form card',
	},
	{
		variable: '--padding-card',
		type: 'px',
		group: 'form',
		default: '24px',
		description: 'Inner padding of the form card',
	},
	{
		variable: '--margin-bottom-card',
		type: 'px',
		group: 'form',
		default: '16px',
		description: 'Space below the form card',
	},

	// ── Input fields ──────────────────────────────────────────────────────────
	{
		variable: '--color-input-bg',
		type: 'color',
		group: 'input',
		default: '#ffffff',
		description: 'Input field background color',
	},
	{
		variable: '--color-label',
		type: 'color',
		group: 'input',
		default: '#555555',
		description: 'Field label text color',
	},
	{
		variable: '--color-input-border',
		type: 'color',
		group: 'input',
		default: '#dbdfe7',
		description: 'Input field border color',
	},
	{
		variable: '--color-input-text',
		type: 'color',
		group: 'input',
		default: '#71747a',
		description: 'Text color inside input fields',
	},
	{
		variable: '--color-focus-border',
		type: 'color',
		group: 'input',
		default: '#5a4cc2',
		description: 'Input border color when focused (accent)',
	},
	{
		variable: '--color-error',
		type: 'color',
		group: 'input',
		default: '#ea1f30',
		description: 'Validation error color',
	},
	{
		variable: '--color-required',
		type: 'color',
		group: 'input',
		default: '#ff6d5a',
		description: 'Required-field asterisk color',
	},
	{
		variable: '--font-size-label',
		type: 'px',
		group: 'input',
		default: '14px',
		description: 'Field label font size',
	},
	{
		variable: '--font-size-input',
		type: 'px',
		group: 'input',
		default: '14px',
		description: 'Input text font size',
	},
	{
		variable: '--border-radius-input',
		type: 'px',
		group: 'input',
		default: '6px',
		description: 'Corner rounding of input fields',
	},
	{
		variable: '--padding-form-input',
		type: 'px',
		group: 'input',
		default: '12px',
		description: 'Inner padding of input fields',
	},
	{
		variable: '--font-size-body',
		type: 'px',
		group: 'input',
		default: '12px',
		description: 'Body text font size',
	},
	{
		variable: '--font-size-paragraph',
		type: 'px',
		group: 'input',
		default: '14px',
		description: 'Paragraph text font size',
	},
	{
		variable: '--font-size-error',
		type: 'px',
		group: 'input',
		default: '12px',
		description: 'Validation error font size',
	},
	{
		variable: '--opacity-placeholder',
		type: 'opacity',
		group: 'input',
		default: '0.5',
		description: 'Placeholder text opacity (0-1)',
	},

	// ── Button & links ────────────────────────────────────────────────────────
	{
		variable: '--color-submit-btn-bg',
		type: 'color',
		group: 'button',
		default: '#ff6d5a',
		description: 'Submit button background color (primary accent)',
	},
	{
		variable: '--color-submit-btn-text',
		type: 'color',
		group: 'button',
		default: '#ffffff',
		description: 'Submit button text color',
	},
	{
		variable: '--color-link',
		type: 'color',
		group: 'button',
		default: '#7e8186',
		description: 'Link text color',
	},
	{
		variable: '--submit-btn-height',
		type: 'px',
		group: 'button',
		default: '48px',
		description: 'Submit button height',
	},
	{
		variable: '--font-size-submit-btn',
		type: 'px',
		group: 'button',
		default: '14px',
		description: 'Submit button font size',
	},
	{
		variable: '--font-size-link',
		type: 'px',
		group: 'button',
		default: '12px',
		description: 'Link font size',
	},
];

export const FORM_CSS_VARIABLE_DEFAULTS: Record<string, string> = Object.fromEntries(
	FORM_CSS_VARIABLE_CONTROLS.map((c) => [c.variable, c.default]),
);

const CONTROLS_BY_VARIABLE: Record<string, FormCssVarControl> = Object.fromEntries(
	FORM_CSS_VARIABLE_CONTROLS.map((c) => [c.variable, c]),
);

// ---------------------------------------------------------------------------
// Theme presets
// ---------------------------------------------------------------------------

export interface FormTheme {
	id: string;
	/** Partial map of CSS variable → value; unset variables fall back to defaults. */
	overrides: Record<string, string>;
}

const DARK_OVERRIDES: Record<string, string> = {
	'--color-background': '#1a1b1e',
	'--color-card-bg': '#2c2d31',
	'--color-card-border': '#3e4045',
	'--color-header': '#e4e5e7',
	'--color-header-subtext': '#9b9da3',
	'--color-label': '#c8c9cb',
	'--color-input-bg': '#232428',
	'--color-input-border': '#4a4b50',
	'--color-input-text': '#b0b2b7',
	'--color-focus-border': '#7c6ce0',
	'--color-link': '#9b9da3',
};

const COMPACT_OVERRIDES: Record<string, string> = {
	'--container-width': '360px',
	'--padding-container-top': '16px',
	'--padding-card': '16px',
	'--padding-form-input': '8px',
	'--margin-bottom-card': '8px',
	'--submit-btn-height': '40px',
	'--font-size-header': '17px',
	'--font-size-label': '12px',
	'--font-size-input': '12px',
	'--border-radius-card': '6px',
	'--border-radius-input': '4px',
};

export const FORM_THEMES: FormTheme[] = [
	// ── Light family ──────────────────────────────────────────────────────────
	{ id: 'light', overrides: {} },
	{ id: 'dark', overrides: DARK_OVERRIDES },

	// ── Density variants ──────────────────────────────────────────────────────
	{
		id: 'dense',
		overrides: {
			'--padding-container-top': '12px',
			'--padding-card': '16px',
			'--margin-bottom-card': '8px',
			'--padding-form-input': '8px',
			'--submit-btn-height': '36px',
			'--font-size-header': '17px',
			'--font-size-subheader': '12px',
		},
	},
	{ id: 'compact', overrides: COMPACT_OVERRIDES },
	{ id: 'compactDark', overrides: { ...COMPACT_OVERRIDES, ...DARK_OVERRIDES } },

	// ── Enterprise family ─────────────────────────────────────────────────────
	{
		id: 'enterprise',
		overrides: {
			'--font-family': "'Helvetica Neue', Helvetica, Arial, sans-serif",
			'--color-background': '#f5f6f8',
			'--color-card-border': '#cfd5dc',
			'--color-header': '#1c2b3a',
			'--color-header-subtext': '#4a5a6a',
			'--color-submit-btn-bg': '#0055b3',
			'--color-focus-border': '#0055b3',
			'--color-required': '#cc0000',
			'--border-radius-card': '2px',
			'--border-radius-input': '2px',
		},
	},
	{
		id: 'enterpriseDark',
		overrides: {
			'--font-family': "'Helvetica Neue', Helvetica, Arial, sans-serif",
			'--color-background': '#12192b',
			'--color-card-bg': '#1c2540',
			'--color-card-border': '#2a3560',
			'--color-header': '#dde3f0',
			'--color-header-subtext': '#7a88a8',
			'--color-label': '#8898b8',
			'--color-input-bg': '#161e36',
			'--color-input-border': '#2a3560',
			'--color-input-text': '#a8b8d8',
			'--color-focus-border': '#0077cc',
			'--color-link': '#4488cc',
			'--color-submit-btn-bg': '#0055b3',
			'--color-required': '#cc2222',
			'--border-radius-card': '2px',
			'--border-radius-input': '2px',
		},
	},

	// ── Fun family ────────────────────────────────────────────────────────────
	{
		id: 'fun',
		overrides: {
			'--font-family': "'Georgia', serif",
			'--color-background': '#fef0fb',
			'--color-card-bg': '#fff8fe',
			'--color-card-border': '#f0a8e8',
			'--color-header': '#9b1fa8',
			'--color-header-subtext': '#c060c8',
			'--color-label': '#6a2070',
			'--color-submit-btn-bg': '#e040d0',
			'--color-focus-border': '#e040d0',
			'--color-required': '#e040d0',
			'--border-radius-card': '20px',
			'--border-radius-input': '16px',
		},
	},
	{
		id: 'funColorful',
		overrides: {
			'--font-family': "'Georgia', serif",
			'--color-background': '#e8fff0',
			'--color-card-bg': '#f8fffc',
			'--color-card-border': '#40d890',
			'--color-header': '#ff3838',
			'--color-header-subtext': '#ff8c20',
			'--color-label': '#1a88d0',
			'--color-input-bg': '#ffffff',
			'--color-input-border': '#40d890',
			'--color-focus-border': '#30c8a8',
			'--color-submit-btn-bg': '#ff5520',
			'--color-required': '#ff2060',
			'--border-radius-card': '24px',
			'--border-radius-input': '16px',
		},
	},
];

const THEMES_BY_ID: Record<string, FormTheme> = Object.fromEntries(
	FORM_THEMES.map((t) => [t.id, t]),
);

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Parse a `:root { --x: y; }` CSS string into a `{ '--x': 'y' }` overrides map. */
export function parseCssVariables(css: string): Record<string, string> {
	const result: Record<string, string> = {};
	for (const match of css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
		result[`--${match[1]}`] = match[2].trim();
	}
	return result;
}

/** Assemble a CSS-variable overrides map into a `:root { … }` string (empty if none). */
export function assembleFormCss(overrides: Record<string, string>): string {
	const entries = Object.entries(overrides);
	if (entries.length === 0) return '';
	const lines = entries.map(([k, v]) => `\t${k}: ${v};`).join('\n');
	return `:root {\n${lines}\n}`;
}

/** Return a copy of a preset's overrides, or `undefined` if the id is unknown. */
export function applyFormThemePreset(themeId: string): Record<string, string> | undefined {
	const theme = THEMES_BY_ID[themeId];
	return theme ? { ...theme.overrides } : undefined;
}

/**
 * Identify which preset an overrides map corresponds to, or `'custom'` when it
 * matches none exactly. Mirrors the editor's `activeTheme` computation.
 */
export function resolveFormTheme(overrides: Record<string, string>): string {
	const overrideKeys = Object.keys(overrides);
	for (const theme of FORM_THEMES) {
		const themeKeys = Object.keys(theme.overrides);
		if (themeKeys.length !== overrideKeys.length) continue;
		if (themeKeys.every((k) => theme.overrides[k] === overrides[k])) return theme.id;
	}
	return 'custom';
}

// ---------------------------------------------------------------------------
// Validation (used before applying LLM-generated / user-supplied themes)
// ---------------------------------------------------------------------------

export interface ThemeOverrideError {
	variable: string;
	value: string;
	reason: string;
}

export interface ValidateThemeResult {
	valid: boolean;
	/** Overrides that passed validation, ready to assemble/save. */
	overrides: Record<string, string>;
	/** Rejected entries with a human-readable reason (surfaced back to the model). */
	errors: ThemeOverrideError[];
}

// Values are single CSS declaration values, so no structural CSS or injection
// vectors are ever allowed regardless of the declared type.
const FORBIDDEN_VALUE = /[;{}<>]|url\(|expression\(|@import|javascript:/i;
const COLOR_RE =
	/^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|rgba?\([^)]*\)|hsla?\([^)]*\)|[a-z]+)$/i;
const LENGTH_RE = /^-?\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|vmin|vmax)?$/;

function isValidValue(type: FormCssVarType, value: string): boolean {
	if (FORBIDDEN_VALUE.test(value)) return false;
	switch (type) {
		case 'color':
			return COLOR_RE.test(value);
		case 'px':
			return LENGTH_RE.test(value);
		case 'opacity': {
			const n = Number(value);
			return Number.isFinite(n) && n >= 0 && n <= 1;
		}
		case 'text':
			return value.length > 0 && value.length <= 200;
	}
}

/**
 * Validate a set of theme overrides against the known variable catalog. Unknown
 * variables and type-invalid values are rejected (dropped from `overrides` and
 * reported in `errors`) so a caller — e.g. the LLM composing a theme — can
 * self-correct instead of writing junk to the node. Surviving values are run
 * through `sanitizeCustomCss` as a final guard.
 */
export function validateThemeOverrides(overrides: Record<string, string>): ValidateThemeResult {
	const clean: Record<string, string> = {};
	const errors: ThemeOverrideError[] = [];

	for (const [variable, rawValue] of Object.entries(overrides)) {
		const value = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue);
		const control = CONTROLS_BY_VARIABLE[variable];
		if (!control) {
			errors.push({ variable, value, reason: 'Unknown CSS variable' });
			continue;
		}
		if (!isValidValue(control.type, value)) {
			errors.push({
				variable,
				value,
				reason: `Invalid value for ${control.type} variable`,
			});
			continue;
		}
		clean[variable] = value;
	}

	// Final structural guard: sanitize the assembled CSS and re-parse. If nothing
	// survived, `sanitizeCustomCss` returns undefined → treat as empty.
	const sanitized = sanitizeCustomCss(assembleFormCss(clean));
	const finalOverrides = sanitized ? parseCssVariables(sanitized) : {};

	return { valid: errors.length === 0, overrides: finalOverrides, errors };
}
