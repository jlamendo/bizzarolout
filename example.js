var Hapi = require('hapi');
var routes = require('./lib/routes');

var server = new Hapi.Server({connections: { routes: { security: true  } } });
server.connection({ routes: { cors: true } }).route(routes);

var fuzzerOptions = {
    credentials: {
        username: 'default',
        password: 'letmein'
    },
    maxIterations: 100
};

server.register([{
    register: require('good'),
    options: {
        reporters: [{
            reporter: require('good-console'),
            args: [{ log: '*' }]
        }]
    }
}, {
    register: require('./'),
    options: fuzzerOptions
}], function (err) {

    if (err) {
        throw err;
    }

    server.start(function () {

        console.log('Server started', server.info.uri);
    });
});
