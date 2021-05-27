module.exports = {
	de: {
		github: {
			// ----------------------------------------
			//          top-level display names
			// ----------------------------------------

			// main params
			Authentication: 'Authentifizierung',
			Resource: 'Ressource',
			Operation: 'Aktion',
			'Repository Owner': 'Repo Besitzer',
			'Repository Name': 'Repo Name',
			Title: 'Titel',
			Body: 'Körper',
			Label: 'Etikett',
			Assignee: 'Beauftragter',

			// headers (e.g. for collections)
			Labels: 'Etiketten',
			Assignees: 'Beauftragten',

			// headers (e.g. for fixed collections)
			'Additional Parameters': 'Zusätzliche Parameter',

			// option names (e.g. for fixed collections)
			Email: 'Email-Adresse',

			// descriptions (e.g. for operation options)
			'Create a new file in repository.': 'Neue Datei in Repo schaffen.',

			// ----------------------------------------
			//          nested display names
			// ----------------------------------------

			// dropdown options
			options: {
				Resource: {
					Issue: 'Thema',
					File: 'Datei',
					Repository: 'Repo',
					Release: 'Veröffentlichung',
					Review: 'Überprüfung',
					User: 'Benutzer',
				},
				Operation: {
					Create: 'Schaffen',
					Delete: 'Entfernen',
					Get: 'Anfragen',
				},
			},

			// buttons
			collection: {
				Labels: {
					multipleValueButtonText: 'Etikett hinzufügen',
				},
				Assignees: {
					multipleValueButtonText: 'Beautragten hinzufügen',
				},
			},
		},
	},
};
