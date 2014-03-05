var fields = require('./fields'),
    _ = require('lodash'),
    schemas = require('./schemas');

/**
  * Recursively get all relationships this schema has
  */
function getAllRelationships(schema) {
  if (!schema.relationships || schema.relationships.length === 0)
    return null;

  return schema.relationships.reduce(function(all, relationship) {

    var childSchema = schemas.getSchemaForModel(relationship.maps_to);
    all.push({schema: schema, relationship: relationship});
    all.push.apply(all, getAllRelationships(childSchema));

    return all;

  }, []);
}

function getSingleFieldJoin(table, relationship) {
  var join = 'left join ' + relationship.maps_to + ' on ';
  return [join,
          table, '.id=',
          relationship.maps_to, '.', relationship.with_field].join('');
}

function getMultipleFieldJoins(table, relationship) {
  var join = 'left join ' + relationship.maps_to + ' on ';
  // Both tables currently have to have exactly the same field names.
  return join +
    relationship.with_fields.map(function(fieldname) {
      return table + '.' + fieldname + '=' + relationship.maps_to + '.' + fieldname;
    }).join(' and ');
}

function getManyToOneJoin(table, relationship) {
  var join = 'left join ' + relationship.maps_to + ' on ';
  return [join,
          table, '.', relationship.with_our_field,
          '=',
          relationship.maps_to, '.id'].join('');
}

/**
* Gets the join text from the relationship
*/
function getJoinFromRelationship(relationship) {
  var schema=relationship.schema;
  if (relationship.relationship.with_field)
    return getSingleFieldJoin(schema.table, relationship.relationship);
  else if (relationship.relationship.with_fields)
    return getMultipleFieldJoins(schema.table, relationship.relationship);
  else
    return getManyToOneJoin(relationship.schema.table, relationship.relationship);
}

/**
* Get the joins and extra fields required to select any relationships for this schema.
*/
function joinRelationships(schema) {
  var select = fields.getFieldsFromSchema(schema),
      relationships = getAllRelationships(schema),
      joins;

  if (relationships) {
    // Remove any relationships that are insert_only. These are not for selecting.
    var relationships_ = relationships.filter(function(relationship) {
      return !relationship.relationship.insert_only;
    });

    // Get the joins
    joins = relationships_.map(getJoinFromRelationship);

    // Add the child fields to the field list
    select += ',' +
      relationships_.map(function(relationship) {
        var childSchema = schemas.getSchemaForModel(relationship.relationship.maps_to);
        return fields.getFieldsFromSchema(childSchema);
      }).join(',');
  }

  return {fields: select, joins: joins};
}

exports.joinRelationships = joinRelationships;
