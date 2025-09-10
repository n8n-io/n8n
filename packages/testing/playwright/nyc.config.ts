const config = {
	reporter: ['html', 'lcov', 'json'],
	reportDir: 'coverage',
	tempDir: '.nyc_output',
	include: [
		// Frontend coverage (relative to root when nyc runs from root)
		'packages/frontend/editor-ui/src/**/*.{js,ts,vue}',
		'packages/frontend/editor-ui/dist/**/*.{js,ts}',
		// Backend coverage (relative to root when nyc runs from root)
		'packages/cli/src/**/*.ts',
		'packages/cli/dist/**/*.js',
		'packages/core/src/**/*.ts',
		'packages/core/dist/**/*.js',
		'packages/workflow/src/**/*.ts',
		'packages/workflow/dist/**/*.js',
	],
	exclude: [
		'**/*.test.{js,ts}',
		'**/*.spec.{js,ts}',
		'**/node_modules/**',
		'**/coverage/**',
		'**/.nyc_output/**',
		'**/test/**',
		'**/tests/**',
		'**/__tests__/**',
		'**/*.test-data.{js,ts}',
		'**/*.mock.{js,ts}',
		'**/*.d.ts',
		// Note: Don't exclude all dist/ - we need CLI/core/workflow dist files for runtime coverage
		'**/frontend/editor-ui/dist/**', // Exclude frontend dist (we get this from Vite coverage)
		'**/build/**',
	],
	sourceMap: true,
	instrument: true,
	all: true,
	// Ensure source files are mapped properly
	'source-map': true,
	// Include TypeScript source files in the report
	extension: ['.js', '.ts'],
};

export = config;
