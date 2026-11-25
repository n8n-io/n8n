import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { OneSimpleApi } from '../OneSimpleApi.node';

describe('One Simple API retired operations', () => {
	it.each(['instagramProfile', 'spotifyArtistProfile'])(
		'rejects saved %s workflows before making an API call',
		async (operation) => {
			const context = mock<IExecuteFunctions>();
			context.getInputData.mockReturnValue([{ json: {} }]);
			context.getNode.mockReturnValue(mock<INode>({ name: 'One Simple API' }));
			context.getNodeParameter.mockReturnValueOnce('socialProfile').mockReturnValueOnce(operation);
			context.continueOnFail.mockReturnValue(false);

			await expect(new OneSimpleApi().execute.call(context)).rejects.toThrow(NodeOperationError);
			expect(context.getNodeParameter).toHaveBeenCalledTimes(2);
		},
	);
});
