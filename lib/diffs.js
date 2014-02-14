var _ = require('lodash'),
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

function getDiffs(obj1, obj2) {
  console.log('====>');
  console.log(obj1);
  console.log(obj2);
  console.log('====>');

  if (!obj1) return added(obj2);

  var diffKeys = _.keys(obj1).filter(function(key) {
    if (_.isArray(obj1[key])) {

    } else  if (_.isObject(obj1[key])) {
      obj2[key] = getDiffs(obj1[key], obj2[key]);
      return false;
    }

    return obj1[key] !== obj2[key];
  });

  var changes = diffKeys.reduce(function(obj, key) {
    obj[key] = {from: obj1[key], to: obj2[key]};
    return obj;
  }, {});

  if (_.isEqual(changes, {}))
    return unchanged(obj2);

  return changed(obj2, changes);
}

/**
* Given the object it stores a copy of it and attached a method to allow us
* to track any changes made the object.
**/
module.exports.track = function(obj) {
  var original = _.clone(obj, true);

  obj.__diffs = function() {
    return getDiffs(original, this);
  };

  return obj;
}
