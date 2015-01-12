var Joi = require('joi');
var Hoek = require('hoek');
var Path = require('path');


module.exports = internals = {
    defaults: {
        endpoint: '/docs',
        auth: false,
        basePath: Path.join(__dirname, '..', 'templates'),
        cssPath: Path.join(__dirname, '..', 'public', 'css'),
        helpersPath: Path.join(__dirname, '..', 'templates', 'helpers'),
        partialsPath: Path.join(__dirname, '..', 'templates'),
        indexTemplate: 'index',
        routeTemplate: 'route',
        methodsOrder: ['get', 'head', 'post', 'put', 'delete', 'trace'],
        filterRoutes: null
    }
};

var settings = Hoek.clone(internals.defaults);

internals.getConnectionsData = function (server) {
    var connections = [];
    var routingTable = server.table();

    routingTable.forEach(function (connection) {

        connection.table = connection.table.filter(function(item) {

            return item.method !== 'options' &&
                (!settings.filterRoutes || settings.filterRoutes({
                method: item.method,
                path: item.path,
                connection: connection
            }));
        }).sort(function (route1, route2) {

            if (route1.path > route2.path) {
                return 1;
            }

            if (route1.path < route2.path) {
                return -1;
            }

            return settings.methodsOrder.indexOf(route1.method) - settings.methodsOrder.indexOf(route2.method);
        });

        connection.table = internals.getRoutesData(connection.table);
        connections.push(connection);
    });


    return connections;
};


internals.getRoutesData = function (routes) {

    return routes.map(function (route) {

        var tmp = {
            path: route.path,
            method: route.method.toUpperCase(),
            description: route.settings.description,
            notes: route.settings.notes,
            tags: route.settings.tags,
            auth: route.settings.auth,
            vhost: route.settings.vhost,
            handler: route.settings.handler,
            cors: route.settings.cors !== null ? route.settings.cors.toString() : null,
            jsonp: route.settings.jsonp,
            pathParams: internals.describe(route.settings.validate.params),
            queryParams: internals.describe(route.settings.validate.query),
            payloadParams: internals.describe(route.settings.validate.payload),
            responseParams: internals.describe(route.settings.response && route.settings.response.schema)
        };
        return tmp;
    });
};


internals.describe = function (params) {

    if (params == null || typeof params !== 'object') {

        return null;
    }

    var description = Joi.compile(params).describe();
    return internals.getParamsData(description);
};


internals.getParamsData = function (param, name) {

    // Detection of "false" as validation rule
    if (!name && param.type === 'object' && param.children && Object.keys(param.children).length === 0) {

        return {
            isDenied: true
        };
    }

    // Detection of conditional alternatives
    if (param.ref && param.is) {

        return {
            condition: {
                key: param.ref.substr(4), // removes 'ref:'
                value: internals.getParamsData(param.is)
            },
            then: param.then,
            otherwise: param.otherwise
        };
    }

    var type;
    if (Array.isArray(param)) {
        type = 'alternatives';
    }
    else if (param.valids && param.valids.some(Joi.isRef)) {
        type = 'reference';
    }
    else {
        type = param.type;
    }

    var data = {
        name: name,
        description: param.description,
        notes: param.notes,
        tags: param.tags,
        meta: param.meta,
        unit: param.unit,
        type: type,
        allowedValues: type !== 'reference' && param.valids ? internals.getExistsValues(param.valids) : null,
        disallowedValues: type !== 'reference' && param.invalids ? internals.getExistsValues(param.invalids) : null,
        examples: param.examples,
        peers: param.dependencies && param.dependencies.map(internals.formatPeers),
        target: type === 'reference' ? internals.getExistsValues(param.valids) : null,
        flags: param.flags && {
            allowUnknown: 'allowUnknown' in param.flags && param.flags.allowUnknown.toString(),
            default: param.flags.default,
            encoding: param.flags.encoding, // binary specific
            insensitive: param.flags.insensitive, // string specific
            required: param.flags.presence === 'required'
        }
    };

    if (data.type === 'object') {
        if (param.children) {
            var childrenKeys = Object.keys(param.children);
            data.children = childrenKeys.map(function (key) {

                return internals.getParamsData(param.children[key], key);
            });
        }

        if (param.patterns) {
            data.patterns = param.patterns.map(function (pattern) {

                return internals.getParamsData(pattern.rule, pattern.regex);
            });
        }
    }

    if (['array', 'binary', 'date', 'object', 'string'].indexOf(data.type) !== -1) {
        data.rules = {};
        if (param.rules) {
            param.rules.forEach(function (rule) {

                data.rules[internals.capitalize(rule.name)] = internals.processRuleArgument(rule);
            });
        }

        ['includes', 'excludes'].forEach(function (rule) {

            if (param[rule]) {
                data.rules[internals.capitalize(rule)] = param[rule].map(function (type) {

                    return internals.getParamsData(type);
                });
            }
        });
    }
    else if (data.type === 'alternatives') {
        data.alternatives = param.map(function (alternative) {

            return internals.getParamsData(alternative);
        });
    }

    return data;
};


internals.getExistsValues = function (exists) {

    var values = exists.filter(function (value) {

        if (typeof value === 'string' && value.length === 0) {
            return false;
        }

        return true;
    }).map(function (value) {

        if (Joi.isRef(value)) {

            return (value.isContext ? '$' : '') + value.key;
        }

        return value;
    });

    return values.length ? values : null;
};


internals.capitalize = function (string) {

    return string.charAt(0).toUpperCase() + string.slice(1);
};


internals.formatPeers = function (condition) {

    if (condition.key) {

        return 'Requires ' + condition.peers.join(', ') + ' to ' + (condition.type === 'with' ? '' : 'not ') +
            'be present when ' + condition.key + ' is.';
    }

    return 'Requires ' + condition.peers.join(' ' + condition.type + ' ') + '.';
};


internals.processRuleArgument = function (rule) {

    var arg = rule.arg;
    if (rule.name === 'assert') {

        return {
            key: (arg.ref.isContext ? '$' : '') + arg.ref.key,
            value: internals.describe(arg.cast)
        };
    }

    return arg;
};
