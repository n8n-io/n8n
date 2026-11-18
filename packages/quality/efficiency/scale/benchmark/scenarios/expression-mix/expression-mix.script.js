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

// Fields with a fixed value for the payload above, from native and engine-only expressions
const expectedFields = {
	orderId: 'ORD-1001',
	bulkLines: 4,
	summary: 'Order ORD-1001 for Jane Doe (EU)',
	source: 'shop',
	currency: 'EUR',
	total: 324.5,
	createdDay: '2026-11-01',
	reference: 'DE-ORD-1001',
	emailDomain: 'example.com',
};

const hasExpectedFields = (r) => {
	const [item] = r.json();
	return (
		Object.entries(expectedFields).every(([key, value]) => item[key] === value) &&
		item.skus.join() === items.map((i) => i.sku).join()
	);
};

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
		'has expected fields': hasExpectedFields,
	});
}
