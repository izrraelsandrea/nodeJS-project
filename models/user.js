const mongobd = require('mongodb');
const getDb = require('../util/database').getDb;

const ObjectId = mongobd.ObjectId;

class User {
    constructor(username, email, cart, id) {
        this.name = username;
        this.email = email;
        this.cart = cart; // {items: []}
        this._id = id;
    }
    save() {
        const db = getDb();
        return db.collection('users').insertOne(this);
    }

    addToCart(product) { 
        //find in the cart items array the index of the product (if exist)
        const cartProductIndex = this.cart.items.findIndex(cp => { 
            return cp.productId.toString() === product._id.toString();
        });
        let newQuantity = 1;
        //prepare the array to modify or add a new item to the cart
        const updatedCartItems = [ ...this.cart.items];

        //if found the product in the cart of the user, then updates the quantity
        if (cartProductIndex >= 0) {
            newQuantity = this.cart.items[cartProductIndex].quantity +1;
            updatedCartItems[cartProductIndex].quantity = newQuantity;
        //otherwise push a new item to the cart
        } else {
            updatedCartItems.push({
                productId: new ObjectId(product._id),
                quantity: newQuantity
            });
        }

        const updatedCart = { 
            items: updatedCartItems
         };
        const db = getDb();
        return db
        .collection('users')
        .updateOne(
            { _id: new ObjectId(this._id) },
            { $set: {cart: updatedCart}}
        );
    }

    getCart()
    {
        const db = getDb();
        //returns a new array from cart users with only product ids
        const productsIds = this.cart.items.map(i => {
            return i.productId;
        });
        // find all products with the products ids of the carts user
        return db.collection('products').find({_id: {$in: productsIds}}).toArray()
        .then(products => {
            return products.map(p => { //map again to construct a new array with product and quantity info
                return {
                    ...p,
                    quantity: this.cart.items.find(i => { //find the quantity for each product
                        return i.productId.toString() === p._id.toString();
                    }).quantity
                }
            })        })
        .catch(err => console.log(err));
    }
    deleteCartItem(productId)
    {
        const updatedCartItems = this.cart.items.filter(item => {
            return item.productId.toString() !== productId.toString(); //filter all productIds different than the one we want delete
        });

        const db = getDb();
        return db
        .collection('users')
        .updateOne(
            { _id: new ObjectId(this._id) },
            { $set: { cart: {items: updatedCartItems } } }
            )
        .then(result => {
            console.log(result);
        })
        .catch(err => console.log(err));
    }
    addOrder(){
        const db = getDb();
        return this.getCart()
        .then(products => {
            const order = {
                items: products,
                users: {
                    _id: new ObjectId(this._id),
                    name: this.name,
                }
            };
            return db.collection('orders').insertOne(order);

        })      
        .then(result => {
            this.cart = { items: [] };
            return db
            .collection('users')
            .updateOne( {_id: new ObjectId(this._id) },
                        {$set: {cart: {items: [] } } } 
            );
        })
        .catch(err =>console.log(err));
    }
    getOrders()
    {
        const db = getDb();
        return db
        .collection('orders')
        .find({ 'users._id': new ObjectId(this._id) })//find id nested in a collection
        .toArray(); 
    }

    static findById(userId) {
        const db = getDb();
        return db
        .collection('users')
        .findOne({_id: new ObjectId(userId)})
        .then(user => {
            return user;
        })
        .catch(err => console.log(err));
    }
}
module.exports = User;