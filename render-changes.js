var context = null,
	config = null,
	fs = null,
	P = null,
	request = require("request"),
	helpers = require("./helpers"),
	http = require("./http");

context = {
	fs : require("fs"),
	glob : require("glob"),
	marked : require("marked"),
	mustache : require("mustache"),
	P : require("bluebird"),
	Renderer : require("./renderer").Renderer,
	http : http
};

fs = context.fs;
P = context.P;
http = P.promisifyAll(http, { suffix : "P" });

if (process.argv.length < 3) {
	console.log("Usage: node --harmony render-changes.js config.json");
	process.exit();
}

config = JSON.parse(fs.readFileSync(process.argv[2]));

P.coroutine(function* () {
	var seqNumber = null,
		initialChangeRes = null;
	
	initialChangeRes = yield http.getP(config.couch.url + "/_changes?descending=true&limit=1");
	
	console.log(initialChangeRes);

	seqNumber = initialChangeRes.last_seq;

	yield* renderEverything();

	while(true) {
		changes = (yield http.getP(config.couch.url + "/_changes?since=" + seqNumber + "&feed=longpoll&timeout=1000"));

		if (changes.last_seq != seqNumber) {
			seqNumber = changes.last_seq;
			console.log((new Date()).toISOString(), seqNumber);
			yield* renderEverything();
		}
	}
})();

function* renderEverything() {
	var renderer = new (context.Renderer)(context, config),
		documents = null,
		content = null,
		renderFile = null;
	
	yield* renderer.init();
	
	documents = yield* helpers.fetchDocuments(http, config, renderer);

	renderFile = P.coroutine(helpers.renderToFile.bind(null, fs, renderer, config));

	yield P.each(
		documents,
		renderFile
	);
}
