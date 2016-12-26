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
	console.log("Usage: node --harmony render-once.js config.json");
	process.exit();
}

config = JSON.parse(fs.readFileSync(process.argv[2]));
renderer = new (context.Renderer)(context, config);

P.coroutine(function* () {
	var documents = null,
		content = null;

	yield* renderer.init();

	documents = yield* helpers.fetchDocuments(http, config, renderer);
	
	yield P.each(
		documents,
		P.coroutine(function* (doc) {
			yield* helpers.renderToFile(fs, renderer, config, doc);
		})
	);

	yield* renderer.end(documents);
})();

