import { parseDocumentUrl } from '../GenericFunctions';

describe('Grist Node', () => {
	describe('parseDocumentUrl', () => {
		it.each([
			['https://docs.getgrist.com/utN3ysvktaDR/Sales', 'utN3ysvktaDR'],
			['https://docs.getgrist.com/utN3ysvktaDR/Sales/p/2', 'utN3ysvktaDR'],
			['https://docs.getgrist.com/utN3ysvktaDR', 'utN3ysvktaDR'],
			[
				'https://acme.getgrist.com/utN3ysvktaDRm1hAUJJ8PH/Sales#a1.s2.r3.c4',
				'utN3ysvktaDRm1hAUJJ8PH',
			],
			['http://localhost:8484/o/docs/utN3ysvktaDR/Sales?embed=true', 'utN3ysvktaDR'],
			['https://grist.example.com/o/averylongorganization/utN3ysvktaDR/Sales', 'utN3ysvktaDR'],
			['https://docs.getgrist.com/doc/team-roster', 'team-roster'],
			['https://grist.example.com/o/acme/doc/team-roster/p/3', 'team-roster'],
			[
				'https://docs.getgrist.com/team-roster~vwGJzKYEfDk2RZUe7wzXee~5/Roster',
				'team-roster~vwGJzKYEfDk2RZUe7wzXee~5',
			],
			[
				'https://docs.getgrist.com/api/docs/utN3ysvktaDRm1hAUJJ8PH/tables',
				'utN3ysvktaDRm1hAUJJ8PH',
			],
		])('should read the document ID from %s', (url, docId) => {
			expect(parseDocumentUrl(url)).toBe(docId);
		});

		it.each([
			'https://docs.getgrist.com/ws/12/',
			'https://docs.getgrist.com/o/averylongorganization/',
			'https://docs.getgrist.com/p/templates',
			'https://docs.getgrist.com/forgot-password',
			'https://docs.getgrist.com/o/acme/site-settings/',
			'https://docs.getgrist.com/doc/',
			'https://docs.getgrist.com/short/Sales',
			'utN3ysvktaDR',
		])('should not read a document ID from %s', (url) => {
			expect(parseDocumentUrl(url)).toBeUndefined();
		});
	});
});
