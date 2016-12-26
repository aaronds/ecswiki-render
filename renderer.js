exports.Renderer = function (context, config) {

	var P = context.P,
		http = context.http,
		globP = P.promisify(context.glob),
		fs = P.promisifyAll(context.fs, { suffix : "P" }),
		marked = context.marked,
		mustache = context.mustache,
		that = this;

	this.globalRenderContext = {};
	this.templates = {};
	this.modules = {};

	this.init = function* () {
		var templateFiles = null;

		(yield* loadFilesLike("**/*.mustache")).forEach(function (fileTemplate) {

			var templatePath = null;

			templatePath = fileTemplate.file.replace(config.path,"").replace(/\.mustache$/,"");

			that.templates[templatePath] = fileTemplate.string;
		});

		(yield* loadFilesLike("*.js")).forEach(function (moduleFile) {
			var moduleName = null;

			moduleName = moduleFile.file.replace(config.path,"").replace(/\.js$/,"");

			that.modules[moduleName] = new (require(moduleFile.file)[moduleName])(context, config, that);
		});

		if (this.modules.index && this.modules.index.__init) {
			yield* this.modules.index.__init(context, config, that);
		}
	}

	this.render = function* (doc, data) {
		var template = null,
			moduleRegex = null,
			matches = null,
			mainTemplate = null,
			index = null;

		data = data || {};
		
		if (this.modules.index) {
			index = this.modules.index;
		}

		if (config.template.variable) {
			template = doc[config.template.variable];
		}

		if (index && index.__resolveTemplate) {
			template = index.__resolveTemplate(doc);
		}

		if (!template && config.template.default) {
			template = config.template.default;
		}

		if (!template) {
			throw new Error("Template not defined");
		}

		if (!this.templates[template]) {
			throw new Error(template + " Not found");
		}

		(config.template.fieldsToCopy || []).forEach(function (field) {
			data[field] = doc[field];
		});

		mainTemplate = this.templates[template];

		moduleRegex = /\{\{\>([A-Za-z0-9]+)\/([A-Za-z0-9]+)\}\}/g;

		do {
			matches = moduleRegex.exec(mainTemplate);
			if (matches) {
				if (this.modules[matches[1]] && this.modules[matches[1]][matches[2]]) {
					data = yield* this.modules[matches[1]][matches[2]](doc, data); 
				}
			}
		} while(matches);

		(config.template.markdownFields || []).forEach(function (field) {
			if (!doc[field]) {
				return;
			}

			if (index && index.__renderMarkdown) {
				data[field] = index.__renderMarkdown(doc[field], doc, field);
			} else {
				data[field] = marked(doc[field]);
			}
		});

		if (index && index.__preRender) {
			yield* index.__preRender(doc, data);
		}

		return mustache.to_html(mainTemplate, data, this.templates);
	}

	this.end = function* (documents) {
		var index = null;

		if (this.modules.index) {
			index = this.modules.index;
		}

		if (index.__end) {
			yield* index.__end(documents);
		}
	}

	function* loadFilesLike(pattern) {

		return yield P.map(
			yield globP(config.path + "/" + pattern),
			P.coroutine(function* (file) {
				var fileStr = null;

				fileStr = yield fs.readFileP(file, 'utf8');

				return {
					file : file,
					string : fileStr
				};
			})
		);
	}
}
