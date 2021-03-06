describe("Fluent worm", function() {

    var fluent_worm = require('../lib/fluent_worm');

    
    describe("when calling where", function() {

        it ("returns the fluent object", function() {

            var fluent = fluent_worm();
            expect(fluent.where('onk = ponk')).toBe(fluent);
        });

    });

    describe("when calling list", function() {

        it ("combines the where calls using AND", function() {

            var model = jasmine.createSpyObj('model', ['list']);

            var fluent = fluent_worm(model).where('onk=ponk').where('arf=snarf').list();

            expect(model.list).toHaveBeenCalledWith({ where: 'onk=ponk AND arf=snarf',
                                                      params: [] });
        });

        it ("reorders the params", function() {

            var model = jasmine.createSpyObj('model', ['list']);

            var fluent = fluent_worm(model)
                    .where('onk=$1 and erk=$2', [1,2])
                    .where('arf=$1', [3]).list();

            expect(model.list).toHaveBeenCalledWith({ where: 'onk=$1 and erk=$2 AND arf=$3',
                                                      params: [1,2,3] });
        });

        it("reorders params in the correct sequence", function() {

            var model = jasmine.createSpyObj('model', ['list']);

            var fluent = fluent_worm(model)
                    .where('onk=$1', [1])
            // The params are not specified in order. 
            // This order must be maintained
                    .where('arf=$2 and splonk=$1', [2,3]).list();

            expect(model.list).toHaveBeenCalledWith({ where: 'onk=$1 AND arf=$3 and splonk=$2', 
                                                      params: [1,2,3] });

        });

        it("reorders the params when not all are specified", function() {

            var model = jasmine.createSpyObj('model', ['list']);

            var fluent = fluent_worm(model)
                    .where('onk=$1', [1])
                    .where('arf=$4 and splonk=$2', [2,3,4,5]).list();

            expect(model.list).toHaveBeenCalledWith({ where: 'onk=$1 AND arf=$5 and splonk=$3',
                                                      params: [1,2,3,4,5] });

        });

        it("pulls out any array parameters", function() {

            var model = jasmine.createSpyObj('model', ['list']);

            var fluet = fluent_worm(model)
                    .where('onk=$1', [1])
                    .where('plonk in ($1) or ark = $2', [[13,14,15], 1])
                    .where('ponk=$1', [2]).list();

            expect(model.list).toHaveBeenCalledWith({where: 'onk=$1 AND plonk in ($2,$3,$4) or ark = $5 AND ponk=$6',
                                                     params: [1,13,14,15,1,2]});
        });
    });


});
