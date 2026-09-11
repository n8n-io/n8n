import { SERVICE_NAMES } from '../../containers/services/types';
import { describe, expect, it } from 'vitest';

import { getRequiredImages } from './distribution-images.mjs';

describe('getRequiredImages', () => {
	it.each(SERVICE_NAMES)('maps the %s service to its required images', (service) => {
		expect(() => getRequiredImages([], [service])).not.toThrow();
	});

	it('maps the tracing service to both tracing images', () => {
		expect(getRequiredImages([], ['tracing'])).toEqual(
			expect.arrayContaining(['jaeger', 'n8nTracer']),
		);
	});

	it('rejects an unknown service', () => {
		expect(() => getRequiredImages([], ['unknown'])).toThrow(
			'No Docker image mapping for service "unknown"',
		);
	});
});
