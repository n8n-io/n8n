import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	RequestPath,
} from 'n8n-workflow';
import { NodeOperationError, requestPath } from 'n8n-workflow';

const appendSegment = (path: RequestPath, segment: string) =>
	segment === '' ? requestPath`${path}/` : requestPath`${path}/${segment}`;

const searchParamsToQuery = (searchParams: URLSearchParams): IDataObject =>
	Object.fromEntries(
		[...new Set(searchParams.keys())].map((key) => {
			const values = searchParams.getAll(key);
			return [key, values.length > 1 ? values : values[0]];
		}),
	);

export function parseNextPageLink(
	context: IExecuteFunctions | ILoadOptionsFunctions,
	link: string,
	currentPath: RequestPath,
) {
	try {
		const url = new URL(link, `https://next-page.invalid${currentPath.value}`);
		const segments = url.pathname.slice(1).split('/').map(decodeURIComponent);
		return {
			resource: segments.reduce(appendSegment, requestPath``),
			qs: searchParamsToQuery(url.searchParams),
		};
	} catch {
		throw new NodeOperationError(context.getNode(), 'Unexpected next page link');
	}
}
