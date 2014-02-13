/*global jasmine: false, describe: false, it: false, expect: false, beforeEach: false, afterEach: false,
 runs: false, waitsFor: false, process: false, require: false*/

describe('Postgres queries', function() {

    var createMockDB = function() {
        var db = jasmine.createSpyObj('db', ['getConnection']);
        var conn = jasmine.createSpyObj('conn', ['connect', 'query']);
        conn.connect.andCallFake(function(cb) {
            // Call connect callback with no errors
            cb();
        });

        db.getConnection.andReturn(conn);

        return {db: db, conn: conn};
    };

    var query = require('../lib/queries');

    describe("Select query", function() {
        it ('should create a decent select query with basic fields', function() {
            var db = createMockDB();
            query.select(db.db, 'ooktable', '*', 'onk=$1', 'ponk', [1]);

            expect(db.conn.query).toHaveBeenCalledWith('select * from ooktable where onk=$1 order by ponk', [1], jasmine.any(Function));
        });

        it ('should add in the required joins', function() {
            var db = createMockDB();
            query.select(db.db, 'ooktable', 'onk, bonk', null, null, null,
                           ['left join sporg on sporg.onk = ooktable.bonk',
                            'inner join onk on onk.arg = sporg.porg']);

            expect(db.conn.query).toHaveBeenCalledWith('select onk, bonk ' +
                                                       'from ooktable ' +
                                                       'left join sporg on sporg.onk = ooktable.bonk ' +
                                                       'inner join onk on onk.arg = sporg.porg',
                                                       null, jasmine.any(Function));
        });
    });

    describe("Update query", function() {
        it ('should create a decent update query with basic fields', function() {
            var db = createMockDB();
            query.update(db.db, 'randomtable', {id: 1, arf: 'arf', bonk: 32});

            expect(db.conn.query).toHaveBeenCalledWith("update randomtable set arf=$2,bonk=$3 where id=$1",
                                                       [1, 'arf', 32], jasmine.any(Function));
        });

        it ('should create a decent update query with date fields', function() {
            var db = createMockDB();
            query.update(db.db, 'sometable', {id: 333, donk: new Date(2013, 11, 07, 12, 03)});

            expect(db.conn.query).toHaveBeenCalledWith("update sometable set donk=$2 where id=$1",
                                                       [333, new Date(2013, 11, 07, 12, 03)], jasmine.any(Function));
        });

        it('should get the correct index of the id field', function() {
            var db = createMockDB();
            query.update(db.db, 'randomtable', {arf: 'arf', id: 1, bonk: 32});

            expect(db.conn.query).toHaveBeenCalledWith("update randomtable set arf=$1,bonk=$3 where id=$2",
                                                       ['arf', 1, 32], jasmine.any(Function));
        });
    });

    describe("Insert queries", function() {
        it("should create a nice query", function() {
            var db = createMockDB();
            query.insert(db.db, "ongo", {id: 0, ook: "spork", spongle: 2});

            expect(db.conn.query).toHaveBeenCalledWith("insert into ongo (ook,spongle) values ($1,$2) returning id",
                                                       ['spork', 2], jasmine.any(Function));
        });
    });

    describe("Delete queries", function() {
        it("Should create a good delete query", function() {
            var db = createMockDB();
            query.remove(db.db, "ongo", "parent_id = $1", [43]);

            expect(db.conn.query).toHaveBeenCalledWith("delete from ongo where parent_id = $1",
                                                       [43], jasmine.any(Function));
        });
    });
});
