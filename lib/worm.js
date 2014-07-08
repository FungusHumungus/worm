/*global require: false, exports: true, module: false */
var queries = require('./queries'),
    schemas = require('./schemas'),
    core = require('./coreworm')(queries),
    model = require('./model')(core),
    Connection = require('./connection);


module.exports.registerSchema = exports.registerSchema = schemas.registerSchema;
module.exports.clearSchema = exports.clearSchema = schemas.clearSchema;
module.exports.model = exports.model = model;
module.exports.Connection = exports.Connection = Connection;
