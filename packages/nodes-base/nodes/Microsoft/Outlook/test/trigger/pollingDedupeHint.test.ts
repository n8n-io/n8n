import { MicrosoftOutlookTrigger } from '../../MicrosoftOutlookTrigger.node';

const searchHint = new MicrosoftOutlookTrigger().description.builderHint?.searchHint ?? '';

describe('Microsoft Outlook Trigger duplicate-processing hint', () => {
	it('marks an email handled only after its record exists', () => {
		expect(searchHint).toContain('after the record-creating node');
	});

	it('says an unread filter alone excludes nothing', () => {
		expect(searchHint).toContain('An unread filter alone is not enough');
	});
});
