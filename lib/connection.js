/**
 *
 * Constructor to create a new connection to 
 * the database.
 *
 */
function Connection(db) {

  var connection = db.getConnection();

  /**
   * Returns the connection object
   */
  this.getConnection = function() {
    return connection;
  };

}

module.exports = Connection;
