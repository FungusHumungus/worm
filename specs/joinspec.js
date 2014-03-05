describe("joins", function() {

  var joins = require("../lib/joins"),
      schemas = require('../lib/schemas');

  describe("given a three level schema", function() {
    beforeEach(function() {
      var data_schema = {table: 'data',
                         fields: {id: null, field1: '', field2: '', children: []},
                         relationships: [{field: 'children', maps_to: 'child', with_field: 'data_id'}]
                        };
      var child_schema = {table: 'child',
                          primarykey: ['data_id', 'grandchild_id'],
                          fields: {data_id: null, grandchild_id: null},
                          relationships: [{field: 'grandchildren',
                                           maps_to: 'grandchild',
                                           with_fields: ['data_id', 'grandchild_id']}]};
      var grandchild_schema = {table: 'grandchild',
                               fields: {data_id: null, grandchild_id: null}};

      schemas.registerSchema(data_schema);
      schemas.registerSchema(child_schema);
      schemas.registerSchema(grandchild_schema);
    });

    afterEach(function() {
      schemas.clearSchema();
    });

    describe("when fetching the joins", function() {
      var joins_;
      beforeEach(function() {
        joins_ = joins.joinRelationships(schemas.getSchemaForModel('data')).joins;
      });

      it("should join child to data", function() {
        var expected = 'left join child on data.id=child.data_id';
        var childJoin = joins_.filter(function(j) {
          return j === expected;
        });
        expect(childJoin).toEqual([expected]);
      });

      it("should join grandchild to child", function() {
        var expected = 'left join grandchild on child.data_id=grandchild.data_id and child.grandchild_id=grandchild.grandchild_id';
        var grandchildJoin = joins_.filter(function(j) {
          return (/^left join grandchild/).exec(j);
        });

        expect(grandchildJoin).toEqual([expected]);
      });
    });
  });
});
