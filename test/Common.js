exports.Common = function (context, config, renderer) {
	this.testWithData = function* (doc, data) {
		data.now = Date.now();

		return data;
	}
}
