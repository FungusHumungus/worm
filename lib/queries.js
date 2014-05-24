/*global require:false */
var q = require('q'),
    _ = require('lodash'),
    worm_debug = process.env.WORM_DEBUG;

    var query = {};

    function getSetFromObject(data) {
        var sets = _.chain(_.keys(data))
                .zip(_.range(1, _.keys(data).length + 1)) // Zip the fields with their index
                .reject(function(field) { return field[0] === 'id'; }) // Reject the id field
                .map(function(field) {
                    return field[0] + '=$' + field[1].toString();
                })
                .value();

        return sets.join(",");
    };

    function runQuery(db, query, params) {

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
    }

    /**
     *
     * If we specify a limit or offset in a select we want to limit the number
     * of main records that are fetched and not that actually number of rows.
     *
     * If we fetch a record that has two child records, because we are fetching it
     * all in one join, we will actually return two rows which would mess up our 
     * offset count.
     *
     * This method sticks a limit on the main table:
     *
     * select ook 
     * from (select * from plonk limit 10 offset 3) as plonk
     * left join etc...
     *
     * TODO : It sticks the where clause in here as well.
     *        We are going to have to filter out only the parts of the where 
     *        that apply to the main table - not easy...
     *
     **/
    function limitTable(table, where, offset, limit) {
      var select = "(select * from " + table;

      if (where)
        select += " where " + where;

      if (offset)
        select += " offset " + offset;

      if  (limit)
        select += " limit " + limit;

      select += ") as " + table;

      return select;
    }

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

        if (offset || limit) {
          table = limitTable(table, where, offset, limit);
        }

        var query = 'select ' + fields + ' from ' + table;
        if (joins)
          query += ' ' + joins.join(' ');

        if (where && where.length > 0)
          query += ' where ' + where;

        if (orderby)
          query += ' order by ' + orderby;

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
