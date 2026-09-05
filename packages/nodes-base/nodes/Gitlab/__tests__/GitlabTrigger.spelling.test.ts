/**
 * Test to verify spelling corrections in GitLab Trigger node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('GitLab Trigger Spelling Corrections', () => {
	it('should have correct spelling in GitLabTrigger comments', () => {
		const filePath = join(__dirname, '..', 'GitlabTrigger.node.ts');
		const fileContent = readFileSync(filePath, 'utf-8');

		// Verify the error comment is properly spelled
		expect(fileContent).toContain('// Some error occurred');
		
		// Ensure old misspelling is not present
		expect(fileContent).not.toContain('// Some error occured');
	});
});