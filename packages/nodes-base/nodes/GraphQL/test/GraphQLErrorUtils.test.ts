import { getGraphQlErrorDetails } from '../GraphQLErrorUtils';

describe('getGraphQlErrorDetails', () => {
	it('uses the raw string when the GraphQL error payload is a string', () => {
		expect(getGraphQlErrorDetails('An unexpected error occurred')).toEqual({
			message: 'An unexpected error occurred',
			errorData: {
				message: 'An unexpected error occurred',
			},
		});
	});

	it('uses the message from an object-shaped GraphQL error payload', () => {
		expect(
			getGraphQlErrorDetails({
				message: 'An unexpected error occurred',
			}),
		).toEqual({
			message: 'An unexpected error occurred',
			errorData: {
				message: 'An unexpected error occurred',
			},
		});
	});
});
