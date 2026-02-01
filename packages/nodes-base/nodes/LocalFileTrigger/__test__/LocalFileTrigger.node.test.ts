import chokidar from 'chokidar';
import type { ITriggerFunctions } from 'n8n-workflow';

import { LocalFileTrigger } from '../LocalFileTrigger.node';

jest.mock('chokidar');

const mockWatcher = {
	on: jest.fn(),
	close: jest.fn().mockResolvedValue(undefined),
};

(chokidar.watch as unknown as jest.Mock).mockReturnValue(mockWatcher);

describe('LocalFileTrigger', () => {
	let node: LocalFileTrigger;
	let emitSpy: jest.Mock;
	let context: ITriggerFunctions;

	beforeEach(() => {
		node = new LocalFileTrigger();
		emitSpy = jest.fn();

		context = {
			getNodeParameter: jest.fn(),
			emit: emitSpy,
			helpers: {
				returnJsonArray: (data: unknown[]) => data,
			},
		} as unknown as ITriggerFunctions;

		jest.clearAllMocks();
	});

	it('should set up chokidar with correct options for folder + match ignore', async () => {
		(context.getNodeParameter as jest.Mock)
			.mockReturnValueOnce('folder')
			.mockReturnValueOnce('/some/folder')
			.mockReturnValueOnce({
				ignored: '**/*.txt',
				ignoreMode: 'match',
				ignoreInitial: true,
				followSymlinks: true,
				depth: 1,
				usePolling: false,
				awaitWriteFinish: false,
			})
			.mockReturnValueOnce(['add']);

		await node.trigger.call(context);

		expect(chokidar.watch).toHaveBeenCalledWith(
			'/some/folder',
			expect.objectContaining({
				ignored: '**/*.txt',
				ignoreInitial: true,
				depth: 1,
				followSymlinks: true,
				usePolling: false,
				awaitWriteFinish: false,
			}),
		);

		expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function));
	});

	it('should wrap ignored in function for ignoreMode=contain', async () => {
		(context.getNodeParameter as jest.Mock)
			.mockReturnValueOnce('folder')
			.mockReturnValueOnce('/folder')
			.mockReturnValueOnce({
				ignored: 'node_modules',
				ignoreMode: 'contain',
			})
			.mockReturnValueOnce(['change']);

		await node.trigger.call(context);

		const call = (chokidar.watch as jest.Mock).mock.calls[0][1];
		expect(typeof call.ignored).toBe('function');
		expect(call.ignored('folder/node_modules/stuff')).toBe(true);
		expect(call.ignored('folder/src/index.js')).toBe(false);
	});

	it('should emit an event when a file changes', async () => {
		(context.getNodeParameter as jest.Mock)
			.mockReturnValueOnce('folder')
			.mockReturnValueOnce('/watched')
			.mockReturnValueOnce({})
			.mockReturnValueOnce(['change']);

		await node.trigger.call(context);

		const callback = mockWatcher.on.mock.calls.find(([event]) => event === 'change')?.[1];
		callback?.('/watched/file.txt');

		expect(emitSpy).toHaveBeenCalledWith([[{ event: 'change', path: '/watched/file.txt' }]]);
	});

	it('should use "change" as the only event if watching a specific file', async () => {
		(context.getNodeParameter as jest.Mock)
			.mockReturnValueOnce('file')
			.mockReturnValueOnce('/watched/file.txt')
			.mockReturnValueOnce({});

		await node.trigger.call(context);

		expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
	});
});
