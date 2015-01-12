var Async = require('async');
var Hoek = require('hoek');
var sorrow = require('./sorrow.js');
var routeParser = require('./routeParser.js');

var internals = {};
internals.factory = function (server, options) {

    this.server = server;
    this.credentials = options.credentials;
    this.table = routeParser.getConnectionsData(server)[0].table;
    this.log = server.log.bind(server);
    this.iterations = options.iterations || 100;
};

internals.factory.prototype.seed = function (param) {

    var type = param.type !== undefined ? param.type.toLowerCase() : 'string';
    return sorrow[type];
};

internals.factory.prototype.fuzzParam = function (param) {

    return encodeURIComponent(this.seed(param));
};

internals.factory.prototype.fuzz = function (callback) {

    var self = this;
    var table = this.table.filter(function (route) {
        return Hoek.reach(route, 'queryParams.children') ||
            Hoek.reach(route, 'payloadParams.children') ||
            Hoek.reach(route, 'pathParams.children');
    });

    Async.mapLimit(table, 3, function (route, next) {

        var params = {
            query: Hoek.reach(route, 'queryParams.children', { default: [] }),
            path: Hoek.reach(route, 'pathParams.children', { default: [] }),
            payload: Hoek.reach(route, 'payloadParams.children', { default: [] })
        };

        self.log(['bizzarolout', 'start'], route.path);

        if (!route.auth) {
            self.log(['bizzarolout', 'warning'], route.path + ' is unauthenticated');
        };

        var generateFuzz = function () {

            var fuzzed = {
                method: route.method,
                url: route.path,
                credentials: self.credentials,
                payload: params.payload.length > 0 ? {} : undefined
            };

            params.query.forEach(function (param) {

                fuzzed.url += (fuzzed.url.indexOf('?') !== -1 ? '&' : '?') + param.name + '=' + self.fuzzParam(param);
            });

            params.path.forEach(function (param) {

                var re = new RegExp('{' + param.name + '[\?\*]?}');
                fuzzed.url = fuzzed.url.replace(re, self.fuzzParam(param));
            });

            params.payload.forEach(function (param) {

                fuzzed.payload[param.name] = self.fuzzParam(param);
            });

            return fuzzed;
        };

        var results = [];
        for (var i = 0, l = self.iterations; i < l; ++i) {
            results.push({});
        }

        var i = 0;

        Async.mapSeries(results, function (result, next) {

            setImmediate(function () {
                var fuzzed = generateFuzz();
                self.server.inject(fuzzed, function (res) {

                    if (res.statusCode >= 500) {
                        var response = {
                            statusCode: res.statusCode,
                            payload: res.response,
                            request: fuzzed
                        };

                        delete response.request.credentials;
                        self.log(['bizzarolout', 'error'], route.path + ' got an error: ' + JSON.stringify(response));
                    }
                    next(null, res);
                });
            });
        }, function (err, results) {

            results = results.filter(function (result) { return result.statusCode >= 500; });
            self.log(['bizzarolout', 'end'], route.path + ' ' + results.length + ' errors');
            next(err, results);
        });
    }, function (err, results) {

        var flattened = [];
        for (var i = 0, l = results.length; i < l; ++i) {
            flattened = flattened.concat(results[i]);
        }

        callback(err, flattened);
    });
};

exports.register = function (server, options, next) {

    var fuzzer = new internals.factory(server, options);
    server.expose({ fuzz: fuzzer.fuzz.bind(fuzzer) });
    next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};
