
describe("given a schema with an insert only relationship", function() {
   var q = require('q'),
      _ = require('lodash'),
      db = {},
      schemas = require('../lib/schemas'),
      core_ = require('../lib/coreworm'),
      wormmodel_ = require('../lib/model'),
      query,
      core,
      wormmodel;

  beforeEach(function() {
    // Set up the mocks
    query = jasmine.createSpyObj('query', ['insert', 'update', 'select', 'remove']),
    core = core_(query);
    wormmodel = wormmodel_(core);
  });

  // Insert only relationships dont delete all the child records on update.
  // (Useful for logging history records)
  var db = {};
  var data_schema = {table: 'data',
                     fields: {id: null, field1: '', history: []},
                     relationships: [{field: 'history', maps_to: 'history',
                                      with_field: 'data_id', insert_only: true}]
                    };
  var child_schema = {table: 'history',
                      one_to_many: {parent_field: 'data_id'},
                      fields: {id: null, data_id: null, data:''}};

  var data, db = {};

  describe("when updating a record", function() {
    beforeEach(function() {
      query.update.andReturn(q.resolve(3));
      query.remove.andReturn(q.resolve());
      query.insert.andReturn(q.resolve(2));
      schemas.registerSchema(data_schema);
      schemas.registerSchema(child_schema);
      data = {id: 1, field1: 'ook1',
              history: [{data_id: 1, data: 'stuff grooved'},
                        {data_id: 1, data: 'stuff rocked'}]};

      core.saveModel(db, 'data', data);
    });

    afterEach(function() {
      schemas.clearSchema();
    });

    it("updates the parent table", function(done) {
      process.nextTick(function() {
        expect(query.update).toHaveBeenCalledWith(db, 'data', {id: 1, field1: 'ook1'});
        done();
      });
    });

    it("does not remove the many to many row", function(done) {
      process.nextTick(function() {
        expect(query.remove).not.toHaveBeenCalled();
        done();
      });
    });
  });
});
