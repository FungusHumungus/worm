var _ = require('lodash');

/**
* Pick fields from the schema that get saved directly in the table
*/
var pickTableFields = function(data, schema) {
  return _.pick(data, _.reject(_.keys(schema), _.partial(isNotTableField, data)));
};

/**
* Fields in the schema that are objects or arrays are not direct table fields
*/
var isNotTableField = function(data, key) {
  // Remove the arrays from the data fields
  var field = data[key];
  return _.isObject(field) && !_.isDate(field);
};

  var getFieldsFromSchema = function(schema) {
    return _.chain(schema.fields)
    .keys()
    .reject(_.partial(isNotTableField, schema.fields))
    .map(function(field) {
      return schema.table + '.' + field + ' as ' + schema.table + '_' + field;
    })
    .value()
    .join(',');
  };

exports.pickTableFields = pickTableFields;
exports.getFieldsFromSchema = getFieldsFromSchema;
