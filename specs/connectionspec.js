describe('Connection', function() {
  var Connection = require('../lib/connection');

  it ("Returns the connnection from the object passed in", function() {

    var theConnection = {};
    var db = {getConnection: function() { return theConnection; }};

    var conn = new Connection(db);

    expect(conn.getConnection()).toBe(theConnection);

  });

});
