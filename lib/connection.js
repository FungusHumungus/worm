var queries= require('./queries');

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

  /**
   * Begins a transaction on this connection
   */
  this.beginTransaction = function() {
    return queries.beginTransaction(this);
  };

  /**
   * Commits a transaction on this connection
   */
  this.commitTransaction = function() {
    return queries.commitTransaction(this);
  }

  /**
   * Rollsback a transaction on this transaction
   */
  this.rollbackTranscation = function() {
    return queries.rollbackTranscation(this);
  }

}

module.exports = Connection;
