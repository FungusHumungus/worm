var _ = require('lodash'),
    schemas = require('./schemas'),
    removePrivates = require('./removePrivates').removePrivates;

function added(obj) {
  return {status: 'added', obj: removePrivates(obj)};
}

function unchanged(obj) {
  return {status: 'unchanged', obj: removePrivates(obj)};
}

function changed(obj, changes) {
  return {status: 'changed', obj: removePrivates(obj), change: changes};
}

function getChildDiffs(model, obj1Children, obj2Children) {

  var schema = schemas.getSchemaForModel(model);

  return obj1Children.map(function(child) {
    // Find the associated row in obj2.
    var key = schema.primarykey || '[id]';
    var child2 = _.findWhere(obj2Children, _.pick(child, key));

    return getDiffs(schema.table, child, child2);
  });
}

function getDiffs(model, obj1, obj2) {
  if (!obj1) return added(obj2);

  var schema = schemas.getSchemaForModel(model);

  var diffKeys = _.keys(obj1).filter(function(key) {
    return !_.isObject(obj1[key]) && obj1[key] !== obj2[key];
  });

  var changes = diffKeys.reduce(function(obj, key) {
    obj[key] = {from: obj1[key], to: obj2[key]};
    return obj;
  }, {});

  // Get diffs of child records
  for (var idx in schema.relationships) {
    var relationship = schema.relationships[idx];
    if (_.isArray(obj1[relationship.field])) {
      obj2[relationship.field] = getChildDiffs(relationship.maps_to,
                                               obj1[relationship.field],
                                               obj2[relationship.field]);
    } else if (_.isObject(obj2[relationship.field])) {
      obj2[relationship.field] = getDiffs(relationship.maps_to, obj1[relationship.field], obj2[relationship.field])
    }
  }

  if (_.isEqual(changes, {}))
    return unchanged(obj2);

  return changed(obj2, changes);
}

/**
* Given the object it stores a copy of it and attached a method to allow us
* to track any changes made the object.
*/
module.exports.track = function(obj, model) {
  var original = _.clone(obj, true);

  obj.__diffs = function() {
    // Make sure we don't mutate the original object.
    var clone = _.clone(this, true);
    return getDiffs(model, original, clone);
  };

  return obj;
}
