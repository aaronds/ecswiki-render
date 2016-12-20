exports.fetchDocuments = function* (http, config, renderer) {
	
	return (yield http.getP(config.couch.url + "/_all_docs?include_docs=true") || { rows : []}).rows
		.filter(function (res) {
			if (renderer.modules.index && renderer.modules.index.__filter) {
				return renderer.modules.index.__filter(res.doc);
			}

			return !res.id.match(/^_design/);
		})
		.map(function (res) { return res.doc; });
}

exports.renderToFile = function* (fs, renderer, config, doc) {
	var content = null,
		fileName = null;
	
	content = yield* renderer.render(doc);

	if (renderer.modules.index && renderer.modules.index.__resolveFileName) {
		fileName = renderer.modules.index.__resolveFileName(doc);
	}

	if (!fileName) {
		fileName = doc._id;
	}

	yield fs.writeFileP(config.output + fileName, content);

	return content;
}
