module.exports = {
	es: {
		gmail: {
			// ----------------------------------------
			//          top-level display names
			// ----------------------------------------

			// main params
			Authentication: 'Autenticación',
			Resource: 'Recurso',
			Operation: 'Operación',
			Subject: 'Asunto',
			Message: 'Mensaje',

			// headers (e.g. for fixed collections)
			'Additional Fields': 'Campos Adicionales',

			// option names (e.g. for fixed collections)
			'To Email': 'Correo electrónico de destino',
			'Attachments': 'Adjuntos',

			// descriptions (e.g. for operation options)
			'Create a new email draft': 'Crear un nuevo borrador',
			'Delete a draft': 'Eliminar un borrador',
			'Get a draft': 'Obtener un borrador',
			'Get all drafts': 'Obtener todos los borradores',

			// ----------------------------------------
			//          nested display names
			// ----------------------------------------

			// dropdown options
			options: {
				Resource: {
					Draft: 'Borrador',
					Label: 'Etiqueta',
					Message: 'Mensaje',
					'Message Label': 'Etiqueta y Mensaje',
				},
				Operation: {
					Create: 'Crear',
					Delete: 'Eliminar',
					Get: 'Obtener uno',
					'Get All': 'Obtener todos',
				},
			},
		},
	},
};
