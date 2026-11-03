const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ================= DB CONNECT ================= */
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

/* ================= SCHEMAS ================= */

// ORDER
const OrderSchema = new mongoose.Schema({
    items: Array,
    total: Number,
    table: Number,
    date: { type: Date, default: Date.now },
    paid: { type: Boolean, default: false }
});
const Order = mongoose.model("Order", OrderSchema);

// ITEM
const ItemSchema = new mongoose.Schema({
    name: String,
    price: Number,
    category: String,
    image: String,
    available: { type: Boolean, default: true }
});
const Item = mongoose.model("Item", ItemSchema);

// REVIEW
const ReviewSchema = new mongoose.Schema({
    name: String,
    rating: Number,
    message: String,
    approved: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }, // ✅ comma added
    likes: { type: Number, default: 0 }
});
const Review = mongoose.model("Review", ReviewSchema);

/* ================= ORDER APIs ================= */

// PLACE ORDER
app.post("/order", async (req, res) => {
    try {
        const order = new Order({
            items: req.body.items,
            total: req.body.total,
            table: req.body.table,
            paid: false,

            // 🔥 FORCE CURRENT DATE + TIME
            date: new Date()
        });

        await order.save();

        console.log("Saved Order Date:", order.date); // DEBUG

        res.send("Order placed");

    } catch (err) {
        console.log(err);
        res.status(500).send("Error placing order");
    }
});

// GET ORDERS
app.get("/orders", async (req, res) => {
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
});

// MARK PAID
app.put("/order/paid/:id", async (req, res) => {
    await Order.findByIdAndUpdate(req.params.id, { paid: true });
    res.send("Order marked as paid");
});

/* ================= ITEM APIs ================= */

// ADD ITEM
app.post("/item", async (req, res) => {
    try {
        const { name, price, category, image } = req.body;

        if (!name || !price) {
            return res.status(400).send("Name & price required");
        }

        const item = new Item({
            name,
            price,
            category,
            image,
            available: true
        });

        await item.save();

        res.send("Item added successfully");

    } catch (err) {
        console.log(err);
        res.status(500).send("Error adding item");
    }
});

// GET ALL ITEMS
app.get("/items", async (req, res) => {
    const items = await Item.find().sort({ name: 1 });
    res.json(items);
});

// UPDATE AVAILABILITY
app.put("/item/:id", async (req, res) => {
    const { available } = req.body;
    await Item.findByIdAndUpdate(req.params.id, { available });
    res.send("Item updated");
});

// UPDATE PRICE
app.put("/item/update/:id", async (req, res) => {
    const { price } = req.body;

    if (!price || isNaN(price)) {
        return res.status(400).send("Invalid price");
    }

    await Item.findByIdAndUpdate(req.params.id, {
        price: Number(price)
    });

    res.send("Price updated");
});

// DELETE ITEM
app.delete("/item/:id", async (req, res) => {
    await Item.findByIdAndDelete(req.params.id);
    res.send("Item deleted");
});

/* ================= REVIEW APIs ================= */

// ADD REVIEW
app.post("/review", async (req, res) => {
    try {
        const review = new Review({
            ...req.body,
            date: new Date()
        });

        await review.save();

        res.send("Review submitted");

    } catch (err) {
        console.log(err);
        res.status(500).send("Error saving review");
    }
});

// GET ALL REVIEWS
app.get("/reviews", async (req, res) => {
    const reviews = await Review.find().sort({ date: -1 });
    res.json(reviews);
});

// APPROVE REVIEW
app.put("/review/approve/:id", async (req, res) => {
    await Review.findByIdAndUpdate(req.params.id, { approved: true });
    res.send("Review approved");
});

// GET APPROVED REVIEWS
app.get("/reviews/approved", async (req, res) => {
    const reviews = await Review.find({ approved: true }).sort({ date: -1 });
    res.json(reviews);
});

/* ================= SALES ================= */

app.get("/sales", async (req, res) => {

    let dateQuery = req.query.date;
    let mode = req.query.mode; // ✅ NEW

    let start = new Date();
    let end = new Date();

    // ✅ ALL TIME SUPPORT
    if (mode === "all") {
        start = new Date(0);
        end = new Date();
    }

    // ✅ DATE FILTER
    else if (dateQuery) {
        start = new Date(dateQuery);
        start.setHours(0, 0, 0, 0);

        end = new Date(dateQuery);
        end.setHours(23, 59, 59, 999);
    }

    // ✅ DEFAULT TODAY
    else {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
    }

    let orders = await Order.find({
        date: { $gte: start, $lte: end }
    });

    let totalSales = 0;
    let totalItems = 0;
    let itemMap = {};

    for (let order of orders) {

        totalSales += order.total || 0;

        for (let item of order.items || []) {

            let name = item.name || "Item";
            let qty = item.qty || 1;

            totalItems += qty;

            if (!itemMap[name]) itemMap[name] = 0;
            itemMap[name] += qty;
        }
    }

    res.json({
        totalSales,
        totalItems,
        totalOrders: orders.length,
        itemsBreakdown: itemMap
    });
});

// review like api

// LIKE REVIEW
app.put("/review/like/:id", async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) return res.status(404).send("Not found");

        review.likes += 1;
        await review.save();

        res.json({ likes: review.likes });

    } catch (err) {
        console.log(err);
        res.status(500).send("Error liking review");
    }
});



















/* ================= START ================= */

app.listen(3000, () => console.log("Server running on port 3000"));
