describe("When tracking changes", function() {
  var diffs = require('../lib/diffs');

  describe("given an object that doesn't change", function() {
    it("returns an empty object", function() {
      var obj = {a:1, b:2};
      obj = diffs.track(obj);

      expect(obj.__diffs()).toEqual({});
    });
  });
});
