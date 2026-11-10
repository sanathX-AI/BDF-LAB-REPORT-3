# BDF Lab 03: REST API with Query Parameters, Validation & Debugging

**Backend Development Fundamentals** · Year II Term II · Aurora  
**Faculty:** Joel Prashanth D  
**Student Name:** K. Sanath Kumar  
**Registration Number:** 252UR5070  
**Section:** AIDE 2A 106  
**Live Deployed API:** [https://bdf-lab-report-3.onrender.com](https://bdf-lab-report-3.onrender.com)  
---

## 1. Project Objective

The objective of Lab 03 is to elevate the basic CRUD API from Lab 02 into an industry-standard **RESTful API** incorporating:
1. **Query Parameters:** Multi-parameter search (`search_q`), sorting (`order_by`, `order`), pagination (`limit`, `offset`), and price-range filtering (`min_price`, `max_price`).
2. **Security & Parameterized Queries:** Strict whitelisting of sort columns and directions; 100% parameterized SQL placeholders (`?`) to completely prevent SQL injection.
3. **Rigorous Input Validation:** Rejection of missing fields, malformed types, invalid price ranges, and unsupported parameters with descriptive `HTTP 400 Bad Request` JSON responses.
4. **Standardized HTTP Status Codes:** `200 OK`, `201 Created`, `400 Bad Request`, `404 Not Found`, and `500 Internal Server Error`.
5. **Practical Debugging Exercises:** Diagnosis and resolution of four frequent backend pitfalls: `EADDRINUSE` port conflict, incorrect module import paths, SQLite table-name typos, and missing `await` statements.
6. **Automated Testing & Evidence:** Comprehensive Postman collection covering both success and negative validation/failure test cases, executed and verified using **Newman** with standalone interactive HTML reporting.
7. **Production Cloud Deployment:** Serverless deployment on **Vercel** with cold-start SQLite database initialization.

---

## 2. Technologies Used

- **Runtime Environment:** Node.js (v24.x)
- **Web Framework:** Express.js (v5.x)
- **Database:** SQLite (`books.db`)
- **Database Drivers:**
  - `sqlite3` (v5.1.7): Low-level native SQLite engine.
  - `sqlite` (v5.1.1): Promise-based async/await wrapper.
- **Testing & Quality Assurance:**
  - Postman: REST API client collection.
  - Newman: CLI test runner.
  - `newman-reporter-htmlextra`: Interactive visual HTML reporting dashboard.
- **Hosting & Serverless Platform:** Vercel

---

## 3. Project Structure

```
lab-03/
├── books.db                    # Pre-populated SQLite database with 10 sample books
├── server.js                   # Express application, validation middleware, and REST routes
├── package.json                # Dependencies, engines, and test scripts
├── package-lock.json           # Exact dependency lockfile
├── vercel.json                 # Vercel serverless functions configuration
├── .gitignore                  # Excludes node_modules/, .env, *.log, .vercel
├── BDF-Lab-03.postman_collection.json  # Comprehensive 18-test Postman collection
├── screenshots/                # Verification reports and test evidence
│   ├── Lab-03-API-Test-Report.html    # Standalone interactive Newman HTMLExtra report
│   ├── test-results.txt               # Plain text terminal test execution summary
│   └── README.md                      # Index of test results and endpoint mapping
└── README.md                   # Complete Lab 03 documentation & Viva guide
```

---

## 4. Database Schema & Sample Records

The application uses a persistent SQLite database table named `book`:

```sql
CREATE TABLE IF NOT EXISTS book (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  price REAL NOT NULL,
  pages INTEGER NOT NULL
);
```

### Pre-Seeded Sample Records (10 Books)

| ID | Title | Author | Price (Rs.) | Pages |
|---|---|---|---|---|
| 1 | Clean Code | Robert C. Martin | 450.0 | 464 |
| 2 | The Pragmatic Programmer | Andrew Hunt and David Thomas | 520.0 | 352 |
| 3 | JavaScript: The Good Parts | Douglas Crockford | 350.0 | 176 |
| 4 | You Don't Know JS | Kyle Simpson | 299.0 | 278 |
| 5 | Design Patterns | Erich Gamma et al. | 650.0 | 395 |
| 6 | Refactoring | Martin Fowler | 580.0 | 448 |
| 7 | Introduction to Algorithms | Thomas H. Cormen | 890.0 | 1312 |
| 8 | Structure and Interpretation of Computer Programs | Harold Abelson | 720.0 | 657 |
| 9 | Head First Design Patterns | Eric Freeman | 480.0 | 694 |
| 10 | Cracking the Coding Interview | Gayle Laakmann McDowell | 550.0 | 687 |

---

## 5. REST API Endpoints & Query Parameters

### Root Endpoint
- **URL:** `GET /`
- **Description:** Returns API welcome message, student information, and available endpoint directory.
- **Status Code:** `200 OK`

---

### Endpoint 1: Search, Filter, Sort, and Paginate Books
- **URL:** `GET /books/`
- **Method:** `GET`
- **Description:** Retrieves books based on optional query parameters.

#### Supported Query Parameters

| Parameter | Type | Default | Description | Validation Rule |
|---|---|---|---|---|
| `search_q` | String | `""` (empty) | Case-insensitive partial title match using SQL LIKE | Sanitized and trimmed |
| `order_by` | String | `'id'` | Column to sort by | Whitelisted: id, title, author, price, pages |
| `order` | String | `'ASC'` | Sort direction | Whitelisted: ASC, DESC |
| `limit` | Integer | `10` | Maximum number of records to return | Must be a positive integer |
| `offset` | Integer | `0` | Number of records to skip | Must be a non-negative integer |
| `min_price` | Number | `null` | Lower price threshold | Must be a non-negative number |
| `max_price` | Number | `null` | Upper price threshold | Must be a non-negative number |

> **Special Validation:** If both `min_price` and `max_price` are provided, `min_price <= max_price` is strictly enforced.

---

### Endpoint 2: Get Single Book by ID
- **URL:** `GET /books/:bookId/`
- **Method:** `GET`
- **Path Parameter:** `bookId` (positive integer)
- **Response:**
  - `200 OK`: Single book JSON object.
  - `400 Bad Request`: `bookId` is not a positive integer.
  - `404 Not Found`: Book ID does not exist in the database.

---

### Endpoint 3: Create New Book
- **URL:** `POST /books/`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "title": "Designing Data-Intensive Applications",
    "author": "Martin Kleppmann",
    "price": 799.0,
    "pages": 616
  }
  ```
- **Response:**
  - `201 Created`: `{"message": "Book Added Successfully", "bookId": 11}`
  - `400 Bad Request`: Validation failure message.

---

### Endpoint 4: Update Book Details
- **URL:** `PUT /books/:bookId/`
- **Method:** `PUT`
- **Response:**
  - `200 OK`: `{"message": "Book Details Updated Successfully"}`
  - `400 Bad Request`: Invalid body field types.
  - `404 Not Found`: Book does not exist.

---

### Endpoint 5: Delete Book by ID
- **URL:** `DELETE /books/:bookId/`
- **Method:** `DELETE`
- **Response:**
  - `200 OK`: `{"message": "Book Deleted Successfully"}`
  - `404 Not Found`: Book does not exist.

---

## 6. Security & Parameterized Query Implementation

All user-provided data is bound via parameterized placeholders (`?`) to prevent SQL Injection attacks.

```javascript
// SECURE: Parameterized Query with Safe Whitelisting
const whereConditions = [];
const queryParams = [];

