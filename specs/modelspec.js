describe("Models", function() {

  var model = require('../lib/model'),
      Connection = require('../lib/connection');

  it("Passes on the get call with default db and model", function() {

    var core = jasmine.createSpyObj('core', ['get']);
    var db = {};

    var groovin = model(core)(db, 'groovin');

    // Call with params
    groovin.get(1,2,3);

    expect(core.get).toHaveBeenCalledWith(db, 'groovin', 1, 2, 3);
  });

  it("Passed on the get call with passed db", function() {
    var core = jasmine.createSpyObj('core', ['get']);
    var defaultdb = {getConnection: function() { return {}; }};
    var db = new Connection(defaultdb);

    var groovin = model(core)(defaultdb, 'groovin');

    // Call with a db connection and some params
    groovin.get(db, 1,2,3);

    expect(core.get).toHaveBeenCalledWith(db, 'groovin', 1, 2, 3);
  });


});
