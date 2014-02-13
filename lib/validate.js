/*global exports: false */

var _ = require('lodash');

function cat() {
    var head = _.first(arguments);
    if (head)
        return head.concat.apply(head, _.rest(arguments));
    else
        return [];
}

function isEmpty(arr) {
    return !arr || arr.length === 0;
}

exports.isError = function(arr) {
    return !isEmpty(arr);
};

exports.assert = function(obj, checker) {
    var err = checker(obj);
    if (!isEmpty(err)) {
        var exception = 'Failed Assertion, the following data is not valid:' + '\n' + JSON.stringify(obj) + '\n' + err + '\n' + (new Error()).stack;
        throw new Error(exception);
    }
};

exports.checker = function (/* validators */) {
    var validators = _.toArray(arguments);

    return function(obj) {
        return _.reduce(validators, function(errs, check) {
            if (check(obj))
                return errs;
            else
                return _.chain(errs).push(check.message).value();
        }, []);
    };
};

exports.validator = function(message, fun) {
    var f = function(/* args */) {
        return fun.apply(fun, arguments);
    };

    f.message = message;
};

/**
 * Run the validator if the condition passes
 */
exports.if = function(condition, validator) {
    var fun = function(obj) {
        if (condition(obj)) {
            return validator(obj);
        }

        return true;
    };

    fun.message = validator.message;
    return fun;
};

exports.hasKeys = function () {
    var keys = _.toArray(arguments);

    var fun = function(obj) {
        if (!obj) {
            fun.message = "Is null";
            return false;
        }
        
        var missing = _.reduce(keys, function(m, k) {
            if (_.isUndefined(obj[k])) m.push(k);
            return m;
        }, []);

        if (missing.length > 0)
            fun.message = cat(["Must have values for keys: "], missing).join(" ");

        return missing.length === 0;
    };

    return fun;
};

exports.fieldIsRequired = function(field) {
    var fun = function(obj) {
        return obj && obj[field].toString() !== '';
    };

    fun.message = "Field '" + field + "' is required";
    return fun;
};

exports.fieldIsObject = function(field) {
    var fun = function(obj) {
        return obj && _.isObject(obj[field]);
    };

    fun.message = field + " must be an object";
    return fun; 
};

exports.fieldIsNumber = function(field) {
    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    var fun = function(obj) {
        return isNumber(obj[field]);
    };

    fun.message = field + " must be a number";
    return fun;
};

exports.fieldIsArray = function(field) {
    var fun = function(obj) {
        return _.isArray(obj[field]);
    };

    fun.message = field + " must be an array";
    return fun;
};
