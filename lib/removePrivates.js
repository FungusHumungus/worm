var _ = require('lodash');

module.exports.removePrivates = function(obj) {
  return _.omit(obj, '__diffs');
};