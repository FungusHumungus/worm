/*global require:false */
var q = require('q'),
    _ = require('lodash'),
    worm_debug = process.env.WORM_DEBUG;

    var query = {};

    var getSetFromObject = function(data) {
        var sets = _.chain(_.keys(data))
                .zip(_.range(1, _.keys(data).length + 1)) // Zip the fields with their index
                .reject(function(field) { return field[0] === 'id'; }) // Reject the id field
                .map(function(field) {
                    return field[0] + '=$' + field[1].toString();
                })
                .value();

        return sets.join(",");
    };

    var runQuery =  function (db, query, params) {

        var conn = db.getConnection();

        var deferred = q.defer();
        conn.connect(function(err) {
            if (err) return deferred.reject(err);

            conn.query(query, params,
                       function(err, results) {
                           try {
                               return err ? deferred.reject(err) : deferred.resolve(results);
                           } finally {
                               conn.end();
                           }
                       });
        });

        return deferred.promise;
    };


    /**
     *
     * Runs a simple select query on a table
     *
     * @param {String} table
     * @param {String} where
     * @param {String} orderby
     * @param {Array} params
     * @return {Promise}
     *
     **/
    query.select = function(db, table, fields, where, orderby, params, joins, offset, limit) {

        var query = 'select ' + fields + ' from ' + table;
        if (joins)
          query += ' ' + joins.join(' ');

        if (where && where.length > 0)
          query += ' where ' + where;

        if (orderby)
          query += ' order by ' + orderby;

        if (offset)
          query += ' offset ' + offset;

        if (limit)
          query += ' limit ' + limit;

        if (worm_debug) {
          console.log(query);
          console.log(params);
        }

        return runQuery(db, query, params)
            .then(
                function(results) {
                    return results.rows;
                });
    };

    /**
     * Updates the given table with the data given
     *
     * @param{String} table
     * @param{Object} data
     * @return{Promise}
     */
    query.update = function(db, table, data) {

        var set = getSetFromObject(data);
        var idindex = _.indexOf(_.keys(data), "id") + 1;
        var query = 'update ' + table + ' set ' + set + ' where id=$' + idindex;
        var fields = _.values(data);

        if (worm_debug) {
          console.log(query);
          console.log(JSON.stringify(fields));
        }

        return runQuery(db, query, fields).
            then(
                function(results) {
                    return results.rows;
                });
    };

    /**
     * Deletes data that matches the where
     */
    query.remove = function(db, table, where, params) {
        var query = 'delete from ' + table + ' where ' + where;

        if (worm_debug) {
          console.log(query);
        }

        return runQuery(db, query, params);
    };

    /**
     * Inserts the data into the table
     *
     */
    query.insert = function(db, table, data, options) {
        options = options || {returnId: true};

        var keysWithoutId = _.reject(_.keys(data),
                                     function(field) {
                                         return field === 'id';
                                     });
        var fieldIndexes = _.map(_.range(1, keysWithoutId.length + 1),
                                 function(idx) {
                                     return "$" + idx;
                                 });
        var fields = _.map(keysWithoutId,
                           function(field) {
                               return data[field];
                           });

        var query = 'insert into ' + table +
                ' (' + keysWithoutId.join(',') + ') ' +
                'values (' + fieldIndexes + ') ';
        if (options.returnId)
            query += 'returning id';

        if (worm_debug) {
          console.log(query);
          console.log(JSON.stringify(fields));
        }

        return runQuery(db, query, fields);
    };

module.exports = query;
