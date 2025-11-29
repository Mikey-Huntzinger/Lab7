import express from 'express';
import mysql from 'mysql2/promise';
import session from 'express-session';
import bcrypt from 'bcrypt';

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);
app.use(session({
    secret: 'cst336',
    resave: false,
    saveUninitialized: true
}));

// Middleware to make 'isAuthenticated' available in all views
app.use((req, res, next) => {
    // If the user is logged in, isAuthenticated will be true. Otherwise, false.
    res.locals.isAuthenticated = req.session.isAuthenticated || false;
    next();
});


const pool = mysql.createPool({
    host: "z12itfj4c1vgopf8.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "uro6cznr04eygyhx",
    password: "oa8kjjl7zrnapey9",
    database: "go7x7xs242lpoe9s",
    connectionLimit: 10,
    waitForConnections: true
});

function checkAuth(req, res, next) {
    if (req.session.isAuthenticated) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.get('/', (req, res) => {
    res.redirect('/home');
});

app.get('/login', (req, res) => {
    res.render('login.ejs', { loginError: "" });
});

app.post('/loginProcess', async (req, res) => {
    const { username, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [username]);

    if (rows.length > 0) {
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.isAuthenticated = true;
            req.session.userId = user.id;
            return res.redirect('/admin');
        }
    }
    res.render('login.ejs', { loginError: "Invalid credentials" });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Public Routes
app.get('/home', async (req, res) => {
    let sql = 'SELECT authorId, firstName, lastName FROM authors';
    const [authorsRows] = await pool.query(sql);
    let categorySql = 'SELECT DISTINCT category FROM quotes';
    const [categoryRows] = await pool.query(categorySql);
    res.render('home', { authorsRows, categoryRows });
});

app.get('/searchByCategory', async (req, res) => {
    let category = req.query.category;
    let sql = 'SELECT quote, authorId, firstName, lastName FROM authors NATURAL JOIN quotes WHERE category = ?';
    const [rows] = await pool.query(sql, [category]);
    res.render('results.ejs', { rows });
});

app.get('/searchByLikes', async (req, res) => {
    let likesMin = req.query.likesMin;
    let likesMax = req.query.likesMax;
    let sql = 'SELECT quote, authorId, firstName, lastName FROM authors NATURAL JOIN quotes WHERE likes BETWEEN ? AND ?';
    const [rows] = await pool.query(sql, [likesMin, likesMax]);
    res.render('results.ejs', { rows });
});

app.get('/searchByKeyword', async (req, res) => {
    let keyword = req.query.keyword;
    let sql = "SELECT * FROM authors NATURAL JOIN quotes WHERE quote LIKE ?";
    const [rows] = await pool.query(sql, [`%${keyword}%`]);
    res.render('results.ejs', { rows });
});

app.get('/searchByAuthor', async (req, res) => {
    let authorId = req.query.authorId;
    let sql = 'SELECT authorId, firstName, lastName, quote FROM authors NATURAL JOIN quotes WHERE authorId = ?';
    const [rows] = await pool.query(sql, [authorId]);
    res.render('results.ejs', { rows });
});

// Admin Routes
app.get('/admin', checkAuth, (req, res) => {
    res.render('admin/dashboard');
});

app.get('/admin/authors', checkAuth, async (req, res) => {
    const [authors] = await pool.query("SELECT * FROM authors ORDER BY lastName, firstName");
    res.render('admin/authors', { authors });
});

app.get('/admin/addAuthor', checkAuth, (req, res) => {
    res.render('admin/authorForm', { 
        action: 'Add', 
        author: { firstName: '', lastName: '', dob: '', dod: '', sex: '', profession: '', country: '', portrait: '', biography: '' } 
    });
});

app.post('/admin/addAuthor', checkAuth, async (req, res) => {
    const { firstName, lastName, dob, dod, sex, profession, country, portrait, biography } = req.body;
    const sql = "INSERT INTO authors (firstName, lastName, dob, dod, sex, profession, country, portrait, biography) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    // If 'dod' (Date of Death) is empty, we save it as NULL in the database
    await pool.query(sql, [firstName, lastName, dob, dod || null, sex, profession, country, portrait, biography]);
    res.redirect('/admin/authors');
});

app.get('/admin/editAuthor', checkAuth, async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM authors WHERE authorId = ?", [req.query.id]);
    res.render('admin/authorForm', { action: 'Edit', author: rows[0] });
});

app.post('/admin/editAuthor', checkAuth, async (req, res) => {
    const { authorId, firstName, lastName, dob, dod, sex, profession, country, portrait, biography } = req.body;
    const sql = "UPDATE authors SET firstName=?, lastName=?, dob=?, dod=?, sex=?, profession=?, country=?, portrait=?, biography=? WHERE authorId=?";
    await pool.query(sql, [firstName, lastName, dob, dod || null, sex, profession, country, portrait, biography, authorId]);
    res.redirect('/admin/authors');
});

app.get('/admin/deleteAuthor', checkAuth, async (req, res) => {
    await pool.query("DELETE FROM authors WHERE authorId = ?", [req.query.id]);
    res.redirect('/admin/authors');
});

app.get('/admin/quotes', checkAuth, async (req, res) => {
    const [quotes] = await pool.query("SELECT * FROM quotes NATURAL JOIN authors ORDER BY quote");
    res.render('admin/quotes', { quotes });
});

app.get('/admin/addQuote', checkAuth, async (req, res) => {
    const [authors] = await pool.query("SELECT authorId, firstName, lastName FROM authors ORDER BY lastName");
    const [categories] = await pool.query("SELECT DISTINCT category FROM quotes ORDER BY category");
    res.render('admin/quoteForm', { 
        action: 'Add', 
        quote: { quote: '', authorId: '', category: '' }, 
        authors, 
        categories 
    });
});

app.post('/admin/addQuote', checkAuth, async (req, res) => {
    const { quote, authorId, category } = req.body;
    const sql = "INSERT INTO quotes (quote, authorId, category, likes) VALUES (?, ?, ?, 0)";
    await pool.query(sql, [quote, authorId, category]);
    res.redirect('/admin/quotes');
});

app.get('/admin/editQuote', checkAuth, async (req, res) => {
    const [quotes] = await pool.query("SELECT * FROM quotes WHERE quoteId = ?", [req.query.id]);
    const [authors] = await pool.query("SELECT authorId, firstName, lastName FROM authors ORDER BY lastName");
    const [categories] = await pool.query("SELECT DISTINCT category FROM quotes ORDER BY category");
    res.render('admin/quoteForm', { action: 'Edit', quote: quotes[0], authors, categories });
});

app.post('/admin/editQuote', checkAuth, async (req, res) => {
    const { quoteId, quote, authorId, category } = req.body;
    const sql = "UPDATE quotes SET quote=?, authorId=?, category=? WHERE quoteId=?";
    await pool.query(sql, [quote, authorId, category, quoteId]);
    res.redirect('/admin/quotes');
});

app.get('/admin/deleteQuote', checkAuth, async (req, res) => {
    await pool.query("DELETE FROM quotes WHERE quoteId = ?", [req.query.id]);
    res.redirect('/admin/quotes');
});

app.get('/api/authors/:authorId', async (req, res) => {
    let authorId = req.params.authorId;
    let sql = 'SELECT * FROM authors WHERE authorId = ?';
    const [rows] = await pool.query(sql, [authorId]);
    res.send(rows);
});

app.listen(3000, () => {
    console.log("Express server running");
});