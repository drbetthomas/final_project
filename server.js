const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const dotenv = require('dotenv');
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
dotenv.config();

const port = process.env.PORT || 3000;

// Configure session middleware
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Create MySQL connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

// Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL as id ' + connection.threadId);
});

// Serve static files from the default directory
app.use(express.static(__dirname));

// Set up middleware to parse incoming JSON data
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Define routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Define a User representation for clarity
const User = {
    tableName: 'users',
    createUser: function (newUser, callback) {
        connection.query('INSERT INTO ' + this.tableName + ' SET ?', newUser, callback);
    },
    getUserByEmail: function (email, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE email = ?', [email], (err, results) => {
            callback(err, results[0]);
        });
    },
    getUserByUsername: function (username, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE username = ?', [username], (err, results) => {
            callback(err, results[0]);
        });
    }
};

// Registration route
app.post('/register', [
    check('email').isEmail(),
    check('username').isAlphanumeric().withMessage('Username must be alphanumeric'),
    check('email').custom((value) => {
        return new Promise((resolve, reject) => {
            User.getUserByEmail(value, (err, user) => {
                if (err) {
                    reject(new Error('Server Error'));
                }
                if (user) {
                    reject(new Error('Email already exists'));
                }
                resolve(true);
            });
        });
    }),
    check('username').custom((value) => {
        return new Promise((resolve, reject) => {
            User.getUserByUsername(value, (err, user) => {
                if (err) {
                    reject(new Error('Server Error'));
                }
                if (user) {
                    reject(new Error('Username already exists'));
                }
                resolve(true);
            });
        });
    }),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    const newUser = {
        email: req.body.email,
        username: req.body.username,
        password: hashedPassword,
        full_name: req.body.full_name
    };

    User.createUser(newUser, (error, results) => {
        if (error) {
            console.error('Error inserting user: ' + error.message);
            return res.status(500).json({ error: error.message });
        }
        console.log('Inserted a new user with id ' + results.insertId);
        res.status(201).json(newUser);
    });
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    connection.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            return res.status(401).send('Invalid username or password');
        }
        const user = results[0];
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) throw err;
            if (isMatch) {
                req.session.user = user;
                res.send('Login successful');
            } else {
                res.status(401).send('Invalid username or password');
            }
        });
    });
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.send('Logout successful');
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        return res.status(401).send('Unauthorized');
    }
    const userFullName = req.session.user.full_name;
    res.render('dashboard', { fullName: userFullName });
});

// Set storage engine for multer
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Initialize upload
const upload = multer({
    storage: storage,
    limits: { fileSize: 1000000 }, // Limit file size to 1MB
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    }
}).single('image');

// Check file type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Create uploads directory if it doesn't exist
const dir = './uploads';
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

// Handle form submission
app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).send({ message: err });
        }
        if (req.file == undefined) {
            return res.status(400).send({ message: 'No file selected!' });
        }
        const formData = {
            name: req.body.name,
            subcounty: req.body.subcounty,
            constituency: req.body.constituency,
            payment_info: req.body.payment_info,
            imagePath: `/uploads/${req.file.filename}`
        };
        // You can save formData to a database here if needed
        res.status(200).send({ message: 'Profile created successfully!', data: formData });
    });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
