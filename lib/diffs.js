var _ = require('lodash');

function getDiffs(obj1, obj2) {
  if (!obj1) return obj2;

  var diffKeys = _.keys(obj1).filter(function(key) {
    return obj1[key] !== obj2[key];
  });

  return diffKeys.reduce(function(obj, key) {
    obj[key] = {from: obj1[key], to: obj2[key]};
    return obj;
  }, {});
}

/**
* Given the object it stores a copy of it and attached a method to allow us
* to track any changes made the object.
**/
module.exports.track = function(obj) {
  var original = _.clone(obj);

  obj.__diffs = function() {
    return getDiffs(original, this);
  };

  return obj;
}