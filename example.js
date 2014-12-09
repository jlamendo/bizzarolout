var Hapi = require('hapi');
var routes = require('./lib/routes');

var charset = require('./vectors/charset.js');
var config = {};
var doneTesting = false;
//var server = new Hapi.Server('0.0.0.0', 8000, config);

var server = new Hapi.Server({connections: { routes: { security: true  } } });
server.connection({ routes: { cors: true } }).route(routes);
var FuzzFactory = require('./lib');
var fuzzFactory = new FuzzFactory(
{
    users: [
        {
            name: 'Default',
            credentials: {
                    username: 'default',
                    password: 'letmein'
            },
            csrfToken: 'abcdef123'
        },{
        name: 'Admin',
            credentials: {
                    username: 'admin',
                    password: 'letmein'
            },
            csrfToken: 'abcdef123'
        },{
        name: 'CSRF_Check',
            credentials: {
                    username: null,
                    password: null,
            }
        },
    ],
    server: server,
    maxIterations: 10,
    cb: function(){
        server.start();
},
});
fuzzFactory.inject(function(res){
    if(res['0'].statusCode > 500){
        console.log(res);
    }
});
