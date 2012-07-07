all:
	@echo "Script for minifying js files using uglify-js"
	@echo "Make sure uglifyjs is in include path"

minify:
	@echo "Minifying and packaging all js files using uglify-js"
	uglifyjs ./lib/jquery.js > minified.js
	uglifyjs ./lib/jquery.tmpl.js >> minified.js
	uglifyjs ./lib/GuitarJs/src/guitar.js >> minified.js
	uglifyjs ./lib/spine.js >> minified.js
	uglifyjs ./app/application.js >> minified.js
	uglifyjs ./app/models.js >> minified.js
	@echo "All js code minified and packaged to ./minified.js"

