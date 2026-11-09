import http from 'k6/http';
import { check } from 'k6';

const apiBaseUrl = __ENV.API_BASE_URL;

const items = Array.from({ length: 10 }, (_, i) => ({
	sku: `SKU-${1000 + i}`,
	name: `Product ${i}`,
	qty: (i % 4) + 1,
	price: 9.5 + i,
}));

const payload = JSON.stringify({
	source: 'shop',
	user: {
		id: 4711,
		email: '  Jane.Doe@Example.com ',
		firstName: 'Jane',
		lastName: 'Doe',
		country: 'DE',
		tags: ['vip', 'newsletter'],
	},
	order: {
		id: 'ORD-1001',
		currency: 'eur',
		createdAt: '2026-11-01T10:00:00.000Z',
		items,
	},
});

export default function () {
	const res = http.post(`${apiBaseUrl}/webhook/expression-mix-benchmark`, payload, {
		headers: { 'Content-Type': 'application/json' },
	});

	if (res.status !== 200) {
		console.error(
			`Invalid response. Received status ${res.status}. Body: ${JSON.stringify(res.body)}`,
		);
	}

	check(res, {
		'is status 200': (r) => r.status === 200,
	});
}
