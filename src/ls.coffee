fs = require 'fs'

###*
 * @param {Array} paths Path or array of paths to iterate over
 * @param {Object} [config] Configuration object
 * @param {Boolean} [config.recurse=false] Recurse into each directory?
 * @param {RegExp} [config.regex] Match files against a regex?
 * @param {Function} [iterator] Function to run on each file found
 * @return {Array} Files found
 ###
module.exports = list = ->
	# Clone arguments object so we can manipulate it
	args = Array.prototype.slice.call arguments

	# Get path or array of paths
	paths = args.shift()
	paths = [paths] unless Array.isArray paths

	# Did we get a config object?
	config = if typeof args[0] is 'object' and Object.keys(args[0]).length then args.shift() else {}
	config.recurse ?= false

	# Is the regular expression / file matcher in the arguments or object?
	config.match ?= if args[0] instanceof RegExp then args.shift() else null

	# Function to iterate with?
	iterator = args.shift() if typeof args[0] is "function"

	# console.log "paths", paths, "iterator", iterator?, "config", config

	results = []

	while path = paths.shift()

		fs.readdirSync(path).sort().forEach (file) ->

			# Object with this file's properties
			self =
				path: path
				full: "#{path}/#{file}"
				file: file
				name: file.match(/^(.+?)(\.\w{2,7})?$/)?[1]

			# stat is loaded only when accessed
			Object.defineProperty self, "stat", get: -> fs.statSync(self.full)

			# Push this path into queue if we want to recurse 
			paths.push(self.full) if config.recurse and fs.statSync(self.full).isDirectory()

			# Bail out if this file doesn't match the regex...
			if config.match and not file.match config.match then return

			return if config.type is "file" and not fs.statSync(self.full).isFile() or
					config.type is "dir" and not fs.statSync(self.full).isDir()

			# Push into results array and run iterator over item
			results.push self
			iterator.call self, self if iterator

	results
