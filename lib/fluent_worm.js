var _ = require('lodash');

/**
 *
 * Convert the object that has been build up by the fluent calls into 
 * the options object we can pass to core worm.
 *
 */
function getOptions(obj) {
  var options = {};

  // Join all the wheres together with Ands.
  // Reorder any parameters so they are sequential
  if (obj.where) {
    // Keep a running total of the param numbers
    var nextParam = 0;

    function reorderParams(where, params) {

      var updated = where.replace(/\$\d*/g, function(p) {
        // Remove the $ and convert to number
        var param = +p.slice(1) + nextParam;
        return '$' + param;

      });

      // Update the nextParam with the total number of params that were passed
      // to this where clause. The where clause may only specify a subset of these 
      // params, but they are passed to the query, so we need to take them into account
      nextParam += params.length;

      return updated;
    }

    // Join the where and the params
    var where = _.zip(obj.where, obj.params);

    options.where = where.reduce(function(where, clause) {
      var and = '';
      if (where) and  = ' AND ';

      return where + and + reorderParams(clause[0], clause[1]);
    }, '');

    options.params = _.flatten(obj.params);

  }

  if (obj.orderby) {

    options.orderby = obj.orderby.join(',');

  }

  options.default = obj.default;

  return options;
}


var fluent_worm = function(model) {

  var obj = {},
      fluent_obj;

  function fluent(fn) {
    return function(/*arguments*/) {
      fn.apply(fluent_obj, Array.prototype.slice.call(arguments, 0));
      return fluent_obj;
    }
  }


  fluent_obj = {

    /**
     *
     * Choose the where clause for our query.
     * Can be called multiple times. Each clause in concatenated using AND
     *
     * @param criteria The where clause.
     * @param params Any parameters to be passed to the query.
     *
     */
    where: fluent(function(criteria, params) {

      obj.where = obj.where || [];
      obj.params = obj.params || [];

      obj.where.push(criteria);

      params = params || [];
      if (!_.isArray(params))
        params = [params];

      // Make sure an empty params is pushed if none is specified
      obj.params.push(params); 

    }), 

    /**
     *
     * Select any ordering. Can be called multiple times.
     *
     */
    orderby: fluent(function(criteria) {

      obj.orderby = obj.orderby || [];

      obj.orderby.push(criteria);

    }),

    /**
     *
     * Sets a default object to be returned when getSingle fails to find
     * a suitable row.
     *
     * Should only be called once. Multiple calls will overwrite any 
     * previous calls.
     *
     */
    default: fluent(function(def) {

      obj.default = def;

    }),

    /**
     *
     * Executes the query and returns multiple items.
     *
     */
    list: function() {
      return model.list(getOptions(obj));
    },

    /**
     *
     * Executes the query and returns a single item.
     * If more than one row is returned, an exception is thrown.
     *
     */
    get_single: function( ){
      return model.get_by(getOptions(obj));
    }


  };

  return fluent_obj;

}

module.exports = fluent_worm;
