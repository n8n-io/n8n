import {
	FORM_THEMES,
	FORM_CSS_VARIABLE_CONTROLS,
	FORM_CSS_VARIABLE_DEFAULTS,
	parseCssVariables,
	assembleFormCss,
	applyFormThemePreset,
	resolveFormTheme,
	validateThemeOverrides,
} from '../src/form-theme';

describe('form-theme', () => {
	describe('parseCssVariables / assembleFormCss', () => {
		it('round-trips an overrides map through a :root block', () => {
			const overrides = {
				'--color-background': '#1a1b1e',
				'--container-width': '360px',
			};
			const css = assembleFormCss(overrides);
			expect(css).toContain(':root {');
			expect(css).toContain('--color-background: #1a1b1e;');
			expect(parseCssVariables(css)).toEqual(overrides);
		});

		it('assembles an empty string for no overrides', () => {
			expect(assembleFormCss({})).toBe('');
		});

		it('parses values with whitespace and multiple entries', () => {
			const parsed = parseCssVariables(':root {\n  --a:  #fff ;\n  --b: 12px;\n}');
			expect(parsed).toEqual({ '--a': '#fff', '--b': '12px' });
		});
	});

	describe('applyFormThemePreset', () => {
		it('returns a copy of a known preset (not the original reference)', () => {
			const dark = FORM_THEMES.find((t) => t.id === 'dark')!;
			const applied = applyFormThemePreset('dark');
			expect(applied).toEqual(dark.overrides);
			expect(applied).not.toBe(dark.overrides);
		});

		it('returns undefined for an unknown preset', () => {
			expect(applyFormThemePreset('nope')).toBeUndefined();
		});
	});

	describe('resolveFormTheme', () => {
		it('identifies the matching preset', () => {
			const dark = FORM_THEMES.find((t) => t.id === 'dark')!;
			expect(resolveFormTheme({ ...dark.overrides })).toBe('dark');
		});

		it('returns "light" for empty overrides', () => {
			expect(resolveFormTheme({})).toBe('light');
		});

		it('returns "custom" when nothing matches exactly', () => {
			expect(resolveFormTheme({ '--color-background': '#123456' })).toBe('custom');
		});
	});

	describe('validateThemeOverrides', () => {
		it('accepts valid values by type', () => {
			const result = validateThemeOverrides({
				'--color-background': '#123456',
				'--container-width': '400px',
				'--opacity-placeholder': '0.4',
				'--font-family': "'Georgia', serif",
			});
			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
			expect(result.overrides['--color-background']).toBe('#123456');
			expect(result.overrides['--container-width']).toBe('400px');
		});

		it('rejects unknown variables', () => {
			const result = validateThemeOverrides({ '--not-a-real-var': '#fff' });
			expect(result.valid).toBe(false);
			expect(result.errors[0]).toMatchObject({
				variable: '--not-a-real-var',
				reason: 'Unknown CSS variable',
			});
			expect(result.overrides).toEqual({});
		});

		it('rejects type-mismatched values', () => {
			const result = validateThemeOverrides({
				'--color-background': 'not-a-color!!',
				'--container-width': 'wide',
				'--opacity-placeholder': '5',
			});
			expect(result.valid).toBe(false);
			expect(result.errors).toHaveLength(3);
			expect(result.overrides).toEqual({});
		});

		it('rejects injection attempts in values', () => {
			const result = validateThemeOverrides({
				'--color-background': 'red; } body { display:none',
				'--font-family': 'url(javascript:alert(1))',
			});
			expect(result.valid).toBe(false);
			expect(result.overrides).toEqual({});
		});

		it('keeps valid entries while dropping invalid ones', () => {
			const result = validateThemeOverrides({
				'--color-background': '#000000',
				'--bogus': 'x',
			});
			expect(result.valid).toBe(false);
			expect(result.overrides).toEqual({ '--color-background': '#000000' });
			expect(result.errors).toHaveLength(1);
		});
	});

	describe('catalog integrity', () => {
		it('every preset override targets a known variable', () => {
			const known = new Set(FORM_CSS_VARIABLE_CONTROLS.map((c) => c.variable));
			for (const theme of FORM_THEMES) {
				for (const variable of Object.keys(theme.overrides)) {
					expect(known.has(variable)).toBe(true);
				}
			}
		});

		it('exposes a default for every control', () => {
			for (const control of FORM_CSS_VARIABLE_CONTROLS) {
				expect(FORM_CSS_VARIABLE_DEFAULTS[control.variable]).toBe(control.default);
			}
		});

		it('every preset override value validates against its control type', () => {
			for (const theme of FORM_THEMES) {
				const result = validateThemeOverrides({ ...theme.overrides });
				expect(result.errors).toEqual([]);
			}
		});
	});
});
