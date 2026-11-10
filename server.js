/**
 * BDF Lab 03: REST API, Query Parameters, Validation, and Debugging
 * Student: K. Sanath Kumar
 * Roll No: 252UR5070
 * Section: AIDE 2A 106
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();

// Middleware to parse incoming JSON request bodies
app.use(express.json());

// Port configuration
const PORT = process.env.PORT || 3000;

let db = null;
let initPromise = null;

/**
 * Determine database path:
 * On Vercel Serverless (process.env.VERCEL), the deployment bundle is read-only.
 * We copy books.db from bundle to /tmp/books.db on cold start if not present.
 * Locally, books.db in the project folder is used.
 */
const getDatabasePath = () => {
  if (process.env.VERCEL) {
    const tmpDbPath = path.join('/tmp', 'books.db');
    const sourceDbPath = path.join(__dirname, 'books.db');
    if (!fs.existsSync(tmpDbPath)) {
      if (fs.existsSync(sourceDbPath)) {
        fs.copyFileSync(sourceDbPath, tmpDbPath);
      }
    }
    return tmpDbPath;
  }
  return path.join(__dirname, 'books.db');
};

/**
 * Asynchronously initialize SQLite database connection
 */
const initializeDB = async () => {
  if (db) return db;
  if (!initPromise) {
    initPromise = (async () => {
      const dbPath = getDatabasePath();
      const database = await open({
        filename: dbPath,
        driver: sqlite3.Database,
      });

      // Ensure book table exists with correct schema
      await database.run(`
        CREATE TABLE IF NOT EXISTS book (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          author TEXT NOT NULL,
          price REAL NOT NULL,
          pages INTEGER NOT NULL
        );
      `);

      db = database;
      return db;
    })();
  }
  return initPromise;
};

/**
 * Middleware: ensure DB is initialized before processing any route
 */
app.use(async (req, res, next) => {
  try {
    await initializeDB();
    next();
  } catch (error) {
    res.status(500).json({ error: `Database Connection Error: ${error.message}`, message: error.message });
  }
});

/**
 * Asynchronously initialize SQLite database connection and start Express server (Local execution)
 */
