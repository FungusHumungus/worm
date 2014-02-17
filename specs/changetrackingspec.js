describe("When tracking changes", function() {
  var diffs = require('../lib/diffs'),
      schemas = require('../lib/schemas'),
      removePrivates = require('../lib/removePrivates').removePrivates;

  describe("given a simple object", function() {
    var obj;

    beforeEach(function() {
      schemas.registerSchema({table: 'obj',
                              fields: {a:null, b: null}});
      obj = {a:1, b:2};
      obj = diffs.track(obj, 'obj');
    });

    afterEach(function() {
      schemas.clearSchema();
    });

    it("when it doesn't change it returns an empty object", function() {
      expect(obj.__diffs()).toEqual({status: 'unchanged', obj: {a:1, b:2}});
    });

    it("when it does change it returns the changes", function() {
      obj.b = 4;
      expect(obj.__diffs()).toEqual({status: 'changed',
                                     obj: {a:1, b:4},
                                     change: {b: {from: 2, to: 4}}});
    });
  });

  describe("given a one to one object", function() {
    var obj, changes;

    beforeEach(function() {
      schemas.registerSchema({table: 'obj',
                              fields: {a:null, b: null, child:{}},
                              relationships: [{field: 'child', maps_to:'child'}]});

      schemas.registerSchema({table: 'child',
                              fields: {x: null, y: null, z: null},
                              primarykey: ['x']});

      obj = {a: 1, b: 2, child: {x: 1, y: 2, z: 3}};
      obj = diffs.track(obj, 'obj');
    });

    afterEach(function() {
      schemas.clearSchema();
    });

    describe("when the child object changes", function() {
      beforeEach(function() {
        obj.child.y = 42;
        debugger;
        changes = obj.__diffs();
      });

      it ("returns the parent object as unchanged", function(){
        expect(changes.status).toEqual('unchanged');
      });

      it("returns the child object as changed", function() {
        expect(changes.obj.child).toEqual({status: 'changed',
                                         obj: {x:1, y: 42, z: 3},
                                         change: {y: {from: 2, to: 42}}});
      });
    });
  });

  describe("given a one to many object", function() {
    var obj, changes;

    beforeEach(function() {
      schemas.registerSchema({table:'obj',
                              fields: {id: null, b: null, children: []},
                              relationships: [ {field: 'children', maps_to: 'child'}]});
      schemas.registerSchema({table:'child',
                              fields: {parentId: null, childId: null, x: null},
                              primarykey: ['parentId', 'childId']});

      obj = {id: 1, b: 2, children: [{parentId: 1, childId: 1, x: 1},
                                     {parentId: 1, childId: 2, x: 32}]};

      obj = diffs.track(obj, 'obj');
    });

    describe("when a child object changes", function() {
      beforeEach(function() {
        obj.children[1].x = 42;
        changes = obj.__diffs();
      });

      it("returns the first child object as not being changed", function() {
        expect(changes.obj.children[0]).toEqual({status: 'unchanged', obj: {parentId: 1, childId: 1, x: 1}});
      });

      it("returns the child object as changed", function() {
        expect(changes.obj.children[1]).toEqual({status: 'changed',
                                                 obj: {parentId: 1, childId: 2, x: 42},
                                                 change: {x: {from: 32, to: 42}}});
      });

      it("doesn't mutate the object", function() {
        expect(removePrivates(obj)).toEqual({id: 1, b:2, children:[{parentId: 1, childId: 1, x: 1},
                                                                   {parentId: 1, childId: 2, x: 42}]});
      });
    });
  });
});
