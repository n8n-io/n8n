import { GmailTrigger } from '../GmailTrigger.node';

const searchHint = new GmailTrigger().description.builderHint?.searchHint ?? '';

describe('Gmail Trigger duplicate-processing hint', () => {
	it('marks an email handled only after its record exists', () => {
		expect(searchHint).toContain('after the record-creating node');
	});

	it('says an unread filter alone excludes nothing', () => {
		expect(searchHint).toContain('An unread filter alone is not enough');
	});

	it('says a label only works when the trigger query excludes it', () => {
		expect(searchHint).toContain("only if the trigger's search query excludes that label");
	});
});
