export interface Overrides {
	exclude: Record<string, string>;
}

export const defineOverrides = (overrides: Overrides) => overrides;
