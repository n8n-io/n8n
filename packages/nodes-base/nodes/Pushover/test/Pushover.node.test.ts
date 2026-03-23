/**
 * Regression test for NODE-4606
 * https://linear.app/n8n/issue/NODE-4606
 *
 * Bug: Pushover node has duplicate "timestamp" field in Additional Fields
 * and is missing the "ttl" (Time to Live) parameter.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Pushover Node - NODE-4606 Regression Test', () => {
	const nodeFilePath = path.join(__dirname, '..', 'Pushover.node.ts');
	let nodeFileContent: string;
	let lines: string[];

	beforeAll(() => {
		nodeFileContent = fs.readFileSync(nodeFilePath, 'utf-8');
		lines = nodeFileContent.split('\n');
	});

	describe('Bug 1: Duplicate "timestamp" field in Additional Fields', () => {
		it('should have timestamp field defined only once', () => {
			// Count occurrences of "name: 'timestamp'" within the additionalFields section
			const timestampOccurrences = nodeFileContent.match(/name:\s*'timestamp'/g);

			expect(timestampOccurrences).toBeDefined();

			// This test FAILS: Expected 1, but actual is 2 (duplicate timestamp bug)
			expect(timestampOccurrences?.length).toBe(1);
		});

		it('should NOT have duplicate timestamp at lines 255-261', () => {
			// Lines 255-261 contain the DUPLICATE timestamp definition
			const duplicateSection = lines.slice(254, 261).join('\n');

			// This test FAILS: The duplicate timestamp field exists at this location
			expect(duplicateSection).not.toContain("name: 'timestamp'");
		});

		it('should verify first timestamp is at correct location (lines 240-246)', () => {
			// This test passes - confirming the first timestamp exists
			const firstTimestampSection = lines.slice(239, 246).join('\n');

			expect(firstTimestampSection).toContain("displayName: 'Timestamp'");
			expect(firstTimestampSection).toContain("name: 'timestamp'");
		});
	});

	describe('Bug 2: Missing "ttl" (Time to Live) field', () => {
		it('should include "ttl" field in Additional Fields', () => {
			// Search for ttl field definition in the entire file
			const hasTtlField = nodeFileContent.includes("name: 'ttl'");

			// This test FAILS: ttl field is missing from the node definition
			// According to Pushover API (https://pushover.net/api):
			// ttl - number of seconds to delete the message from the user inbox
			expect(hasTtlField).toBe(true);
		});

		it('should have ttl field in the additionalFields options array', () => {
			// Extract additionalFields options and check for ttl
			const additionalFieldsRegex = /{[\s\S]*?displayName: 'Additional Fields'[\s\S]*?options: \[([\s\S]*?)\][\s\S]*?}/;
			const match = nodeFileContent.match(additionalFieldsRegex);

			expect(match).toBeDefined();

			if (match && match[1]) {
				const optionsContent = match[1];

				// This test FAILS: ttl is not in the options
				expect(optionsContent).toContain("name: 'ttl'");
			}
		});
	});

	describe('Summary: Field count and uniqueness', () => {
		it('should not have any duplicate field names in Additional Fields', () => {
			// Extract all field names from additionalFields
			const additionalFieldsRegex = /{[\s\S]*?displayName: 'Additional Fields'[\s\S]*?options: \[([\s\S]*?)\][\s\S]*?}/;
			const match = nodeFileContent.match(additionalFieldsRegex);

			if (match && match[1]) {
				const optionsContent = match[1];
				const fieldNameMatches = optionsContent.match(/name:\s*'([^']+)'/g);

				expect(fieldNameMatches).toBeDefined();

				if (fieldNameMatches) {
					const fieldNames = fieldNameMatches
						.map((m) => {
							const nameMatch = m.match(/name:\s*'([^']+)'/);
							return nameMatch ? nameMatch[1] : '';
						})
						.filter((name) => name !== ''); // Filter out properties that are nested (like binaryPropertyName)

					const uniqueNames = new Set(fieldNames);

					// This test FAILS: We have more fields than unique names due to duplicate timestamp
					expect(fieldNames.length).toBe(uniqueNames.size);

					// Log duplicates for debugging
					const duplicates = fieldNames.filter(
						(name, index) => fieldNames.indexOf(name) !== index,
					);
					if (duplicates.length > 0) {
						console.log('Duplicate fields found:', duplicates);
					}
				}
			}
		});
	});
});
