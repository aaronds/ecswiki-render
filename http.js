var request = require("request"), 
	http = {};

function handleError(cb) {
	return function (err, res, body) {
		if (err) {
			return cb(err);
		}

		if (res.statusCode >= 300) {
			return cb(body);
		}

		return cb(null, body);
	}
}

http.get = function (url, cb) {
	request(
		{ url : url, json : true, method : "GET"},
		handleError(cb)
	);
}

http.post = function (url, data, cb) {
	request(
		{ url : url, json : true, data : data, method : "POST"},
		handleError(cb)
	);
}

module.exports = http;
