import express from 'express';
import mysql from 'mysql2/promise';

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));

//for Express to get values using POST method
app.use(express.urlencoded({extended:true}));

//setting up database connection pool
const pool = mysql.createPool({
    host: "z12itfj4c1vgopf8.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
    user: "uro6cznr04eygyhx",
    password: "oa8kjjl7zrnapey9",
    database: "go7x7xs242lpoe9s",
    connectionLimit: 10,
    waitForConnections: true
});
const conn = await pool.getConnection();

//routes
app.get('/', async (req, res) => {
    let sql='SELECT authorId, firstName, lastName FROM authors'
    const [authorsRows] = await pool.query(sql);
    console.log(authorsRows);

    let categorySql='SELECT DISTINCT category FROM quotes';
    const [categoryRows] = await pool.query(categorySql);
    console.log(categoryRows);

   res.render('home', {authorsRows, categoryRows});
});

app.get('/searchByCategory', async (req, res) => {
    let category = req.query.category;
    console.log(category)
    let sql = 'SELECT quote, authorId, firstName, lastName FROM authors NATURAL JOIN quotes WHERE category = ?';
    let sqlParams = [category];
    const [rows] = await pool.query(sql, sqlParams);
    console.log(rows);
    res.render('results.ejs', {rows});
});

app.get('/searchByLikes', async (req, res) => {
    let likesMin = req.query.likesMin;
    let likesMax = req.query.likesMax
    console.log("Likes Min: " + likesMin+"\nLikes max: "+likesMax);
    let sql = 'SELECT quote, authorId, firstName,lastName FROM authors NATURAL JOIN quotes WHERE likes BETWEEN ? AND ?';
    let sqlParams = [likesMin,likesMax];
    const [rows] = await pool.query(sql, sqlParams);
    console.log(rows);
    res.render('results.ejs', {rows});
});

app.get('/searchByKeyword', async (req, res) => {
    // console.log(req);
    let keyword = req.query.keyword;
    // console.log("Keyword: " + keyword);

    let sql = "SELECT * FROM authors NATURAL JOIN quotes WHERE quote LIKE ?";
    let sqlParams = [`%${keyword}%`];
    const [rows] = await pool.query(sql, sqlParams);
    console.log(rows);
    res.render('results.ejs', {rows});
});


app.get('/searchByAuthor', async (req, res) => {
    console.log("searchByAuthor")
    let keyword = req.query.authorId;
    console.log(keyword);
    let sql = 'SELECT authorId,firstName,lastName,quote FROM authors NATURAL JOIN quotes WHERE authorId LIKE ?';
    let sqlParams = [`%${keyword}%`];
    const [rows] = await pool.query(sql, sqlParams);
    console.log(rows);
    res.render('results.ejs', {rows});
});





//local API for a specific author info
app.get('/api/authors/:authorId', async (req, res) => {
   let authorId = req.params.authorId; //Must match the params in the route route above
    let sql = 'SELECT * FROM authors WHERE authorId = ?';
    const [rows] = await pool.query(sql, [authorId]);
    res.send(rows);
});



app.get("/dbTest", async(req, res) => {
    let sql = "SELECT CURDATE()";
    const [rows] = await conn.query(sql);
    res.send(rows);
});//dbTest

app.listen(3000, ()=>{
    console.log("Express server running")
})