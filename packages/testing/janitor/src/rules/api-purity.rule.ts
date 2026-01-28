import type { Project, SourceFile } from 'ts-morph';

import { BaseRule } from './base-rule.js';
import { getConfig } from '../config.js';
import type { Violation } from '../types.js';
import { truncateText } from '../utils/ast-helpers.js';

/**
 * API Purity Rule
 *
 * Tests and composables should use API service helpers, not raw HTTP calls.
 * This enforces the two-layer API architecture:
 *
 *   Tests/Composables → API Services
 *
 * Why this matters:
 * - Builds a reusable, typed API interface over time
 * - New devs can discover available endpoints via --list-services
 * - Consistent error handling and response parsing
 * - Easy to mock in tests
 *
 * Violations:
 * - request.get(), request.post(), etc. in tests/composables
 * - fetch() calls in tests/composables
 * - Direct HTTP method calls that bypass services
 *
 * Exceptions:
 * - API service files themselves (services/**) can make raw calls
 * - Fixture setup files can make raw calls
 */
export class ApiPurityRule extends BaseRule {
	readonly id = 'api-purity';
	readonly name = 'API Purity';
	readonly description = 'Tests and composables should use API services, not raw HTTP calls';
	readonly severity = 'error' as const;

	getTargetGlobs(): string[] {
		const config = getConfig();
		return [...config.patterns.tests, ...config.patterns.flows];
	}

	analyze(_project: Project, files: SourceFile[]): Violation[] {
		const violations: Violation[] = [];
		const config = getConfig();

		for (const file of files) {
			const content = file.getText();

			// Check each raw API pattern
			for (const pattern of config.rawApiPatterns) {
				// Reset regex state for global patterns
				const regex = new RegExp(
					pattern.source,
					pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g',
				);

				let match;
				while ((match = regex.exec(content)) !== null) {
					// Get some context around the match for allowPattern checking
					const contextStart = Math.max(0, match.index - 50);
					const contextEnd = Math.min(content.length, match.index + match[0].length + 50);
					const context = content.substring(contextStart, contextEnd);

					// Check if this matches any allow patterns
					if (this.isAllowed(context)) {
						continue;
					}

					// Find the line number for this match
					const beforeMatch = content.substring(0, match.index);
					const line = beforeMatch.split('\n').length;
					const lastNewline = beforeMatch.lastIndexOf('\n');
					const column = match.index - lastNewline;

					// Get context around the match for the message
					const matchText = match[0];
					const suggestion = this.getSuggestion(matchText);

					violations.push(
						this.createViolation(
							file,
							line,
							column,
							`Raw API call detected: ${truncateText(matchText, 40)}`,
							suggestion,
						),
					);
				}
			}
		}

		return violations;
	}

	/**
	 * Get appropriate suggestion based on the API call pattern
	 */
	private getSuggestion(matchText: string): string {
		const config = getConfig();
		const apiName = config.apiFixtureName;

		if (matchText.includes('request.get')) {
			return `Use an API service method: this.${apiName}.workflows.get(), this.${apiName}.credentials.list(), etc.`;
		}
		if (matchText.includes('request.post')) {
			return `Use an API service method: this.${apiName}.workflows.create(), this.${apiName}.credentials.create(), etc.`;
		}
		if (matchText.includes('request.put') || matchText.includes('request.patch')) {
			return `Use an API service method: this.${apiName}.workflows.update(), etc.`;
		}
		if (matchText.includes('request.delete')) {
			return `Use an API service method: this.${apiName}.workflows.delete(), etc.`;
		}
		if (matchText.includes('fetch')) {
			return 'Use an API service instead of fetch(). Add the endpoint to the appropriate service class.';
		}
		return `Add this endpoint to an API service class and use it via this.${apiName}.*`;
	}
}
