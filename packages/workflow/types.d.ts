declare module 'riot-tmpl' {
	export const brackets: {
		/**
		 * Set expression brackets other than the default `{ ... }`
		 */
		set: (brackets: string) => void;
	};

	export const tmpl: {
		/**
		 * Evaluate a `tmpl` expression.
		 */
		(expression: string, data?: object): unknown;

		/**
		 * Handle an error from evaluating a `tmpl` expression.
		 */
		errorHandler: () => void;
	};
}
