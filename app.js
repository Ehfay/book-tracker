const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const axios = require('axios');

require('dotenv').config();

const app = express();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));


app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books ORDER BY id ASC');
    res.render('index', { books: result.rows, title: 'Book Tracker' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


app.get('/add', (req, res) => {
  res.render('addBook', { title: 'Add a new Book' });
});


app.post('/add', async (req, res) => {
  const { title, author, genre, status, isbn, review } = req.body;

  let coverImage;

  try {
    const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
    if (response.data.totalItems > 0) {
      const bookData = response.data.items[0].volumeInfo;
      coverImage = bookData.imageLinks ? bookData.imageLinks.thumbnail : null;
    }

    await pool.query(
      'INSERT INTO books (title, author, genre, status, "coverImage", review) VALUES ($1, $2, $3, $4, $5, $6)',
      [title, author, genre, status, coverImage, review]
    );

    res.redirect('/');
  } catch (error) {
    console.error('Error occurred during book addition:', error);
    res.status(500).send('Error adding book');
  }
});


app.get('/edit/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    res.render('editBook', { book: result.rows[0], title: 'Edit Book' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


app.post('/edit/:id', async (req, res) => {
  const id = req.params.id;
  const { title, author, genre, status, review } = req.body;

  try {
    await pool.query(
      'UPDATE books SET title = $1, author = $2, genre = $3, status = $4, review = $5 WHERE id = $6',
      [title, author, genre, status, review, id]
    );
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


app.post('/delete/:id', async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query('DELETE FROM books WHERE id = $1', [id]);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
