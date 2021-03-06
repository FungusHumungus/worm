WORM (Worm Object Relational Mapper)

WORM is an ORM for Javascript that enables you to use POJsO's (Plain Old Javascript Objects) mapped against your relationhal database.

It is currently tested against Postgress, but in theory should be possible to make it work against any standard relational database.

====
##Step 1

Define your business objects. Currently there needs to be a one-to-one mapping between your database tables and your business objects. With a well designed database this should be typically the case. You can add methods to define your business logic and validation to these objects as well.

Say we have a customer with multiple addresses:

```
  var customer={
    id: null,
    firstName: '',
    lastName: '',
    addresses: [],

    getHomeAddress: function() {
      for (var a in this.addresses) {
        if (a.type === 'Home')
          return a;
      }
    }
  };

  var address={
    id: null,
    customer_id: null,
    street: '',
    town: '',
    country: '',
    postcode: '',
    type: 'Home'
  };
```
===

##Step 2

Register these objects with WORM and define any relationships.

```
  var worm = require('worm');

  worm.registerSchema({
    table: 'customer',
    fields: customer,
    relationships: [{field: addresses,
                      maps_to: 'address',
                      with_field: 'customer_id'
    }]
  });

  worm.registerSchema({
    table: 'address',
    fields: address
  });
```

===

##Step 3

Setup the connection to the database.
```
  var pg = require('pg')

  var connection = function() {
    return new pg.Client(dbconfig);
  };
```
===

##Step 4

Query the database, and play with your objects.
```
  var customers = worm.model('customer', connection);
  var addresses = worm.model('address', connection);

  // Get Mr Smith from the database
  var smith = customers.get({where: "firstName = $1", params['Smith']});

  // Create a new address
  var address = addresses.create({street: '13 Mongle Road',
                                  town: 'Spooton Rabbit',
                                  type: 'Business'});

  // Add the address to Mr Smith
  smith.addresses.push(address);

  // Save the changes
  customer.saveModel(smith);
```
====

##Step 5

Sit back and code your apps logic

