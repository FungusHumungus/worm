describe("Unflattening", function() {
  var _ = require('lodash'),
      unflatten = require('../lib/unflatten'),
      schemas = require('../lib/schemas');


  describe("Given a model with a one to many child relationship", function() {
    var db = {};
    var data_schema = {table: 'data',
                       fields: {id: null, field1: '', field2: '', children: []},
                       relationships: [{field: 'children', maps_to: 'child', with_field: 'data_id'}]
                      };
    var child_schema = {table: 'child',
                        fields: {id: null, data_id:'', ook1: '', beuseful: function() { return 'ook'; }}};

    describe("when unflattening the results", function() {
      var data;

      beforeEach(function() {
        schemas.registerSchema(data_schema);
        schemas.registerSchema(child_schema);
        var results = [
          {data_id: 1, data_field1: 'ook1', data_field2: 'ook2', child_id: 1, child_data_id: 1, child_ook1: 'childook1'},
          {data_id: 1, data_field1: 'ook1', data_field2: 'ook2', child_id: 2, child_data_id: 1, child_ook1: 'childook2'}];

        data = unflatten.unflattenResults(results, data_schema);
      });

      afterEach(function() {
        schemas.clearSchema();
      });

      it ("returns the main table", function() {
        expect(data.length).toEqual(1);
        expect(_.pick(data[0], 'id', 'field1', 'field2')).toEqual({id: 1, field1: 'ook1', field2: 'ook2'});
      });

      it("returns the child tables as a property", function() {
        expect(data[0].children.length).toEqual(2);
        expect(data[0].children[0]).toEqual({id: 1, data_id: 1, ook1: 'childook1', beuseful: jasmine.any(Function)});
        expect(data[0].children[1]).toEqual({id: 2, data_id: 1, ook1: 'childook2', beuseful: jasmine.any(Function)});
      });

      it("adds in the child tables methods", function() {
        expect(data[0].children[0].beuseful).toBeDefined();
        expect(data[0].children[0].beuseful()).toEqual('ook');
        expect(data[0].children[1].beuseful()).toEqual('ook');
      });
    });

    describe("when unflattening the results and there is no child data", function() {
      var data;

      beforeEach(function() {
        schemas.registerSchema(data_schema);
        schemas.registerSchema(child_schema);
        var results = [
          {data_id: 1, data_field1: 'ook1', data_field2: 'ook2', child_id: null, child_data_id: null, child_ook1: null}];

        data = unflatten.unflattenResults(results, data_schema);
      });

      afterEach(function() {
        schemas.clearSchema();
      });

      it("returns an empty child table", function() {
        expect(data[0].children.length).toEqual(0);
      });
    });

  });


  describe("Given a schema with several levels of heirarchy", function() {

    var db = {};
    var data_schema = {table: 'data',
                       fields: {id: null, field1: '', field2: '', children: []},
                       relationships: [{field: 'children', maps_to: 'child', with_field: 'data_id'}]
                      };
    var child_schema = {table: 'child',
                        many_to_many: {parent_field: 'data_id',
                                       child_field: 'grandchild_id'
                                      },
                        fields: {data_id: null, grandchild_id: null},
                        relationships: [{field: 'grandchildren', maps_to: 'grandchild', with_our_field: 'grandchild_id'}]};
    var grandchild_schema = {table: 'grandchild',
                             fields: {id: null, ook1: ''}};
    var data, db = {};

    describe("when unflattening the results", function() {
      var data;

      beforeEach(function() {
        schemas.registerSchema(data_schema);
        schemas.registerSchema(child_schema);
        schemas.registerSchema(grandchild_schema);
        var rows = [{data_id: 1, data_field1: 'ook1', data_field2: 'ook2',
                     child_data_id: 1, child_grandchild_id: 2,
                     grandchild_id: 2, grandchild_ook1: 'onk'},
                    {data_id: 1, data_field1: 'ook1', data_field2: 'ook2',
                     child_data_id: 1, child_grandchild_id: 3,
                     grandchild_id: 3, grandchild_ook1: 'onk2'}];

        data = unflatten.unflattenResults(rows, data_schema);
      });

      afterEach(function() {
        schemas.clearSchema();
      });

      it("create the correct records structure", function() {
        expect(data).toEqual([{id: 1, field1: 'ook1', field2: 'ook2',
                               children: [{data_id: 1, grandchild_id: 2,
                                           grandchildren: {id: 2, ook1: 'onk'}},
                                          {data_id: 1, grandchild_id: 3,
                                           grandchildren: {id: 3, ook1: 'onk2'}}]}]);

      });
    });
  });
});