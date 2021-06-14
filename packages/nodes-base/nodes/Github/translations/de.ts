module.exports = {
	de: {
		github: {

			// ----------------------------------
			//       credentials params
			// ----------------------------------

			credentials: {
				githubOAuth2Api: {
					server: {
						displayName: 'Deutsch',
						description: 'Deutsch',
					},
				},
				githubApi: {
					server: {
						displayName: 'Deutsch',
						description: 'Deutsch',
					},
				},
			},

			// ----------------------------------
			//          node params
			// ----------------------------------

			parameters: {

				/**
				 * Examples of `options` parameters.
				 */
				authentication: {
					displayName: 'Authentifizierung',
					options: {
						accessToken: {
							displayName: 'Zugangstoken',
						},
						oAuth2: {
							displayName: 'OAuth2',
						},
					},
				},
				resource: {
					displayName: 'Ressource',
					description: 'Beschreibung der Ressourcen',
					options: {
						issue: {
							displayName: 'Thema',
							description: 'Beschreibung eines Themas',
						},
						file: {
							displayName: 'Datei',
						},
						repository: {
							displayName: 'Repo',
						},
						release: {
							displayName: 'Veröffentlichung',
						},
						review: {
							displayName: 'Überprüfung',
						},
					},
				},
				operation: {
					displayName: 'Aktion',
					options: {
						create: {
							displayName: 'Schaffen',
							description: 'Neue Datei in Repo schaffen.',
						},
						get: {
							displayName: 'Anfragen',
							description: 'Beschreibung.',
						},
					},
				},

				/**
				 * Examples of `string` parameters.
				 */
				owner: {
					displayName: 'Repo Besitzer',
					placeholder: 'Deutsch',
					description: 'Deutsch',
				},
				repository: {
					displayName: 'Repo Name',
					placeholder: 'Das n8n',
				},
				title: {
					displayName: 'Titel',
				},
				body: {
					displayName: 'Körper',
				},

				/**
				 * Examples of `collection` parameters.
				 * `multipleValueButtonText` is the button label.
				 */
				labels: {
					displayName: 'Etiketten',
					description: 'Beschreibung der Etiketten',
					multipleValueButtonText: 'Etikett hinzufügen',
				},
				assignees: {
					displayName: 'Beauftragte',
					description: 'Beschreibung der Beauftragten',
					multipleValueButtonText: 'Beautragten hinzufügen',
				},

				/**
				 * Examples of fields in `collection` parameters.
				 * Note: Same level of nesting as `collection`.
				 */
				label: {
					displayName: 'Etikett',
					description: 'Beschreibung des Etikettes',
				},
				assignee: {
					displayName: 'Beauftragte',
					description: 'Beschreibung des Beauftragtens',
				},

				/**
				 * Example of a `fixedCollection` parameter.
				 * `placeholder` is the button label.
				 */
				additionalParameters: {
					displayName: 'Zusätzliche Parameter',
					description: 'Beschreibung der zusätzlichen Parameter',
					placeholder: 'Deutsch',
					options: {
						author: {
							displayName: 'Autor',
						},
						branch: {
							displayName: 'Ast',
						},
						committer: {
							displayName: 'Commit-Macher',
						},
					},
				},

				/**
				 * Example of a field in a `fixedCollection` parameter.
				 * Note: Same level of nesting as `fixedCollection`.
				 */
				committer: {
					displayName: 'Commit-Macher',
					description: 'Beschreibung',
				},

				/**
				 * Examples of options in a field in a `fixedCollection` parameter.
				 * Note: Same level of nesting as `fixedCollection`.
				 */
				name: {
					displayName: 'Deutsch',
					description: 'Deutsch',
				},
				email: {
					displayName: 'Deutsch',
					description: 'Deutsch',
				},

			},
		},
	},
};
