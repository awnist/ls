## What's "ls"?

ls is a node module for cleanly traversing directories and listing files.

The primary goal is a flexible, expressive syntax.

## Overview

First require:

    ls = require "ls"

Then we can be as sparse as

    for file in ls "/path"
        console.log file.name

Or as elaborate as 

    ls ["/path/foo*", "/another/path/"], { recurse: true }, /jpg/, ->
        console.log @name, "is in", @path, "and is", @stat.size

## Usage

The only required argument is the initial path, the rest can be omitted.

    ls [path/s], {config}, /file regex/, -> iterator function

Each file produces an object with the following parameters:

* path: The path to the file (/foo/bar/)
* full: The path and file (/foo/bar/baz.jpg)
* file: The file (baz.jpg)
* name: The file without an extension (baz)
* stat: A lazy loaded stat object from [fs.Stats](http://nodejs.org/api/fs.html#fs_class_fs_stats)

You can either grab the whole list

    all_files = ls "/path"
    for file in all_files
        console.log file.name, "is", file.stat.size

Or use an iterator function, with the context being the file's object

    ls "/path", ->
        console.log @name, "is", @stat.size

The {config} object accepts the following parameters:

* recurse: Should we recurse into directories? (Boolean, default is false)
* type: What kind of files should we return? ("all", "dir", "file", default is "all")

The /regex/ will only return matching files. All directories will still be recursed.

The -> iterator function is mostly a style preference, but can be handy if you need to throw an error and stop traversal. 

## Installation

The recommended way is through the excellent [npm](http://www.npmjs.org/):

    $ npm install ls

Otherwise, you can check it in your repository and then expose it:

    $ git clone git://github.com/awnist/ls.git node_modules/ls/

ls is [UNLICENSED](http://unlicense.org/).
