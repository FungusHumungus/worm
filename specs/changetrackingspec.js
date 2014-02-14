describe("When tracking changes", function() {
  var diffs = require('../lib/diffs');

  describe("given a simple object", function() {
    var obj;

    beforeEach(function() {
      obj = {a:1, b:2};
      obj = diffs.track(obj);
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

  describe("given a heirarchical object", function() {
    var obj, changes;

    beforeEach(function() {
      obj = {a: 1, b: 2, child: {x: 1, y: 2, z: 3}};
      obj = diffs.track(obj);
    });

    describe("when the child object changes", function() {
      beforeEach(function() {
        obj.child.y = 42;
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
});
