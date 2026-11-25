'use strict';

// The order fixes each picture to a shelf slot. The order of thefts is shuffled separately.
const FOOD = {
  grammar: [
    { id: 'carrot', name: 'carrot', amount: 'a', width: 92 },
    { id: 'egg', name: 'egg', amount: 'an', width: 58 },
    { id: 'cheese', name: 'cheese', amount: 'some', width: 90 },
    { id: 'orange', name: 'orange', amount: 'an', width: 72 },
    { id: 'cake', name: 'slice of cake', amount: 'a', width: 88 },
    { id: 'banana', name: 'banana', amount: 'a', width: 86 },
    { id: 'apple', name: 'apple', amount: 'an', width: 73 },
    { id: 'sausages', name: 'sausages', amount: 'some', width: 92 },
    { id: 'sandwich', name: 'sandwich', amount: 'a', width: 97 },
    { id: 'potato', name: 'potato', amount: 'a', width: 79 },
    { id: 'chips', name: 'chips', amount: 'some', width: 100 },
    { id: 'pasta', name: 'pasta', amount: 'some', width: 99 }
  ],
  containers: [
    { id: 'water', name: 'bottle of water', width: 73 },
    { id: 'milk', name: 'carton of milk', width: 65 },
    { id: 'lemonade', name: 'can of lemonade', width: 63 },
    { id: 'juice', name: 'glass of orange juice', width: 70 },
    { id: 'popcorn', name: 'bag of popcorn', width: 78 },
    { id: 'biscuits', name: 'packet of biscuits', width: 99 },
    { id: 'ice-cream', name: 'cone of ice cream', width: 65 },
    { id: 'rice', name: 'bowl of rice', width: 94 },
    { id: 'jam', name: 'jar of jam', width: 69 },
    { id: 'pizza', name: 'slice of pizza', width: 93 },
    { id: 'chocolate', name: 'bar of chocolate', width: 82 },
    { id: 'tea', name: 'cup of tea', width: 94 }
  ]
};
