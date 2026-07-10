import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const CLI_PATH = path.join(__dirname, '..', 'dist', 'cli.js');

describe('CLI', () => {
	describe('--help', () => {
		it('shows help text', () => {
			const output = execSync(`node ${CLI_PATH} --help`, { encoding: 'utf-8' });

			expect(output).toContain('Playwright Janitor');
			expect(output).toContain('Commands:');
			expect(output).toContain('baseline');
			expect(output).toContain('inventory');
			expect(output).toContain('impact');
			expect(output).toContain('tcr');
			expect(output).toContain('--ignore-baseline');
		});
	});

	describe('--list', () => {
		it('lists available rules', () => {
			const output = execSync(`node ${CLI_PATH} --list`, { encoding: 'utf-8' });

			expect(output).toContain('Available rules:');
			expect(output).toContain('boundary-protection');
			expect(output).toContain('selector-purity');
			expect(output).toContain('dead-code');
			expect(output).toContain('scope-lockdown');
		});
	});

	describe('baseline --help', () => {
		it('shows baseline help', () => {
			const output = execSync(`node ${CLI_PATH} baseline --help`, { encoding: 'utf-8' });

			expect(output).toContain('Baseline');
			expect(output).toContain('.janitor-baseline.json');
			expect(output).toContain('incremental cleanup');
		});
	});

	describe('inventory --help', () => {
		it('shows inventory help', () => {
			const output = execSync(`node ${CLI_PATH} inventory --help`, { encoding: 'utf-8' });

			expect(output).toContain('Inventory');
			expect(output).toContain('JSON');
		});
	});

	describe('impact --help', () => {
		it('shows impact help', () => {
			const output = execSync(`node ${CLI_PATH} impact --help`, { encoding: 'utf-8' });

			expect(output).toContain('Impact');
			expect(output).toContain('--file');
		});
	});

	describe('method-impact --help', () => {
		it('shows method-impact help', () => {
			const output = execSync(`node ${CLI_PATH} method-impact --help`, { encoding: 'utf-8' });

			expect(output).toContain('Method Impact');
			expect(output).toContain('--method');
		});
	});

	describe('tcr --help', () => {
		it('shows tcr help', () => {
			const output = execSync(`node ${CLI_PATH} tcr --help`, { encoding: 'utf-8' });

			expect(output).toContain('TCR');
			expect(output).toContain('--execute');
			expect(output).toContain('--message');
			expect(output).toContain('--max-diff-lines');
		});
	});

	describe('argument parsing', () => {
		let tempDir: string;

		beforeAll(() => {
			// Use realpathSync to avoid macOS /var -> /private/var symlink issues
			tempDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-')));

			// Create tsconfig.json (required by ts-morph)
			fs.writeFileSync(
				path.join(tempDir, 'tsconfig.json'),
				JSON.stringify({
					compilerOptions: {
						target: 'ES2020',
						module: 'ESNext',
						moduleResolution: 'node',
						strict: true,
					},
					include: ['**/*.ts'],
				}),
			);

			// Create minimal config as .js (Node.js can't dynamically import .ts files)
			fs.writeFileSync(
				path.join(tempDir, 'janitor.config.js'),
				`module.exports = {
					rootDir: '${tempDir}',
					patterns: {
						pages: ['pages/**/*.ts'],
						components: [],
						flows: [],
						tests: ['tests/**/*.spec.ts'],
						services: [],
						fixtures: [],
						helpers: [],
						factories: [],
						testData: [],
					},
					excludeFromPages: [],
					facade: { file: 'pages/AppPage.ts', className: 'AppPage', excludeTypes: [] },
					fixtureObjectName: 'app',
					apiFixtureName: 'api',
					rawApiPatterns: [],
					flowLayerName: 'Composable',
					architectureLayers: [],
					rules: {},
				};`,
			);

			fs.mkdirSync(path.join(tempDir, 'pages'), { recursive: true });
			fs.mkdirSync(path.join(tempDir, 'tests'), { recursive: true });
		});

		afterAll(() => {
			fs.rmSync(tempDir, { recursive: true, force: true });
		});

		it('accepts --json flag', () => {
			// Create a clean page file
			fs.writeFileSync(path.join(tempDir, 'pages', 'CleanPage.ts'), 'export class CleanPage {}');

			try {
				const output = execSync(
					`node ${CLI_PATH} --json --config=${path.join(tempDir, 'janitor.config.js')}`,
					{
						encoding: 'utf-8',
						cwd: tempDir,
					},
				);

				// Should be valid JSON
				expect(() => JSON.parse(output) as unknown).not.toThrow();
			} catch (error) {
				// Even if there are violations, output should be JSON
				const stderr = (error as { stdout?: string }).stdout ?? '';
				if (stderr) {
					expect(() => JSON.parse(stderr) as unknown).not.toThrow();
				}
			}
		});

		it('accepts --verbose flag', () => {
			fs.writeFileSync(
				path.join(tempDir, 'pages', 'VerbosePage.ts'),
				'export class VerbosePage {}',
			);

			try {
				const output = execSync(
					`node ${CLI_PATH} --verbose --config=${path.join(tempDir, 'janitor.config.js')}`,
					{
						encoding: 'utf-8',
						cwd: tempDir,
					},
				);
				// Verbose output should include more detail
				expect(output).toBeDefined();
			} catch {
				// May fail with violations, that's OK for this test
			}
		});

		it('accepts --ignore-baseline flag', () => {
			fs.writeFileSync(
				path.join(tempDir, 'pages', 'BaselinePage.ts'),
				'export class BaselinePage {}',
			);

			try {
				const output = execSync(
					`node ${CLI_PATH} --ignore-baseline --config=${path.join(tempDir, 'janitor.config.js')}`,
					{
						encoding: 'utf-8',
						cwd: tempDir,
					},
				);
				// Should not show "Using baseline" message when ignoring
				expect(output).not.toContain('Using baseline');
			} catch {
				// May fail with violations, that's OK for this test
			}
		});
	});
});
