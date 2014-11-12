var fluent_worm = require('./fluent_worm'),
    Connection = require('./connection');

module.exports = function(core) {

  return function(db, model) {
    var extend = function(obj, pormMethod) {

      obj[pormMethod] = function() {
        var dbToPass, argsToPass;
        // Check if the first param passed is a connection.
        if (arguments[0] instanceof Connection) {
          dbToPass = arguments[0];
          argsToPass = Array.prototype.splice.call(arguments, 1);
        } else {
          dbToPass = db;
          argsToPass = Array.prototype.splice.call(arguments, 0);
        }
        
        var args = [dbToPass, model].concat(argsToPass);
        return core[pormMethod].apply(core, args);
      };

      return obj;
    };

    // The model object is a function that returns a fluent object
    // This allows us to query the model fluently by calling :
    // Model().where() ... etc..
    var obj =  function() {
      return fluent_worm(obj);
    };
    
    // Create is the only method that doesn't need the db.
    obj.create = function() {
        var args =  [model].concat(Array.prototype.splice.call(arguments,0));
        return core.create.apply(core, args);
    };

    // Extend our model with the Porm methods.
    ['get_by', 'saveModel', 'list', 'get', 'getSingle'].reduce(function(obj, method) {
      return extend(obj, method);
    }, obj);

    return obj;
  };
};

