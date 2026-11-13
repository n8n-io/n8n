import { mock } from 'jest-mock-extended';
import type { IDataObject, IPollFunctions } from 'n8n-workflow';

import * as genericFunctions from '../../GenericFunctions';
import { MicrosoftOneDriveTrigger } from '../../MicrosoftOneDriveTrigger.node';

jest.mock('../../GenericFunctions', () => ({
	...jest.requireActual('../../GenericFunctions'),
	microsoftApiRequestAllItemsDelta: jest.fn(async () => ({
		deltaLink: 'https://graph.microsoft.com/v1.0/me/drive/root/delta?token=next',
		returnData: [],
	})),
}));

const deltaRoot = 'https://graph.microsoft.com/v1.0/me/drive/root/delta';

describe('MicrosoftOneDriveTrigger, persisted delta link', () => {
	const pollWithLastLink = async (lastLink?: string) => {
		const staticData: IDataObject = lastLink === undefined ? {} : { LastLink: lastLink };
		const pollFunctions = mock<IPollFunctions>();
		pollFunctions.getWorkflowStaticData.mockReturnValue(staticData);
		pollFunctions.getMode.mockReturnValue('trigger');
		const parameters: Record<string, string> = { event: 'fileCreated', watch: 'anyFile' };
		pollFunctions.getNodeParameter.mockImplementation(
			(name: string, fallback?: string | boolean) => parameters[name] ?? fallback,
		);

		await new MicrosoftOneDriveTrigger().poll.call(pollFunctions);

		return jest.mocked(genericFunctions.microsoftApiRequestAllItemsDelta).mock.calls[0][0];
	};

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should use a persisted delta link of the drive delta feed', async () => {
		const link = `${deltaRoot}?token=abc`;

		expect(await pollWithLastLink(link)).toBe(link);
	});

	it('should start a new delta feed when no link is persisted', async () => {
		expect(await pollWithLastLink()).toBe(`${deltaRoot}?token=latest`);
	});

	it.each([
		'https://example.com/v1.0/me/drive/root/delta?token=abc',
		'http://graph.microsoft.com/v1.0/me/drive/root/delta?token=abc',
		'https://graph.microsoft.com/v1.0/users/someone/drive/root/delta?token=abc',
		'not a url',
	])('should start a new delta feed for the persisted link %s', async (link) => {
		expect(await pollWithLastLink(link)).toBe(`${deltaRoot}?token=latest`);
	});
});
