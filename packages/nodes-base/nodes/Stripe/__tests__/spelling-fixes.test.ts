/**
 * Test to verify spelling corrections in node comments and messages
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Stripe Node Spelling Corrections', () => {
	it('should have correct spelling in StripeTrigger comments', () => {
		const filePath = join(__dirname, '..', 'StripeTrigger.node.ts');
		const fileContent = readFileSync(filePath, 'utf-8');

		// Verify the error comment is properly spelled
		expect(fileContent).toContain('// Some error occurred');
		
		// Ensure old misspelling is not present
		expect(fileContent).not.toContain('// Some error occured');
	});
});