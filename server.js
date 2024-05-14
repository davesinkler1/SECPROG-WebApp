const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const sanitize = require('mongo-sanitize');
const session = require('express-session');
const doubleCsrf = require('csrf-csrf');
const cookieParser = require('cookie-parser');


const app = express();
const port = 3000;
const dbURI = 'mongodb+srv://jaudanafzal61:wNWzomWlrJaRHj9X@cluster0.4xt6dca.mongodb.net/login_assignment?retryWrites=true&w=majority&appName=Cluster0'

// Connect to MongoDB
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then((result) => console.log('connected to db'))
    .catch((err) => console.log(err));
/*const db = mongoose.connection;*/

// User schema
const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

const userdata = mongoose.model('userdatas', userSchema);
module.exports = userdata;

const userSchema2 = new mongoose.Schema({
	pizza: String
})

const pizzadata = mongoose.model('pizzadatas', userSchema2);
module.exports = pizzadata;

// Session middleware
app.use(session({
    secret: 'supersecret', // Change this to a strong, random string
    resave: false,
    saveUninitialized: true
}));

app.use(cookieParser());

// Middleware to parse request body
app.use(bodyParser.urlencoded({ extended: true }));

// Render login form
app.get('/', (req, res) => {
    res.send(`
        <form action="/login" method="post">
            <label for="username">Username:</label>
            <input type="text" id="username" name="username"><br><br>
            <label for="password" maxlength="8">Password:</label>
            <input type="password" id="password" name="password"><br><br>
            <button type="submit">Login</button>
        </form>
        <form action="/recovery" method="get">
         <button type="submit">Recover password</button>
        </form>
        <form action="/register" method="get">
         <button type="submit">Register</button>
        </form>
    `);
});

app.get('/main', (req, res) => {
    res.send(`
        <h1>Welcome to Pizza Hut</h1>
        <form action="/order" method="post">
            <label for="pizza">Choose your pizza:</label>
            <input type="text" id="pizza" name="pizza"><br><br>
            <button type="submit">Order Pizza</button>
        </form>
    `);
});

app.post('/order', async (req, res) => {
    const { pizza } = req.body;
    const newPizza = new pizzadata({
	pizza
    })
    await newPizza.save();
    res.cookie('pizza', pizza, { maxAge: 1000 * 60 * 60 *24});
    const cookies = req.cookies;
    console.log("pizza ordered: " + req.cookies);
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    var clean = sanitize(username);

    try {
        // Find user by username
        const user = await userdata.findOne({ "username": clean});

        if (user) {
            // Compare hashed password
            bcrypt.compare(password, user.password, (err, result) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Internal Server Error');
                } else if (result) {
                    res.redirect('/main');
                } else {
                    res.send('Incorrect password');
                }
            });
        } else {
            res.send('User not found');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/recovery', async (req, res) => {

    try {
         res.send(`<form action="/password_reset" method="post">
         <label for="username">Username:</label>
         <input type="text" id="username" name="username"><br><br>
         <label for="password">Password:</label>
         <input type="password" id="password" name="new password" maxlength="8"><br><br>
         <button type="submit">Reset password</button>
        </form>`);
    } catch(error) {
        console.error(error);
        res.status(500).send('Internal Server Error2');
    }
});

app.post('/password_reset', async (req, res) => { 
    try {
        const { username, password } = req.body;

        var clean = sanitize(username);

        const existingUser1 = await userdata.findOne({ "username": clean });

        if (existingUser1) {
            userdata.updateOne({ "username": username },
                {
                    $set: {
                        "password": password
                    },
                    $currentDate: { lastUpdated: true }
                })
            res.send('password updated successfully');
        } else {
            res.status(500).send('Internal Server Error1');
        }

    } catch(error) {
        console.error(error);
        res.status(500).send('Internal Server Error2');
    }
})

// Register route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    var clean = sanitize(username);

    try {
        // Check if user already exists
        const existingUser = await userdata.findOne({ "username": clean});

        if (existingUser) {
            res.send('Username already exists');
        } else {
            // Hash password
            bcrypt.hash(password, 10, async (err, hash) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Internal Server Error1');
                } else {
                    // Create new user
                    const newUser = new userdata({
                        username,
                        password: hash
                    });
                    await newUser.save();
                    res.send('User registered successfully');
                }
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error2');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
