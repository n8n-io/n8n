/**
 * Test to verify spelling corrections in Keap EmailDescription
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Keap EmailDescription Spelling Corrections', () => {
	it('should have correct spelling in email description fields', () => {
		const filePath = join(__dirname, '..', 'EmailDescription.ts');
		const fileContent = readFileSync(filePath, 'utf-8');

		// Verify the description uses correct spelling
		expect(fileContent).toContain('separated by comma');
		
		// Ensure old misspelling is not present
		expect(fileContent).not.toContain('seperated by comma');
	});
});