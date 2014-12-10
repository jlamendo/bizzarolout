
var system = require('system');

var WebKit = function() {
};

WebKit.prototype.clearPage = function() {
	var _this = this;
	_this.xss = [];
	_this.wp = new WebPage();

	_this.wp.settings = {
		loadImages: true,
		localToRemoteUrlAccessEnabled: true,
		javascriptEnabled: true,
		webSecurityEnabled: false,
		XSSAuditingEnabled: false
	};

	// Custom handler for alert functionality
	_this.wp.onAlert = function(msg) {
		_this.xss.push({
			event: 'alert',
			msg: msg
		});
	};

	_this.wp.onConfirm = function(msg) {
		_this.xss.push({
			event: 'confirm',
			msg: msg
		});
	};

	_this.wp.onPrompt = function(msg) {
		_this.xss.push({
			event: 'prompt',
			msg: msg
		});
	};
};

webKit.prototype.run = function(data) {
	if (data.vector) {
		this.vector = data.vector;
	} else {
		this.vector = null;
	}
	data = data.html;
	_this.clearPage();
	var _this = this;
	var html_response = "";
	_this.wp.content = data;

	// Evaluate page, rendering javascript

	xssInfo = _this.wp.evaluate(function(wp) {
		var tags = ["a", "abbr", "acronym", "address", "applet", "area", "article", "aside", "audio", "audioscope", "b", "base", "basefont", "bdi", "bdo", "bgsound", "big", "blackface", "blink", "blockquote", "body", "bq", "br", "button", "canvas", "caption", "center", "cite", "code", "col", "colgroup", "command", "comment", "datalist", "dd", "del", "details", "dfn", "dir", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption", "figure", "fn", "font", "footer", "form", "frame", "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html", "i", "iframe", "ilayer", "img", "input", "ins", "isindex", "kbd", "keygen", "label", "layer", "legend", "li", "limittext", "link", "listing", "map", "mark", "marquee", "menu", "meta", "meter", "multicol", "nav", "nobr", "noembed", "noframes", "noscript", "nosmartquotes", "object", "ol", "optgroup", "option", "output", "p", "param", "plaintext", "pre", "progress", "q", "rp", "rt", "ruby", "s", "samp", "script", "section", "select", "server", "shadow", "sidebar", "small", "source", "spacer", "span", "strike", "strong", "style", "sub", "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "tt", "u", "ul", "var", "video", "wbr", "xml", "xmp"];
		var eventHandler = ["mousemove", "mouseout", "mouseover"]


		tags.forEach(function(tag) {
			currentTags = document.querySelector(tag);
			if (currentTags !== null) {
				eventHandler.forEach(function(currentEvent) {
					var ev = document.createEvent("MouseEvents");
					ev.initEvent(currentEvent, true, true);
					currentTags.dispatchEvent(ev);
				});
			}
		});
		// Return information from page, if necessary
	}, _this.wp);
	var renderedDom = _this.wp.evaluate(function(wp){
		return document.documentElement.innerHTML;
	});
	if (vector) {
		try {
		xss.push({
			event: 'grep',
			msg: renderedDom.slice(
				renderedDom.indexOf(vector.id) - vector.len,
				renderedDom.indexOf(vector.id) + vector.len
			)
		});
	} catch(e){}
	}
	return xss;
};

var validator = new WebKit();
var data = JSON.parse(atob(system.args[2]));
var results = validator.run(data);
results = JSON.stringify(results);
results = btoa(results);
console.log('\n\n\n' + results + '\n\n\n');
phantom.exit();