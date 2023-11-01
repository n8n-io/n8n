import nock from 'nock';
import {
	initBinaryDataService,
	setup,
	equalityTest,
	workflowToTests,
	getWorkflowFilenames,
} from '@test/nodes/Helpers';
import { parse as parseUrl } from 'url';

describe('Test HTTP Request Node', () => {
	const workflows = getWorkflowFilenames(__dirname);
	const tests = workflowToTests(workflows);

	const baseUrl = 'https://dummyjson.com';

	beforeAll(async () => {
		await initBinaryDataService();
		nock.disableNetConnect();

		//GET
		nock(baseUrl).get('/todos/1').reply(200, {
			id: 1,
			todo: 'Do something nice for someone I care about',
			completed: true,
			userId: 26,
		});
		nock(baseUrl).matchHeader('Authorization', 'Bearer 12345').get('/todos/3').reply(200, {
			id: 3,
			todo: 'Watch a classic movie',
			completed: false,
			userId: 4,
		});
		nock(baseUrl)
			.get('/todos?limit=2&skip=10')
			.reply(200, {
				todos: [
					{
						id: 11,
						todo: "Text a friend I haven't talked to in a long time",
						completed: false,
						userId: 39,
					},
					{
						id: 12,
						todo: 'Organize pantry',
						completed: true,
						userId: 39,
					},
				],
				total: 150,
				skip: 10,
				limit: 2,
			});

		//POST
		nock(baseUrl)
			.post('/todos/add', {
				todo: 'Use DummyJSON in the project',
				completed: false,
				userId: '5',
			})
			.reply(200, {
				id: 151,
				todo: 'Use DummyJSON in the project',
				completed: false,
				userId: '5',
			});
		nock(baseUrl)
			.post('/todos/add2', {
				todo: 'Use DummyJSON in the project',
				completed: false,
				userId: 15,
			})
			.reply(200, {
				id: 151,
				todo: 'Use DummyJSON in the project',
				completed: false,
				userId: 15,
			});

		//PUT
		nock(baseUrl).put('/todos/10', { userId: '42' }).reply(200, {
			id: 10,
			todo: 'Have a football scrimmage with some friends',
			completed: false,
			userId: '42',
		});

		//PATCH
		nock(baseUrl)
			.patch('/products/1', '{"title":"iPhone 12"}')
			.reply(200, {
				id: 1,
				title: 'iPhone 12',
				price: 549,
				stock: 94,
				rating: 4.69,
				images: [
					'https://i.dummyjson.com/data/products/1/1.jpg',
					'https://i.dummyjson.com/data/products/1/2.jpg',
					'https://i.dummyjson.com/data/products/1/3.jpg',
					'https://i.dummyjson.com/data/products/1/4.jpg',
					'https://i.dummyjson.com/data/products/1/thumbnail.jpg',
				],
				thumbnail: 'https://i.dummyjson.com/data/products/1/thumbnail.jpg',
				description: 'An apple mobile which is nothing like apple',
				brand: 'Apple',
				category: 'smartphones',
			});

		//DELETE
		nock(baseUrl).delete('/todos/1').reply(200, {
			id: 1,
			todo: 'Do something nice for someone I care about',
			completed: true,
			userId: 26,
			isDeleted: true,
			deletedOn: '2023-02-09T05:37:31.720Z',
		});

		// Pagination - Data not identical to dummyjson.com
		nock(baseUrl)
			.persist()
			.get('/users')
			.query(true)
			.reply(function (uri) {
				const data = parseUrl(uri, true);
				const skip = parseInt((data.query.skip as string) || '0', 10);
				const limit = parseInt((data.query.limit as string) || '10', 10);
				const nextUrl = `${baseUrl}/users?skip=${skip + limit}&limit=${limit}`;

				const response = [];
				for (let i = skip; i < skip + limit; i++) {
					if (i > 14) {
						break;
					}
					response.push({
						id: i,
					});
				}

				if (!response.length) {
					return [
						404,
						response,
						{
							'next-url': nextUrl,
							'content-type': this.req.headers['content-type'] || 'application/json',
						},
					];
				}

				return [
					200,
					response,
					{
						'next-url': nextUrl,
						'content-type': this.req.headers['content-type'] || 'application/json',
					},
				];
			});
	});

	afterAll(() => {
		nock.restore();
	});

	const nodeTypes = setup(tests);

	for (const testData of tests) {
		test(testData.description, async () => equalityTest(testData, nodeTypes));
	}
});
