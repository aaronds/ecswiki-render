exports.index = function (context, config, renderer) {
	this.__init = function* () {
		console.log("In init.");
	}
}
