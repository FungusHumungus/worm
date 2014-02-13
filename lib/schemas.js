/**
* Maintains the list of registered schemas
*/

var valid = require('./validate'),
    schemas = [],
    _ = require('lodash'),
    validSchema = valid.checker(valid.hasKeys('table', 'fields'),
                                valid.fieldIsObject('fields'),
                                valid.if(valid.hasKeys('relationships'),
                                         valid.fieldIsArray('relationships')));

exports.registerSchema = function(schema) {
  valid.assert(schema, validSchema);

  if (_.contains(schemas, schema))
    throw Error("Schema already added");

 schemas.push(schema);
};

exports.clearSchema = function(schema) {
  schemas.length = 0;
}

exports.getSchemaForModel = function(model) {
  return _.findWhere(schemas, {table: model});
};