if (search_q && search_q.trim() !== '') {
  whereConditions.push(`title LIKE ?`);
  queryParams.push(`%${search_q.trim()}%`);
}

if (parsedMinPrice !== null) {
  whereConditions.push(`price >= ?`);
  queryParams.push(parsedMinPrice);
}

if (parsedMaxPrice !== null) {
  whereConditions.push(`price <= ?`);
  queryParams.push(parsedMaxPrice);
}

const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
const getBooksQuery = `SELECT * FROM book ${whereClause} ORDER BY ${safeOrderBy} ${safeOrder} LIMIT ? OFFSET ?;`;
queryParams.push(parsedLimit, parsedOffset);
const books = await db.all(getBooksQuery, queryParams);
```

---

## 7. Debugging Exercises & Solutions

### 1. EADDRINUSE (Address Already in Use) Port Conflict
- **Symptom:** `Error: listen EADDRINUSE: address already in use :::3000`
- **Diagnosis:** A background process is already bound to TCP port 3000.
- **Fix:**
  - Made port configurable: `const PORT = process.env.PORT || 3000;`
  - Added graceful error handler on the server
  - Terminated conflicting processes using `npx kill-port 3000`

---

### 2. Wrong Import Path (MODULE_NOT_FOUND)
- **Symptom:** `Error: Cannot find module '../server'`
- **Diagnosis:** Relative file path misconfiguration.
- **Fix:** Used `path.join(__dirname, ...)` for cross-platform compatibility.

---

### 3. SQLite Table-Name Typo (no such table)
- **Symptom:** `SQLITE_ERROR: no such table: books`
- **Diagnosis:** Table was created as `book` (singular) but query used `books` (plural).
- **Fix:** Standardized all queries to use singular noun `book`.

---

### 4. Missing await During Async Database Operations
- **Symptom:** Responses return empty objects `{}` or raw `[object Promise]`.
- **Diagnosis:** Omitting `await` before Promise-returning database methods.
- **Fix:**
  ```javascript
  // INCORRECT:
  // const books = db.all(getBooksQuery); // returns Promise { <pending> }

  // CORRECT:
  const books = await db.all(getBooksQuery, queryParams);
  res.status(200).json(books);
  ```

---

## 8. Newman Test Results (18 Tests / 36 Assertions Passed)

All 18 requests and 36 test assertions executed against the live Render API using **Newman**:

### Live API Test URLs

| # | Method | Live URL | Expected |
|---|---|---|---|
| 1 | GET | [/books/](https://bdf-lab-report-3.onrender.com/books/) | 200 OK |
| 2 | GET | [/books/?search_q=Clean](https://bdf-lab-report-3.onrender.com/books/?search_q=Clean) | 200 OK |
| 3 | GET | [/books/?order_by=price&order=ASC](https://bdf-lab-report-3.onrender.com/books/?order_by=price&order=ASC) | 200 OK |
| 4 | GET | [/books/?order_by=price&order=DESC](https://bdf-lab-report-3.onrender.com/books/?order_by=price&order=DESC) | 200 OK |
| 5 | GET | [/books/?limit=3&offset=0](https://bdf-lab-report-3.onrender.com/books/?limit=3&offset=0) | 200 OK |
| 6 | GET | [/books/?min_price=400&max_price=600](https://bdf-lab-report-3.onrender.com/books/?min_price=400&max_price=600) | 200 OK |
| 7 | GET | [/books/1/](https://bdf-lab-report-3.onrender.com/books/1/) | 200 OK |
| 8 | POST | [/books/](https://bdf-lab-report-3.onrender.com/books/) | 201 Created |
| 9 | POST | [/books/ (missing title)](https://bdf-lab-report-3.onrender.com/books/) | 400 Bad Request |
| 10 | POST | [/books/ (missing author)](https://bdf-lab-report-3.onrender.com/books/) | 400 Bad Request |
| 11 | POST | [/books/ (bad price)](https://bdf-lab-report-3.onrender.com/books/) | 400 Bad Request |
| 12 | GET | [/books/?order_by=injection_attempt](https://bdf-lab-report-3.onrender.com/books/?order_by=injection_attempt) | 400 Bad Request |
| 13 | GET | [/books/?min_price=900&max_price=300](https://bdf-lab-report-3.onrender.com/books/?min_price=900&max_price=300) | 400 Bad Request |
| 14 | PUT | [/books/2/](https://bdf-lab-report-3.onrender.com/books/2/) | 200 OK |
| 15 | DELETE | [/books/10/](https://bdf-lab-report-3.onrender.com/books/10/) | 200 OK |
| 16 | GET | [/books/99999/](https://bdf-lab-report-3.onrender.com/books/99999/) | 404 Not Found |
| 17 | PUT | [/books/99999/](https://bdf-lab-report-3.onrender.com/books/99999/) | 404 Not Found |
| 18 | DELETE | [/books/99999/](https://bdf-lab-report-3.onrender.com/books/99999/) | 404 Not Found |

### Newman Terminal Output

![Newman Test Results - All 36 Assertions Passed](screenshots/newman-test-results.png)

```
iterations: 1 | requests: 18 | assertions: 36 | failed: 0
SUCCESS: ALL 36 ASSERTIONS PASSED!
```

---

## 9. Vercel Deployment & SQLite Persistence Limitations

1. **Read-Only Serverless Bundle:** Vercel serverless functions run in an immutable Lambda container. Attempting to write directly to `./books.db` causes `EROFS: read-only file system` error.
2. **Cold-Start /tmp Initialization:** When `process.env.VERCEL` is active, the application copies `books.db` to `/tmp/books.db` on cold boot to allow read-write access.
3. **Stateless Container Lifecycle:** The `/tmp` directory is ephemeral. Any modifications reset when the serverless function initializes a new container. For permanent persistence, use cloud databases like PostgreSQL (Neon/Supabase) or Turso.

---

## 10. Technical Viva Q&A

### Q1: What is the difference between a query parameter and a path parameter?
- **Path Parameter:** Part of the hierarchical URL path (e.g., `/books/1/`). Identifies a **specific resource**. Omitting it changes the endpoint route.
- **Query Parameter:** Appended after `?` in the URL (e.g., `/books/?search_q=Clean&order_by=price`). Used for **filtering, sorting, and pagination**. Optional.

---

### Q2: What does stateless mean in RESTful API architecture?
- Each HTTP request must contain all information necessary for the server to process it independently.
- The server does **not store any client session context** between requests.
- **Benefits:** High scalability, fault tolerance, and simplified caching.

---

### Q3: Which HTTP status code is used for bad input vs a missing record?
- **Bad Input:** `HTTP 400 Bad Request` — client sent malformed data, missing fields, or invalid parameters.
- **Missing Record:** `HTTP 404 Not Found` — request is well-formed but the resource doesn't exist in the database.

---

## 11. Installation & Local Execution Guide

### Prerequisites
- Node.js (v18.x or v24.x)
- npm

### Setup Steps:
```bash
# 1. Navigate to lab-03 directory
cd lab-03

# 2. Install dependencies
npm install

# 3. Start server locally
npm start

# 4. For live auto-reloading during development
npm run dev

# 5. Run automated Newman tests
npm run test:api
```

