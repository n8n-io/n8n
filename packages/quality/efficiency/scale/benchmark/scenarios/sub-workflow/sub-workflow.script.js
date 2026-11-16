import http from 'k6/http';
import { check } from 'k6';

const apiBaseUrl = __ENV.API_BASE_URL;

const ITEM_COUNT = 100;

const payload = JSON.stringify({
	items: Array.from({ length: ITEM_COUNT }, (_, i) => ({
		id: i,
		firstName: `First${i}`,
		lastName: `Last${i}`,
		age: 20 + (i % 50),
	})),
});

export default function () {
	const res = http.post(`${apiBaseUrl}/webhook/sub-workflow-benchmark`, payload, {
		headers: { 'Content-Type': 'application/json' },
	});

	if (res.status !== 200) {
		console.error(
			`Invalid response. Received status ${res.status}. Body: ${JSON.stringify(res.body)}`,
		);
	}

	check(res, {
		'is status 200': (r) => r.status === 200,
		'has items processed by the sub-workflow': (r) => {
			if (r.status !== 200) return false;

			try {
				const body = JSON.parse(r.body);
				return (
					Array.isArray(body) &&
					body.length === ITEM_COUNT &&
					body.every((item) => item.processedBySubWorkflow === true)
				);
			} catch (error) {
				console.error('Error parsing response body: ', error);
				return false;
			}
		},
	});
}