const initializeDBAndServer = async () => {
  try {
    await initializeDB();
    const server = app.listen(PORT, () => {
      console.log(`Server Running at http://localhost:${PORT}/`);
    });

    // Handle EADDRINUSE port conflict gracefully
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please terminate the conflicting process or use a different PORT.`);
      } else {
        console.error(`Server Error: ${err.message}`);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

// Start local server when executed directly
if (require.main === module) {
  initializeDBAndServer();
}

// Whitelisted sorting columns to prevent SQL injection in ORDER BY
const ALLOWED_ORDER_BY_COLUMNS = ['id', 'title', 'author', 'price', 'pages'];
const ALLOWED_ORDER_DIRECTIONS = ['ASC', 'DESC'];

// ==========================================
// REST API ROUTES
// ==========================================

/**
 * Root Route: GET /
 * Description: API welcome, status check, and quick endpoint documentation
 */
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to BDF Lab 03: REST API with Query Parameters, Validation & Debugging',
    student: {
      name: 'K. Sanath Kumar',
      rollNo: '252UR5070',
      section: 'AIDE 2A 106',
    },
    endpoints: {
      getAllBooks: 'GET /books/ (supports search_q, order_by, order, limit, offset, min_price, max_price)',
      getSingleBook: 'GET /books/:bookId/',
      createBook: 'POST /books/ (requires title, author, price, pages)',
      updateBook: 'PUT /books/:bookId/',
      deleteBook: 'DELETE /books/:bookId/',
    },
  });
});

/**
 * Route 1: GET /books/
 * Description: Retrieve books with search, sort, filter, and pagination
 * Query Parameters:
 *   - search_q: Partial book title match (LIKE %search_q%)
 *   - order_by: Column to sort by (default: 'id') [Whitelisted: id, title, author, price, pages]
 *   - order: Sort direction (default: 'ASC') [Whitelisted: ASC, DESC]
 *   - limit: Number of records to return (default: 10, positive integer)
 *   - offset: Number of records to skip (default: 0, non-negative integer)
 *   - min_price: Minimum book price filter (numeric >= 0)
 *   - max_price: Maximum book price filter (numeric >= 0)
 */
app.get('/books/', async (req, res) => {
  try {
    const {
      search_q = '',
      order_by = 'id',
      order = 'ASC',
      limit = '10',
      offset = '0',
      min_price,
      max_price,
    } = req.query;

    // 1. Validate order_by column against whitelist
    const safeOrderBy = order_by.toLowerCase();
    if (!ALLOWED_ORDER_BY_COLUMNS.includes(safeOrderBy)) {
      return res.status(400).json({
        error: `Invalid order_by column '${order_by}'. Allowed columns: ${ALLOWED_ORDER_BY_COLUMNS.join(', ')}`,
        message: `Invalid order_by column '${order_by}'. Allowed columns: ${ALLOWED_ORDER_BY_COLUMNS.join(', ')}`,
      });
    }

    // 2. Validate order direction against whitelist
    const safeOrder = order.toUpperCase();
    if (!ALLOWED_ORDER_DIRECTIONS.includes(safeOrder)) {
      return res.status(400).json({
        error: `Invalid order direction '${order}'. Allowed values: ASC, DESC`,
        message: `Invalid order direction '${order}'. Allowed values: ASC, DESC`,
      });
    }

    // 3. Validate limit (positive integer)
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      return res.status(400).json({
        error: "Invalid limit parameter. Must be a positive integer.",
        message: "Invalid limit parameter. Must be a positive integer.",
      });
    }

    // 4. Validate offset (non-negative integer)
    const parsedOffset = Number(offset);
    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        error: "Invalid offset parameter. Must be a non-negative integer.",
        message: "Invalid offset parameter. Must be a non-negative integer.",
      });
    }

    // 5. Validate min_price if provided
    let parsedMinPrice = null;
    if (min_price !== undefined) {
      parsedMinPrice = Number(min_price);
      if (isNaN(parsedMinPrice) || parsedMinPrice < 0) {
        return res.status(400).json({
          error: "Invalid min_price parameter. Must be a non-negative number.",
          message: "Invalid min_price parameter. Must be a non-negative number.",
        });
      }
    }

    // 6. Validate max_price if provided
    let parsedMaxPrice = null;
    if (max_price !== undefined) {
      parsedMaxPrice = Number(max_price);
      if (isNaN(parsedMaxPrice) || parsedMaxPrice < 0) {
        return res.status(400).json({
          error: "Invalid max_price parameter. Must be a non-negative number.",
          message: "Invalid max_price parameter. Must be a non-negative number.",
        });
      }
    }

    // 7. Validate min_price <= max_price when both provided
    if (parsedMinPrice !== null && parsedMaxPrice !== null && parsedMinPrice > parsedMaxPrice) {
      return res.status(400).json({
        error: "min_price cannot be greater than max_price.",
        message: "min_price cannot be greater than max_price.",
      });
    }

    // Build parameterized query safely
    const whereConditions = [];
    const queryParams = [];

    // Search query on title (case-insensitive LIKE)
    if (search_q && search_q.trim() !== '') {
      whereConditions.push(`title LIKE ?`);
      queryParams.push(`%${search_q.trim()}%`);
    }

    // Price range filters
    if (parsedMinPrice !== null) {
      whereConditions.push(`price >= ?`);
      queryParams.push(parsedMinPrice);
    }

    if (parsedMaxPrice !== null) {
      whereConditions.push(`price <= ?`);
      queryParams.push(parsedMaxPrice);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Safe injection of strictly whitelisted column & direction; values parameterized
    const getBooksQuery = `
      SELECT *
      FROM book
      ${whereClause}
      ORDER BY ${safeOrderBy} ${safeOrder}
      LIMIT ? OFFSET ?;
    `;

    queryParams.push(parsedLimit, parsedOffset);

    const books = await db.all(getBooksQuery, queryParams);
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ error: error.message, message: error.message });
  }
});

/**
 * Route 2: GET /books/:bookId/
 * Description: Retrieve a single book by its ID
 */
app.get('/books/:bookId/', async (req, res) => {
  try {
    const { bookId } = req.params;
    const parsedId = Number(bookId);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return res.status(400).json({
        error: "Invalid bookId parameter. Must be a positive integer.",
        message: "Invalid bookId parameter. Must be a positive integer.",
      });
    }

    const getBookQuery = `SELECT * FROM book WHERE id = ?;`;
    const book = await db.get(getBookQuery, [parsedId]);

    if (!book) {
      return res.status(404).json({
        error: 'Book not found',
        message: 'Book not found',
      });
    }

    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ error: error.message, message: error.message });
  }
});

/**
 * Route 3: POST /books/
 * Description: Insert a new book record with robust field validation
 * Validation:
 *   - title: Required, non-empty string
 *   - author: Required, non-empty string
 *   - price: Required, non-negative number
 *   - pages: Required, positive integer
 */
app.post('/books/', async (req, res) => {
  try {
    const { title, author, price, pages } = req.body;

    // Validate title
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        error: 'Title is required and must be a non-empty string.',
        message: 'Title is required and must be a non-empty string.',
      });
    }

    // Validate author
    if (!author || typeof author !== 'string' || author.trim() === '') {
      return res.status(400).json({
        error: 'Author is required and must be a non-empty string.',
        message: 'Author is required and must be a non-empty string.',
      });
    }

    // Validate price
    if (price === undefined || price === null || typeof price !== 'number' || isNaN(price) || price < 0) {
      return res.status(400).json({
        error: 'Price is required and must be a non-negative number.',
        message: 'Price is required and must be a non-negative number.',
      });
    }

    // Validate pages
    if (pages === undefined || pages === null || typeof pages !== 'number' || !Number.isInteger(pages) || pages <= 0) {
      return res.status(400).json({
        error: 'Pages is required and must be a positive integer.',
        message: 'Pages is required and must be a positive integer.',
      });
    }

    const addBookQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;

    const dbResponse = await db.run(addBookQuery, [title.trim(), author.trim(), price, pages]);
    const bookId = dbResponse.lastID;

    res.status(201).json({
      message: 'Book Added Successfully',
      bookId: bookId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message, message: error.message });
  }
});

/**
 * Route 4: PUT /books/:bookId/
 * Description: Update an existing book's details by ID
 */
app.put('/books/:bookId/', async (req, res) => {
  try {
    const { bookId } = req.params;
    const parsedId = Number(bookId);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return res.status(400).json({
        error: "Invalid bookId parameter. Must be a positive integer.",
        message: "Invalid bookId parameter. Must be a positive integer.",
      });
    }

    // Check if book exists
    const checkBookQuery = `SELECT * FROM book WHERE id = ?;`;
    const existingBook = await db.get(checkBookQuery, [parsedId]);

    if (!existingBook) {
      return res.status(404).json({
        error: 'Book not found',
        message: 'Book not found',
      });
    }

    const { title, author, price, pages } = req.body;

    // Validate optional update fields
    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return res.status(400).json({
        error: 'Title must be a non-empty string.',
        message: 'Title must be a non-empty string.',
      });
    }

    if (author !== undefined && (typeof author !== 'string' || author.trim() === '')) {
      return res.status(400).json({
        error: 'Author must be a non-empty string.',
        message: 'Author must be a non-empty string.',
      });
    }

    if (price !== undefined && (typeof price !== 'number' || isNaN(price) || price < 0)) {
      return res.status(400).json({
        error: 'Price must be a non-negative number.',
        message: 'Price must be a non-negative number.',
      });
    }

    if (pages !== undefined && (typeof pages !== 'number' || !Number.isInteger(pages) || pages <= 0)) {
      return res.status(400).json({
        error: 'Pages must be a positive integer.',
        message: 'Pages must be a positive integer.',
      });
    }

    const updatedTitle = title !== undefined ? title.trim() : existingBook.title;
    const updatedAuthor = author !== undefined ? author.trim() : existingBook.author;
    const updatedPrice = price !== undefined ? price : existingBook.price;
    const updatedPages = pages !== undefined ? pages : existingBook.pages;

    const updateBookQuery = `
      UPDATE book
      SET title = ?, author = ?, price = ?, pages = ?
      WHERE id = ?;
    `;

    await db.run(updateBookQuery, [updatedTitle, updatedAuthor, updatedPrice, updatedPages, parsedId]);

    res.status(200).json({
      message: 'Book Details Updated Successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message, message: error.message });
  }
});

/**
 * Route 5: DELETE /books/:bookId/
 * Description: Delete a book from the database by ID
 */
app.delete('/books/:bookId/', async (req, res) => {
  try {
    const { bookId } = req.params;
    const parsedId = Number(bookId);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return res.status(400).json({
        error: "Invalid bookId parameter. Must be a positive integer.",
        message: "Invalid bookId parameter. Must be a positive integer.",
      });
    }

    const checkBookQuery = `SELECT * FROM book WHERE id = ?;`;
    const existingBook = await db.get(checkBookQuery, [parsedId]);

    if (!existingBook) {
      return res.status(404).json({
        error: 'Book not found',
        message: 'Book not found',
      });
    }

    const deleteBookQuery = `DELETE FROM book WHERE id = ?;`;
    await db.run(deleteBookQuery, [parsedId]);

    res.status(200).json({
      message: 'Book Deleted Successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message, message: error.message });
  }
});

/**
 * Catch-all 404 handler for undefined routes
 */
app.use((req, res) => {
  res.status(404).json({
    error: '404 Not Found: The requested route does not exist.',
    message: '404 Not Found: The requested route does not exist.',
  });
});

module.exports = app;
