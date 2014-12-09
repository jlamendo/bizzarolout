var levelup = require('levelup');
var Sublevel = require('level-sublevel');

var db = Sublevel(levelup('../validators/db'));
var Jobs = require('level-jobs');
var cp = require('child_process');
var resources = {
	phantomjs:require('phantomjs').path,
	phantomXSS: __dirname + '../validators/phantomXSS.js',
};

var phantomJS = function(payload, cb){
	var args = [
	  resources.phantomXSS,
	  new Buffer(JSON.stringify(payload)).toString('base64')
	];

cp.execFile(binPath, childArgs, function(err, stdout, stderr) {
	var results = stdout.split('\n\n\n')[1];
	results = JSON.parse(new Buffer(results, 'base64').toString());
	cb(results);
});
};

var validators = {
	XSS: Jobs(db.sublevel('XSS'), phantomJS, {maxConcurrency: 5, maxRetries: 0}).push,

};


module.exports = validators;
