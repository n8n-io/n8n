import { IExecuteFunctions } from 'n8n-workflow';
import executeNode from './execute-node';

const contextProxy = new Proxy(
	{},
	{
		get(_, prop) {
			return (...args: any[]) => {
				console.log(`method '${prop.toString()}' called with`, args);

				if (prop === 'getNode') {
					return () => {
						console.log('called getNode()');
					};
				}
				return {};
			};
		},
	},
) as IExecuteFunctions;

(async () => {
	console.log('start?');
	try {
		const result = await executeNode({ packageName: 'Html', executeFunction: contextProxy });
		console.log('result?', result);
	} catch (e) {
		console.log('massive error occurred', e, e.message, e.stack);
	}
})();
