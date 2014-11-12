var q = require('q'),
    _ = require('lodash'),
    curry = _.curry,
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

    // Returns a function that always returns the given value
    function always(value) {
        return function() {
            return value;
        };
    }

    /**
     *
     * Delete all the rows child rows that are marked as cacade-delete
     *
     * TODO : In an ideal world we wouldn't delete them all and then reinsert,
     *  Really we should be tracking the changes we are saving and then deleting any
     *  deleted records and updating any changed onces.
     *
     **/
    function deleteChildRows(db, schema_name, parent_id_fields, child_id_fields,
                             parent, children,
                             insert_only, cascade_delete) {
        
        if (insert_only)
            return q();

        if (cascade_delete) {
            var schema = schemas.getSchemaForModel(schema_name);
            var where = getFieldsWhere(parent_id_fields);
            var params = getFieldsData(parent, child_id_fields);

            return query
                .remove(db, schema.table, where, params)
                .then(function(res) {

                    if (_.has(schema.fields, 'id')) {
                        // Clear out the childrens id's since they have now been deleted.
                        children.forEach(function(child) {
                            child.id = null;
                        });
                    }

                    return res;
                });
        }

        return q();
    }

    /**
     * 
     * Saves the child records defined by the given relationship
     * 
     * @returns Promise
     *
     **/
    function saveChildRecords(db, relationship, parent, children) {

        var schema_name = relationship.maps_to;
        var parent_id_fields = relationship.with_fields || [relationship.with_field];
        var child_id_fields = relationship.with_fields || ['id'];
        var insert_only = !!relationship.insert_only;
        var cascade_delete = relationship.cascade_delete;

        return deleteChildRows(db, schema_name, parent_id_fields, child_id_fields,
                               parent, children,
                               insert_only, cascade_delete)
            .then(function() {
                
                return children.reduce(function(promise, child) {
                    return promise.then(function() {
                        // Update the child table to point to the parent row
                        for (var idx=0; idx < parent_id_fields.length; idx++)
                            child[parent_id_fields[idx]] = parent[child_id_fields[idx]];

                        return saveModel(db, schema_name, child);
                    });
                }, q());
            });
    }

    function loadChildRecords(db, relationships, data) {
        valid.assert(relationships, validRelationships);

        return relationships.reduce(
            function(data, relationship) {
                valid.assert(relationship, validRelationship);

                return list(db, relationship.maps_to, {where: relationship.with_field + '=$1', params: [data.id]})
                    .then(
                        function(children) {
                            // chuck the child records into the parent
                            data[relationship.field] = children;
                            return data;
                        });
            },
            data);
    }

    /**
     *
     * Saves the data according to the given relationships
     * 
     * @returns Promise
     *
     **/
    function saveChildSchema(db, relationships, data) {
        valid.assert(relationships, validRelationships);

        // Save each relationship in sequence. (TODO: Could this be done in parallel?)
        return relationships.reduce(function (promise, relationship) {
            valid.assert(relationship, validRelationship);

            if (relationship.with_field || relationship.with_fields) {
                if (!data[relationship.field])
                    return promise;

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


    /**
     *
     * Validate the object
     *
     **/
    function validateObject(schema, data) {
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

    /**
     *
     * Takes a list of fields and returns a string to be used in a where clause:
     *  field1=$1 and field2=$2 and field3=$3
     *
     *  @returns String
     *
     **/
    function getFieldsWhere(fields) {
        return fields.map(function(field, idx) {
            return field + "=$" + (idx + 1);
        }).join(" and ");
    }

    /**
     *
     * Returns an array of the data held in the objects given fields.
     *
     * @returns Array
     *
     **/
    function getFieldsData(data, keys) {
        return keys.map(function(key) {
            return data[key];
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
                                       getFieldsWhere(schema.primarykey),
                                       getFieldsData(data, schema.primarykey));
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
     *
     * Create a new object of the type model - defaulted with fields specified in its schema
     *  and set any passed in data
     *
     **/
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
     *
     * Selects the model given its id.
     *
     * Assumes the id field in the db is called id.
     *
     **/
    function get(db, model, id) {
        return get_by(db, model, {where: model + ".id=$1", params: [id], fetchChildren: true});
    }

    /**
     *
     * Selects the model given its id.
     *
     * Does not fetch any child records.
     *
     */
    function getsingle(db, model, id) {
        return get_by(db, model, {where: model + ".id=$1", params: [id], fetchChildren: false});
    }

    function get_by(db, model, options) {

        return list(db, model, options)
            .then(function(results) {

                // Ensure only one result is returned
                if (results.length > 1) 
                    throw new Error('More than one ' + model + ' was returned for ' + where);

                if (results.length === 0) {
                    if (options.default)
                        results = [options.default];
                    else
                        throw new Error('No record found for ' + model + ' for ' + options.where);
                }

                return results[0];
            });
    }

    function get_children(db, model, data) {
        var schema = schemas.getSchemaForModel(model);
        return loadChildRecords(db, schema.relationships, data);
    }

    /**
     *
     * Return the single count value fetched from doing a count.
     *
     **/
    function processCount(result) {
        return result[0].count;
    }

    function mixinRelationships(schema, data) {
        var mixed = _.defaults(data, schema.fields);

        console.log(schema);

        return (schema.relationships || []).reduce(function(obj, relationship) {

            var childSchema = schemas.getSchemaForModel(relationship.maps_to);
            obj[relationship.field] = obj[relationship.field].map(function(child) {
                return mixinRelationships(childSchema, child);
            });

            return obj;
        }, mixed);
    }

    /**
     *
     * Adds a $update method to the row which allows us to update model data with a javascript object.
     * This method takes care to make sure all model mixin methods are added in.
     *
     **/
    function addUpdateToRow(schema, row) {

        row.$update = function(newData) {
            var updated = _.extend(row, newData);

            // Now add all the mixins 
            return mixinRelationships(schema, updated);
        }.bind(row);

    }

    /**
     *
     * After fetching the rows using list, we want to :
     *
     * add any default values
     * start tracking for any changes
     *
     */
    var processRows = curry(function (options, model, rows) {
        var schema = schemas.getSchemaForModel(model);
        var results = options.fetchChildren ? unflatten.unflattenResults (rows, schema) : rows;

        results.forEach(function(result) { 
            // Mix in extra properties - methods etc.. of the object
            _.defaults(result, schema.fields);

            // Add the __update function.
            addUpdateToRow(schema, result);
            
            // track changes to the results
            diffs.track(result, model); 

            // Track if no children have been fetched, so we don't wipe them out when saving
            if (!options.fetchChildren)
                result.__no_children = true;
        });

        return results;
    });

    /**
     *
     * Returns a list of the given model.
     *
     * @param model String  - The model to list
     * @param options - { where - the where clause, orderby - the orderby }
     *
     **/
    function list(db, model, options) {

        options = _.defaults(options || {}, {where: '', 
                                             orderby: '', 
                                             fetchChildren: true, 
                                             count: false});

        var schema_ = schemas.getSchemaForModel(model);
        var joins_ = options.fetchChildren ? joins.joinRelationships(schema_) : {fields: '*', joins: null};

        var afterSelect;

        if (options.count) {
            // If we just want to count, override the fields to fetch
            joins_.fields = 'count(*)';
            
            // Process the single number returned
            afterSelect = processCount;
        } else {
            afterSelect = processRows(options, model);
        }

        return query
            .select(db, 
                    schema_.table, 
                    joins_.fields, 
                    options.where, 
                    options.orderby, 
                    options.params, 
                    joins_.joins,
                    options.offset,
                    options.limit)
            .then(afterSelect);
    }

    /**
     *
     * Save the given model to the database
     *
     * @param db The database connection
     * @param model The name of the model schema we are saving
     * @param data The data to be saved
     *
     * @returns A promise that will contain the result of the save
     *
     **/
    function saveModel(db, model, data) {

        var schema = schemas.getSchemaForModel(model);
        if (_.isFunction(data.beforeSave))
            data.beforeSave();

        var err = validateObject(schema, data);
        if (err) return q.reject(err);

        return saveData(db, schema, data).then(curry(saveChildren)(db, schema, data));
    }


    /**
     *
     * Saves the children of the data based on its schemas relationships.
     *
     * @returns a promise that will resolve to the makin entity (with the id fill in if inserting)
     *
     **/
    function saveChildren(db, schema, data, id) {

        var result = (data.id && data.id > 0) ? data : _.extend(_.clone(data), {id: id});

        if (!data.__no_children && schema.relationships)
            return saveChildSchema(db, schema.relationships, result).then(always(result));

        return result;
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
