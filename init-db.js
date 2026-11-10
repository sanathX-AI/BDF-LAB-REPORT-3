/**
 * Database Initialization Script
 * BDF Lab 03 - K. Sanath Kumar (252UR5070) - AIDE 2A 106
 * 
 * Run this script once to create and seed the books.db database:
 *   node init-db.js
 */

const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');

const initDatabase = async () => {
  const db = await open({
    filename: path.join(__dirname, 'books.db'),
    driver: sqlite3.Database,
  });

  // Create the book table
  await db.run(`
    CREATE TABLE IF NOT EXISTS book (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price REAL NOT NULL,
      pages INTEGER NOT NULL
    );
  `);

  // Clear existing data
  await db.run(`DELETE FROM book;`);
  await db.run(`DELETE FROM sqlite_sequence WHERE name='book';`);

  // Seed with 10 sample books
  const books = [
    { title: 'Clean Code', author: 'Robert C. Martin', price: 450.0, pages: 464 },
    { title: 'The Pragmatic Programmer', author: 'Andrew Hunt and David Thomas', price: 520.0, pages: 352 },
    { title: 'JavaScript: The Good Parts', author: 'Douglas Crockford', price: 350.0, pages: 176 },
    { title: "You Don't Know JS", author: 'Kyle Simpson', price: 299.0, pages: 278 },
    { title: 'Design Patterns', author: 'Erich Gamma et al.', price: 650.0, pages: 395 },
    { title: 'Refactoring', author: 'Martin Fowler', price: 580.0, pages: 448 },
    { title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', price: 890.0, pages: 1312 },
    { title: 'Structure and Interpretation of Computer Programs', author: 'Harold Abelson', price: 720.0, pages: 657 },
    { title: 'Head First Design Patterns', author: 'Eric Freeman', price: 480.0, pages: 694 },
    { title: 'Cracking the Coding Interview', author: 'Gayle Laakmann McDowell', price: 550.0, pages: 687 },
  ];

  for (const book of books) {
    await db.run(
      `INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);`,
      [book.title, book.author, book.price, book.pages]
    );
  }

  console.log('Database initialized successfully with 10 sample books!');
  await db.close();
};

initDatabase().catch((err) => {
  console.error('Error initializing database:', err.message);
  process.exit(1);
});
