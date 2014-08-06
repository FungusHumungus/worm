/*global jasmine: false, describe: false, it: false, expect: false, beforeEach: false, afterEach: false,
 runs: false, waitsFor: false, process: false, require: false*/

describe ("Worm", function() {
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
    query = jasmine.createSpyObj('query', ['insert', 'update', 'select', 'remove']);
    core = core_(query);
    wormmodel = wormmodel_(core);
  });

  describe("given an invalid schema", function() {

    it("raises an error", function() {
            // Missing fields
            expect(function() { schemas.registerSchema( {table:''} ); }).toThrow();

            // Incorrect field type
            expect(function() { schemas.registerSchema( {table:'', fields:8} ); }).toThrow();

            // Relationships are incorrect type
            expect(function() { schemas.registerSchema( {table:'', fields:{}, relationships: {}}); }).toThrow();
    });
  });

  describe("given a simple schema", function() {

        var schema = {table: 'data',
                      fields: {id: null, field1: 'onk', field2: ''}
                     };
        var model;

        beforeEach(function() {
            schemas.registerSchema(schema);
            model = wormmodel(db, 'data');
        });

        afterEach(function() {
            schemas.clearSchema();
        });

        describe("when creating the model", function() {
            var data;
            beforeEach(function() {
                data = model.create({field2: 'ook'});
            });

            it("creates a model with the required fields", function() {
              expect(data).toEqual({id: null, field1: 'onk', field2: 'ook', __diffs: jasmine.any(Function)});
            });
        });

        describe("when calling list on the model", function () {

            it("selects from the correct table", function() {
                query.select.andReturn(q());
                model.list();
                expect(query.select).toHaveBeenCalledWith(db, 'data',
                                                          'data.id as data_id,data.field1 as data_field1,data.field2 as data_field2',
                                                          '', '', 
                                                          undefined, undefined,
                                                          undefined, undefined);
            });

            it("passes the correct where clause", function() {
                query.select.andReturn(q());
                model.list({where: "field1 = 'spong'", orderby: 'field2'});
                expect(query.select).toHaveBeenCalledWith(db, 'data',
                                                          'data.id as data_id,data.field1 as data_field1,data.field2 as data_field2',
                                                          "field1 = 'spong'", 'field2', 
                                                          undefined, undefined,
                                                          undefined, undefined);
            });

            it("refactors the returned field names to remove the table name", function() {
                var result;
                runs(function() {
                  query.select.andReturn(q.resolve([{data_id: 3, data_field1: 'onk', data_field2: 'splonk'}]));

                  model.list().then(function(r) { result = r; }, function(err) { console.log(err); });
                });

                waitsFor(function() {
                    return result;
                });

                runs(function() {
                    expect(result.length).toEqual(1);
                  expect(result[0]).toEqual({id: 3, field1: 'onk', field2: 'splonk', __diffs: jasmine.any(Function)});
                });
            });
        });

        describe("when calling get", function() {
            it("selects the correct model", function() {
                query.select.andReturn(q());
                core.getsingle(db, 'data', 5);
                expect(query.select).toHaveBeenCalledWith(db,
                                                          'data',
                                                          '*',
                                                          'data.id=$1', '', [5], null,
                                                          undefined, undefined);
            });

            it("lets you select with other criteria as well", function() {
                query.select.andReturn(q());
                core.get_by(db, 'data', {where: "field1 = $1", params:['onk'], fetchChildren: false});
                expect(query.select).toHaveBeenCalledWith(db, 'data',
                                                          '*',
                                                          'field1 = $1', '', ['onk'], null,
                                                          undefined, undefined);
            });
        });

        describe("when saving a model with no Id", function() {
            var result, data;

            beforeEach(function() {
                // Inserting returns 33 as the new id
                query.insert.andReturn(q.resolve(33));

                data = {field1: 'data1', field2: 'data2'};
                result = core.saveModel(db, 'data', data);
            });

            it("should insert", function() {
                process.nextTick(function() {
                    expect(query.insert).toHaveBeenCalledWith(db, 'data', data, {returnId: true});
                });
            });

            it("should return the records with the new id in a promise", function() {
                var test;
                runs(function() {
                    result.then(function(id) {
                        test = id;
                    });
                });

                waitsFor(function() {
                    return test;
                });

                runs(function() {
                    expect(test).toEqual({id: 33, field1: 'data1', field2: 'data2'});
                });
            });
        });

        describe("when saving a model with an id", function() {
            var data;

            beforeEach(function() {
                data = {id: 33, field1: 'data', extraneousRubbish: 'naanaaanaaaa'};
                query.update.andReturn(q.resolve(33));

                core.saveModel(db, 'data', data);
            });

            it("should update", function(done) {
                process.nextTick(function() {
                  expect(query.update).toHaveBeenCalled();
                  done();
                });
            });

            it("should only update fields from the schema", function(done) {
                process.nextTick(function() {
                  expect(query.update).toHaveBeenCalledWith(db, 'data', {id: 33, field1: 'data'});
                  done();
                });
            });
        });
    });

    describe("Given a model with a one to many child relationship", function() {
        var db = {};
        var data_schema = {table: 'data',
                           fields: {id: null, field1: '', field2: '', children: []},
                           relationships: [{field: 'children', maps_to: 'child', with_field: 'data_id'}]
                          };
        var child_schema = {table: 'child',
                            fields: {id: null, data_id:'', ook1: '', beuseful: function() { return 'ook'; }}};

        describe("when calling list", function() {
            beforeEach(function() {
                var data = {data_id: 1, data_field1: 'ook', data_field2: 'ponk',
                            child_id: 2, child_data_id: 1, child_ook1: 'erkle'};
                query.select.andReturn(q.resolve([data]));
                schemas.registerSchema(data_schema);
                schemas.registerSchema(child_schema);
            });

            afterEach(function() {
                schemas.clearSchema();
            });

            it('calls with the correct joins', function() {
                core.list({}, 'data');
                expect(query.select)
                    .toHaveBeenCalledWith({}, 'data',
                                          'data.id as data_id,data.field1 as data_field1,data.field2 as data_field2,child.id as child_id,child.data_id as child_data_id,child.ook1 as child_ook1',
                                          '', '', undefined,
                                          ['left join child on data.id=child.data_id'],
                                          undefined, undefined);
            });
        });

        describe("when calling get", function() {
            var result, data;

            beforeEach(function() {
                data = {id: 5, field1: 'yay', 'field2': 'boo'};
                query.select.andReturn(q.resolve([data]));
                schemas.registerSchema(data_schema);
                schemas.registerSchema(child_schema);
            });

            afterEach(function() {
                schemas.clearSchema();
            });

            it('lets you only fetches the main record', function() {
                result = core.getsingle(db, 'data', 5);
                expect(query.select).toHaveBeenCalledWith(db, 'data', '*', 
                                                          'data.id=$1', '', [5], null,
                                                          undefined, undefined);
            });

            it('lets you fetch the child records', function() {
                core.get_children(db, 'data', data);
                expect(query.select).toHaveBeenCalledWith(db, 'child',
                                                          'child.id as child_id,child.data_id as child_data_id,child.ook1 as child_ook1',
                                                          'data_id=$1', '', [5], undefined,
                                                          undefined, undefined);
            });
        });

        describe("when saving a model with no ids", function() {
            var result, data;

            beforeEach(function() {
                // Inserting returns 33 as the new id
                query.insert.andReturn(q.resolve(33));
                schemas.registerSchema(data_schema);
                schemas.registerSchema(child_schema);

                data = {field1: 'data1', field2: 'data2', children:[{ook1: 'doto1'}]};
                result = core.saveModel(db, 'data', data).catch(function(err){
                  console.log(err.toString());
                });
            });

            afterEach(function() {
                schemas.clearSchema();
            });

            it("should insert the parent record", function(done) {
              process.nextTick(function() {
                expect(query.insert).toHaveBeenCalledWith(db, 'data', {field1: 'data1', field2: 'data2'}, {returnId: true});
                done();
              });
            });

            it("should insert the child record with the parents id", function(done) {
              process.nextTick(function() {
                expect(query.insert).toHaveBeenCalledWith(db, 'child', {ook1: 'doto1', data_id:33}, {returnId: true});
                done();
              });
            });
        });

        describe("when the save fails", function() {

            var result, data;
            beforeEach(function() {
                try {
                    // Inserting returns 33 as the new id
                    query.insert.andCallFake(function(db, schema){
                        if (schema === 'data') {
                            // parent insert passes
                            return q.resolve(33);
                        } else {
                            // child insert fails
                            return q.reject("failed");
                        }
                    });

                    schemas.registerSchema(data_schema);
                    schemas.registerSchema(child_schema);

                    data = {field1: 'data1', field2: 'data2', children:[{ook1: 'doto1'}]};
                  console.log('saving fail');
                    result = core.saveModel(db, 'data', data);
                } catch(ex) {
                    console.log('Error when save fails : ' + ex.toString());
                }
            });

            afterEach(function() {
                schemas.clearSchema();
            });

            it("should reject the promise", function() {
                var passed = false, failed = false;
                runs(function() {
                    result.then(function() { passed = true; })
                          .catch(function() { failed = true; });
                });

                waitsFor(function() {
                    return passed || failed;
                });

                runs(function() {
                    expect(failed).toEqual(true);
                    expect(passed).toEqual(false);
                });
            });
        });
    });

    describe("Given a schema with several levels of heirarchy", function() {

        var db = {};
        var data_schema = {table: 'data',
                           fields: {id: null, field1: '', field2: '', children: []},
                           relationships: [{field: 'children', maps_to: 'child', with_field: 'data_id', cascade_delete: true}]
                          };
        var child_schema = {table: 'child',
                            primarykey: ['data_id', 'grandchild_id'],
                            fields: {data_id: null, grandchild_id: null},
                            relationships: [{field: 'grandchildren', maps_to: 'grandchild', with_our_field: 'grandchild_id'}]};
        var grandchild_schema = {table: 'grandchild',
                                 fields: {id: null, ook1: ''}};
        var data,
            result;


        describe("when updating the model", function() {
            beforeEach(function() {
                query.update.andReturn(q.resolve(3));
                query.remove.andReturn(q.resolve());
                query.insert.andReturn(q.resolve(2));
                schemas.registerSchema(data_schema);
                schemas.registerSchema(child_schema);
                schemas.registerSchema(grandchild_schema);
                data = {id: 1, field1: 'ook1', field2: 'ook2',
                        children: [{data_id: 1, grandchild_id: 2,
                                    grandchildren: {id: 2, ook1: 'onk'}},
                                   {data_id: 1, grandchild_id: 3,
                                    grandchildren: {id: 3, ook1: 'onk2'}}]};

                result = core.saveModel(db, 'data', data);
            });

            afterEach(function() {
                schemas.clearSchema();
            });

            it("updates the parent table", function(done) {
              result.then(function() {
                expect(query.update).toHaveBeenCalledWith(db, 'data', {id: 1, field1: 'ook1', field2: 'ook2'});
                done();
              });
            });

            it("removes the cascade delete row", function(done) {
              result.then(function() {
                expect(query.remove).toHaveBeenCalledWith(db, 'child', 'data_id=$1', [1]);
                done();
              });
            });
        });

        describe("when calling list", function() {

            beforeEach(function() {
                var data = {data_id: 1, data_field1: 'ook', data_field2: 'ponk',
                            child_id: 2, child_data_id: 1, child_ook1: 'erkle'};
                query.select.andReturn(q.resolve([data]));
                schemas.registerSchema(data_schema);
                schemas.registerSchema(child_schema);
                schemas.registerSchema(grandchild_schema);
            });

            afterEach(function() {
                schemas.clearSchema();
            });

            it('calls with the correct joins', function() {
                core.list({}, 'data');
                expect(query.select)
                    .toHaveBeenCalledWith({}, 'data',
                                          'data.id as data_id,data.field1 as data_field1,data.field2 as data_field2,child.data_id as child_data_id,child.grandchild_id as child_grandchild_id,grandchild.id as grandchild_id,grandchild.ook1 as grandchild_ook1',
                                          '', '', undefined,
                                          ['left join child on data.id=child.data_id',
                                           'left join grandchild on child.grandchild_id=grandchild.id'],
                                           undefined, undefined);
            });
        });
    });
});
