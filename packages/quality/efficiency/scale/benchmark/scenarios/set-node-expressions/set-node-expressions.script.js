import http from 'k6/http';
import { check } from 'k6';

const apiBaseUrl = __ENV.API_BASE_URL;

export default function () {
	const res = http.post(`${apiBaseUrl}/webhook/set-expressions-benchmark`, {});

	if (res.status !== 200) {
		console.error(
			`Invalid response. Received status ${res.status}. Body: ${JSON.stringify(res.body)}`,
		);
	}

	check(res, {
		'is status 200': (r) => r.status === 200,
	});
}
