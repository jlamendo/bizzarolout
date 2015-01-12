var Joi = require('joi');
module.exports = [{
	method: 'GET',
	path: '/test/{any*}',
	handler: function(request, reply) {
		reply(request.query.qsid);
	},
	config: {
		validate: {
			query: {
				qsid: Joi.string().max(10).required(),
                id: Joi.number().integer()
			},
            params: {
                any: Joi.string()
            }
		}
	}
},{
	method: 'GET',
	path: '/testtwo/',
	handler: function(request, reply) {
		reply({ nothing: 'here' });
	},

}
];
