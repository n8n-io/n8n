import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	handleListing,
	thinkificApiRequest,
} from './GenericFunctions';

import {
	bundleFields,
	bundleOperations,
	chapterFields,
	chapterOperations,
	collectionFields,
	collectionOperations,
	contentFields,
	contentOperations,
	courseFields,
	courseOperations,
	enrollmentFields,
	enrollmentOperations,
	instructorFields,
	instructorOperations,
	productFields,
	productOperations,
	promotionFields,
	promotionOperations,
	userFields,
	userOperations,
} from './descriptions';

export class Thinkific implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Thinkific',
		name: 'thinkific',
		icon: 'file:thinkific.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Thinkific API',
		defaults: {
			name: 'Thinkific',
			color: '#393d74',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'thinkificApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Bundle',
						value: 'bundle',
					},
					{
						name: 'Chapter',
						value: 'chapter',
					},
					{
						name: 'Collection',
						value: 'collection',
					},
					{
						name: 'Content',
						value: 'content',
					},
					{
						name: 'Course',
						value: 'course',
					},
					{
						name: 'Enrollment',
						value: 'enrollment',
					},
					{
						name: 'Instructor',
						value: 'instructor',
					},
					{
						name: 'Product',
						value: 'product',
					},
					{
						name: 'Promotion',
						value: 'promotion',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'bundle',
				description: 'Resource to consume',
			},
			...bundleOperations,
			...bundleFields,
			...chapterOperations,
			...chapterFields,
			...collectionOperations,
			...collectionFields,
			...contentOperations,
			...contentFields,
			...courseOperations,
			...courseFields,
			...enrollmentOperations,
			...enrollmentFields,
			...instructorOperations,
			...instructorFields,
			...productOperations,
			...productFields,
			...promotionOperations,
			...promotionFields,
			...userOperations,
			...userFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {

			if (resource === 'bundle') {

				// **********************************************************************
				//                                 bundle
				// **********************************************************************

				if (operation === 'get') {

					// ----------------------------------------
					//               bundle: get
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Bundles/getBundleByID

					const bundleId = this.getNodeParameter('bundleId', i);

					responseData = await thinkificApiRequest.call(this, 'GET', `/bundles/${bundleId}`);

				}

			} else if (resource === 'chapter') {

				// **********************************************************************
				//                                chapter
				// **********************************************************************

				if (operation === 'get') {

					// ----------------------------------------
					//               chapter: get
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Chapters/getChapterByID

					const chapterId = this.getNodeParameter('chapterId', i);

					const endpoint = `/chapters/${chapterId}`;
					responseData = await thinkificApiRequest.call(this, 'GET', endpoint);

				}

			} else if (resource === 'collection') {

				// **********************************************************************
				//                               collection
				// **********************************************************************

				if (operation === 'create') {

					// ----------------------------------------
					//            collection: create
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Categories/crateCollection

					const body = {
						name: this.getNodeParameter('name', i),
						description: this.getNodeParameter('description', i),
						slug: this.getNodeParameter('slug', i),
					} as IDataObject;

					responseData = await thinkificApiRequest.call(this, 'POST', '/collections', body);

				} else if (operation === 'delete') {

					// ----------------------------------------
					//            collection: delete
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Categories/deleteCollectionByID

					const collectionId = this.getNodeParameter('collectionId', i);

					const endpoint = `/collections/${collectionId}`;
					responseData = await thinkificApiRequest.call(this, 'DELETE', endpoint);

				} else if (operation === 'get') {

					// ----------------------------------------
					//             collection: get
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Categories/GetCollectionbyID

					const collectionId = this.getNodeParameter('collectionId', i);

					const endpoint = `/collections/${collectionId}`;
					responseData = await thinkificApiRequest.call(this, 'GET', endpoint);

				}

			} else if (resource === 'content') {

				// **********************************************************************
				//                                content
				// **********************************************************************

				if (operation === 'get') {

					// ----------------------------------------
					//               content: get
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Contents/getContentByID

					const contentId = this.getNodeParameter('contentId', i);

					const endpoint = `/contents/${contentId}`;
					responseData = await thinkificApiRequest.call(this, 'GET', endpoint);

				}

			} else if (resource === 'course') {

				// **********************************************************************
				//                                 course
				// **********************************************************************

				if (operation === 'get') {

					// ----------------------------------------
					//               course: get
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Courses/getCourseByID

					const courseId = this.getNodeParameter('courseId', i);

					responseData = await thinkificApiRequest.call(this, 'GET', `/courses/${courseId}`);

				}

			} else if (resource === 'enrollment') {

				// **********************************************************************
				//                               enrollment
				// **********************************************************************

				if (operation === 'create') {

					// ----------------------------------------
					//            enrollment: create
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Enrollments/createEnrollment

					const body = {
						course_id: this.getNodeParameter('course_id', i),
						user_id: this.getNodeParameter('user_id', i),
					} as IDataObject;

					responseData = await thinkificApiRequest.call(this, 'POST', '/enrollments', body);

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//            enrollment: getAll
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Enrollments/getEnrollments

					responseData = await handleListing.call(this, 'GET', '/enrollments');

				}

			} else if (resource === 'instructor') {

				// **********************************************************************
				//                               instructor
				// **********************************************************************

				if (operation === 'create') {

					// ----------------------------------------
					//            instructor: create
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Instructors/createInstructor

					responseData = await thinkificApiRequest.call(this, 'POST', '/instructors');

				} else if (operation === 'delete') {

					// ----------------------------------------
					//            instructor: delete
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Instructors/deleteInstructorByID

					responseData = await thinkificApiRequest.call(this, 'DELETE', '/instructors');

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//            instructor: getAll
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Instructors/getInstructors

					responseData = await handleListing.call(this, 'GET', '/instructors');

				}

			} else if (resource === 'product') {

				// **********************************************************************
				//                                product
				// **********************************************************************

				if (operation === 'get') {

					// ----------------------------------------
					//               product: get
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Products/getProductByID

					const productId = this.getNodeParameter('productId', i);

					const endpoint = `/products/${productId}`;
					responseData = await thinkificApiRequest.call(this, 'GET', endpoint);

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//             product: getAll
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Products/getProducts

					responseData = await handleListing.call(this, 'GET', '/products');

				}

			} else if (resource === 'promotion') {

				// **********************************************************************
				//                               promotion
				// **********************************************************************

				if (operation === 'get') {

					// ----------------------------------------
					//              promotion: get
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Promotions/getPromotionByID

					const promotionId = this.getNodeParameter('promotionId', i);

					const endpoint = `/promotions/${promotionId}`;
					responseData = await thinkificApiRequest.call(this, 'GET', endpoint);

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//            promotion: getAll
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Promotions/getPromotions

					responseData = await handleListing.call(this, 'GET', '/promotions');

				}

			} else if (resource === 'user') {

				// **********************************************************************
				//                                  user
				// **********************************************************************

				if (operation === 'delete') {

					// ----------------------------------------
					//               user: delete
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Users/deleteUserByID

					const userId = this.getNodeParameter('userId', i);

					responseData = await thinkificApiRequest.call(this, 'DELETE', `/users/${userId}`);

				} else if (operation === 'get') {

					// ----------------------------------------
					//                user: get
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Users/getUserByID

					const userId = this.getNodeParameter('userId', i);

					responseData = await thinkificApiRequest.call(this, 'GET', `/users/${userId}`);

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//               user: getAll
					// ----------------------------------------

					// https://developers.thinkific.com/api/api-documentation/#/Users/getUsers

					responseData = await handleListing.call(this, 'GET', '/users');

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
