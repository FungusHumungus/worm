var schemas = require('./schemas'),
    _ = require('lodash'),
    fields = require('./fields');

/**
  * Given a set of data with fields named tablename_fieldname, it renames them
  * to just have the fieldname again.
  *
  * @param schema the schema of the renamed data
  * @param data the data to be renamed, can be a single row or an array of rows
  *
  */
var renameFields = function(schema, data) {
  var tablePortion = new RegExp('^' + schema.table + '_');

  // Rename the fields for a single row of data
  var renameFieldForRow = function(row) {
    // Go through all the keys of the object and replace the table name.
    var obj = _.reduce(_.keys(row), function(obj, key) {
      var newKey = key.replace(tablePortion, '');
      obj[newKey] = row[key];
      return obj;
    }, {});

    return fields.pickTableFields(obj, schema.fields);
  };

  if (_.isArray(data))
    return _.map(data, renameFieldForRow);
  else
    return renameFieldForRow(data);
};


/**
  * Takes the rows returned by the query and converts it in the the
  * tree structure of the models.
  */
function unflatten(results, schema) {

  // Group by the main objects id.
  var field;
  if (_.has(schema.fields, 'id')) {
    field = schema.table + '_id';
  } else if (_.has(schema, 'many_to_many')) {
    field = schema.table + '_' + schema.many_to_many.child_field;
  }

  var grouped = _.chain(results)
  .filter(function(r) { return r[field]; })
  .groupBy(field)
  .value();
  var keys = _.keys(grouped);

  // Then map each object to the unflattened version
  return keys.map(function(id) {
    // Get the first grouped row and copy it's fields into the object
    var obj = _.defaults(renameFields(schema, _.first(grouped[id])),
                         schema.fields);
    if (!schema.relationships || schema.relationships.length === 0)
      return obj;

    // Unflatten by reducing over each relationship
    return schema.relationships.reduce(function(obj, relationship) {

      var childSchema = schemas.getSchemaForModel(relationship.maps_to);

      var child = unflatten(grouped[id], childSchema);
      if (relationship.with_our_field) {
        // This is a many to one relationship, so we want the child field to be the object,
        // not an array of objects.
        obj[relationship.field] = child.length && child[0];
      } else {
        // This is a one to many, the field needs to be set to an array of the child objects.
        obj[relationship.field] = unflatten(grouped[id], childSchema);
      }

      return obj;
    }.bind(this), obj);
  }.bind(this));
};


exports.unflattenResults = unflatten;