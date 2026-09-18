import { auditOperations } from '../AuditDescription';
import { N8n } from '../N8n.node';

function collectUrls(value: unknown): string[] {
	if (Array.isArray(value)) return value.flatMap(collectUrls);
	if (value === null || typeof value !== 'object') return [];

	return Object.entries(value).flatMap(([key, child]) => {
		if (key === 'url' && typeof child === 'string') return [child];
		return collectUrls(child);
	});
}

describe('n8n Node Structure', () => {
	it('audit operation default should be one of its options', () => {
		const operation = auditOperations[0];
		const values = (operation.options as Array<{ value: string }>).map((o) => o.value);
		expect(values).toContain(operation.default);
	});

	it('routes execution get and delete from the executionId field', () => {
		const properties = new N8n().description.properties;
		const executionOperation = properties.find(
			(property) =>
				property.name === 'operation' &&
				property.displayOptions?.show?.resource?.includes('execution'),
		);
		const operationOptions = (executionOperation?.options ?? []) as Array<{
			value: string;
			routing?: { request?: { url?: string } };
		}>;

		expect(
			operationOptions.find((option) => option.value === 'get')?.routing?.request?.url,
		).toBeUndefined();
		expect(
			operationOptions.find((option) => option.value === 'delete')?.routing?.request?.url,
		).toBeUndefined();

		const executionIdFields = properties.filter((property) => property.name === 'executionId');
		const getField = executionIdFields.find((property) =>
			property.displayOptions?.show?.operation?.includes('get'),
		);
		const deleteField = executionIdFields.find((property) =>
			property.displayOptions?.show?.operation?.includes('delete'),
		);

		expect(getField?.routing?.request).toEqual({
			method: 'GET',
			url: '=/executions/{{ toPathSegment($value) }}',
		});
		expect(deleteField?.routing?.request).toEqual({
			method: 'DELETE',
			url: '=/executions/{{ toPathSegment($value) }}',
		});
	});

	it('encodes every dynamic request URL path segment', () => {
		const dynamicUrls = collectUrls(new N8n().description.properties).filter(
			(url) => url.includes('$value') || url.includes('$parameter'),
		);

		expect(dynamicUrls.length).toBeGreaterThan(0);
		for (const url of dynamicUrls) {
			const dynamicExpressions = [...url.matchAll(/{{\s*(.*?)\s*}}/g)]
				.map((match) => match[1])
				.filter((expression) => expression.includes('$value') || expression.includes('$parameter'));

			expect(url.replace(/{{\s*(.*?)\s*}}/g, '')).not.toMatch(/\$(?:value|parameter)/);
			expect(dynamicExpressions.length).toBeGreaterThan(0);
			for (const expression of dynamicExpressions) {
				expect(expression).toMatch(/^toPathSegment\(.+\)$/);
			}
		}
	});
});
