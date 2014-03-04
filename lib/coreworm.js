var q = require('q'),
    _ = require('lodash'),
    valid = require('./validate'),
    schemas = require('./schemas'),
    unflatten = require('./unflatten'),
    fields = require('./fields'),
    joins = require('./joins'),
    diffs = require('./diffs');

var validRelationships = valid.checker(_.isArray),
    validChildRecords = valid.checker(_.isArray),
    validRelationship = valid.checker(valid.hasKeys('maps_to', 'field'));

module.exports = function(query) {

  function deleteManyToManyRows(db, schema_name, parent_id_field, parent, insert_only) {
    if (insert_only)
      return null;

    var schema = schemas.getSchemaForModel(schema_name);
    if (!_.has(schema.fields, 'id'))
      return query.remove(db, schema.table, parent_id_field + "=$1", [parent.id]);

    return null;
  }

  function saveChildRecords(db, relationship, parent, children) {
    valid.assert(children, validChildRecords);

    var schema_name = relationship.maps_to;
    var parent_id_field = relationship.with_field;
    var insert_only = !!relationship.insert_only;
    return q(deleteManyToManyRows(db, schema_name, parent_id_field, parent, insert_only))
    .then(function() {
      return children.reduce(function(promise, child) {
        return promise.then(function() {
          child[parent_id_field] = parent.id;
          return worm.saveModel(db, schema_name, child);
        });
      }, q());
    });
  }

  function loadChildRecords(db, relationships, data) {
    valid.assert(relationships, validRelationships);

    return relationships.reduce(
      function(data, relationship) {
        valid.assert(relationship, validRelationship);

        return worm.list(db, relationship.maps_to, {where: relationship.with_field + '=$1', params: [data.id]})
        .then(
          function(children) {
            // chuck the child records into the parent
            data[relationship.field] = children;
            return data;
          });
      },
      data);
  }

  function saveChildSchema(db, relationships, data) {
    valid.assert(relationships, validRelationships);

    return relationships.reduce(function (promise, relationship) {
      valid.assert(relationship, validRelationship);
      if (relationship.with_field) {
        return promise.then(function() {
          return saveChildRecords(db,
                                  relationship,
                                  data,
                                  data[relationship.field]);
        });
      } else {
        return promise;
      }

    }, q());
  }

  function validateObject(schema, data) {
    // Validate the object
    if (schema.validator) {
      var err = schema.validator(data);
      if (valid.isError(err)) {
        console.error(JSON.stringify(err));
        console.error(JSON.stringify(data));

        return err;
      }
    }

    return null;
  }

  function getPrimaryKeyWhere(keys) {
    return keys.map(function(key, idx) {
      return key + "=$" + (idx + 1);
    }).join(" and ");
  }

  function getPrimaryKeyFields(data, keys) {
    return keys.map(function(key) {
      return data[keys];
    });
  }

  function saveData(db, schema, data) {
    var obj = fields.pickTableFields(data, schema.fields);

    if (obj.id && obj.id > 0) {
      // Update the model
      return query.update(db, schema.table, obj);
    } else {
      // Do we need to remove the existing row first?
      var promise;
      if (!_.has(schema.fields, 'id') && _.has(schema, 'primarykey')) {
        promise = query.remove(db, schema.table,
                               getPrimaryKeyWhere(schema.primarykey),
                               getPrimaryKeyFields(data, schema.primarykey));
      } else {
        promise = q();
      }

      // Insert the model
      return promise
      .then(
        function() {
          return query.insert(db, schema.table, obj, {returnId: _.has(schema.fields, "id")});
        })
      .then(
        function(result) {
          if (_.isArray(result.rows) && result.rows.length > 0)
            return result.rows[0].id;
          else
            return result;
        });
    }
  }

  /**
  * Create a new object of the type model - defaulted with fields specified in its schema
  *  and set any passed in data
  */
  function create(model, data) {
    data = data || {};
    var schema_ = schemas.getSchemaForModel(model);

    var newObj = {};
    diffs.track(newObj, model);

    // Extend with default fields from the schema and any methods
    return _.defaults(newObj,
                      _.defaults(data, schema_.fields));
  }

  /**
  * Selects the model given its id.
  *
  * Assumes the id field in the db is called id.
  */
  function get(db, model, id) {
    return worm.get_by(db, model, model + ".id=$1", [id], {fetchChildren: true});
  }

  function getsingle(db, model, id) {
    return worm.get_by(db, model, model + ".id=$1", [id], {fetchChildren: false});
  }

  function get_by(db, model, where, params, options) {
    options = options || {fetchChildren: false};

    var schema = schemas.getSchemaForModel(model);
    var joins = options.fetchChildren ? joins.joinRelationships(schema) : {fields: '*', joins: null};

    return query.select(db, schema.table, joins.fields, where, '', params, joins.joins).
    then(function(results) {
      var data = options.fetchChildren ? unflatten.unflattenResults (results, schema) : results;

      // Ensure only one result is returned
      if (data.length > 1) throw new Error('More than one ' + model + ' was returned for ' + where);
      if (data.length === 0) {
        if (options.default)
          data = [options.default];
        else
          throw new Error('No record found for ' + model + ' for ' + where);
      }

      // Mix in extra properties - methods etc.. of the object
      _.defaults(data[0], schema.fields);

      // Track changes to this object
      diffs.track(data[0], model);

      return data[0];
    });
  }

  function get_children(db, model, data) {
    var schema = schemas.getSchemaForModel(model);
    return loadChildRecords(db, schema.relationships, data);
  }

  /**
  * Returns a list of the given model.
  *
  * @param model String  - The model to list
  * @param options - { where - the where clause, orderby - the orderby }
  */
  function list(db, model, options) {

    options = options || {where: '', orderby: ''};
    var schema_ = schemas.getSchemaForModel(model);
    var joins_ = joins.joinRelationships(schema_);
    return query
    .select(db, schema_.table, joins_.fields, options.where, options.orderby, options.params, joins_.joins)
    .then(
      function(rows) {
        var results = unflatten.unflattenResults (rows, schema_);

        // track changes to the results
        _.forEach(results, function(result) { diffs.track(result, model); });

        return results;
      });
  }

  /**
  * Save the given model to the database
  *
  * @param db The database connection
  * @param model The name of the model schema we are saving
  * @param data The data to be saved
  *
  * @returns A promise that will contain the result of the save
  */
  function saveModel(db, model, data) {

    var schema = schemas.getSchemaForModel(model);
    if (_.isFunction(data.beforeSave))
      data.beforeSave();

    var err = validateObject(schema, data);
    if (err) return q.reject(err);

    return saveData(db, schema, data)
    .then(
      function(id) {
        // Save the children
        var result = (data.id && data.id > 0) ? data : _.extend(_.clone(data), {id: id});
        if (schema.relationships) {
          return saveChildSchema(db, schema.relationships, result)
          .then(
            function() {
              return result;
            });
        }
        return result;
      });
  }

  var worm = {
    create: create,
    get: get,
    getsingle: getsingle,
    get_by: get_by,
    get_children: get_children,
    list: list,
    saveModel: saveModel
  };

  return worm;
};
