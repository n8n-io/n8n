module.exports = {
	githubTrigger: {
		header: {
			displayName: '🇩🇪 GitHub Trigger',
			description: '🇩🇪 Listen to GitHub events',
		},
	},
	github: {
		header: {
			displayName: '🇩🇪 GitHub',
			description: '🇩🇪 Consume GitHub API',
		},
		credentialsModal: {
			githubOAuth2Api: {
				server: {
					displayName: '🇩🇪 Github Server',
					description: '🇩🇪 The server to connect to. Only has to be set if Github Enterprise is used.',
				},
			},
			githubApi: {
				server: {
					displayName: '🇩🇪 Github Server',
					description: '🇩🇪 The server to connect to. Only has to be set if Github Enterprise is used.',
				},
				user: {
					placeholder: '🇩🇪 Hans',
				},
				accessToken: {
					placeholder: '🇩🇪 123',
				},
			},
		},
		nodeView: {
			/**
			 * Examples of `options` parameters.
			 */
			authentication: {
				displayName: '🇩🇪 Authentication',
				options: {
					accessToken: {
						displayName: '🇩🇪 Access Token',
					},
					oAuth2: {
						displayName: '🇩🇪 OAuth2',
					},
				},
			},
			resource: {
				displayName: '🇩🇪 Resource',
				description: '🇩🇪 The resource to operate on.',
				options: {
					issue: {
						displayName: '🇩🇪 Issue',
					},
					file: {
						displayName: '🇩🇪 File',
					},
					repository: {
						displayName: '🇩🇪 Repository',
					},
					release: {
						displayName: '🇩🇪 Release',
					},
					review: {
						displayName: '🇩🇪 Review',
					},
					user: {
						displayName: '🇩🇪 User',
					},
				},
			},
			operation: {
				displayName: '🇩🇪 Operation',
				options: {
					create: {
						displayName: '🇩🇪 Create',
						description: '🇩🇪 Create a new issue.',
					},
					get: {
						displayName: '🇩🇪 Get',
						description: '🇩🇪 Get the data of a single issue.',
					},
				},
			},

			/**
			 * Examples of `string` parameters.
			 */
			owner: {
				displayName: '🇩🇪 Repository Owner',
				placeholder: '🇩🇪 n8n-io',
				description: '🇩🇪 Owner of the repository.',
			},
			repository: {
				displayName: '🇩🇪 Repository Name',
				placeholder: '🇩🇪 n8n',
			},
			title: {
				displayName: '🇩🇪 Title',
			},
			body: {
				displayName: '🇩🇪 Body',
			},

			/**
			 * Examples of `collection` parameters.
			 * `multipleValueButtonText` is the button label.
			 */
			labels: {
				displayName: '🇩🇪 Labels',
				multipleValueButtonText: '🇩🇪 Add Label',
			},
			assignees: {
				displayName: '🇩🇪 Assignees',
				multipleValueButtonText: '🇩🇪 Add Assignee',
			},

			/**
			 * Examples of fields in `collection` parameters.
			 * Note: Same level of nesting as `collection`.
			 */
			label: {
				displayName: '🇩🇪 Label',
				description: '🇩🇪 Label to add to issue.',
			},
			assignee: {
				displayName: '🇩🇪 Assignee',
				description: '🇩🇪 User to assign issue to.',
			},

			/**
			 * Example of a `fixedCollection` parameter.
			 * `placeholder` is the button label.
			 */
			additionalParameters: {
				displayName: '🇩🇪 Additional Fields',
				placeholder: '🇩🇪 Add Field',
				options: {
					author: {
						displayName: '🇩🇪 Author',
					},
					branch: {
						displayName: '🇩🇪 Branch',
					},
					committer: {
						displayName: '🇩🇪 Committer',
					},
				},
			},

			/**
			 * Example of a field in a `fixedCollection` parameter.
			 * Note: Same level of nesting as `fixedCollection`.
			 */
			committer: {
				displayName: '🇩🇪 Commit-Macher',
				description: '🇩🇪 Beschreibung',
			},

			/**
			 * Examples of options in a field in a `fixedCollection` parameter.
			 * Note: Same level of nesting as `fixedCollection`.
			 */
			name: {
				displayName: '🇩🇪 Name',
				description: '🇩🇪 The name of the author of the commit.',
			},
			email: {
				displayName: '🇩🇪 Email',
				description: '🇩🇪 The email of the author of the commit.'
			},

		},
	},
};
