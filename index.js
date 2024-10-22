const express = require('express');
const app = express();
app.use(express.json());
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');
const path = require('path');
var format = require('date-fns/format');
var isValid = require('date-fns/isValid');
let db = null;
const dbPath = path.join(__dirname, 'expenses.db');

const initializeDBAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database,
        });
        await db.exec(`
            CREATE TABLE IF NOT EXISTS user (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT
            );
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('income', 'expense'))
            );
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER,
                type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                date TEXT NOT NULL,
                description TEXT,
                FOREIGN KEY (userId) REFERENCES user (id)
            );
        `);
        app.listen(3000, () => {
            console.log('Server Running at http://localhost:3000/');
        });
    } catch (e) {
        console.log(`Db Error: ${e.message}`);
        process.exit(1);
    }
};
initializeDBAndServer();

const validTransactionTypes = ['income', 'expense'];
const validCategories = ['Food', 'Transport', 'Salary', 'Utilities', 'Health'];

const authenticateUser = async (request, response, next) => {
    const { username, password } = request.headers;
    const userQuery = `SELECT * FROM user WHERE username = "${username}" AND password = "${password}";`;
    const userDetails = await db.get(userQuery);

    if (userDetails) {
        request.userId = userDetails.id; // Store user ID for later use
        next();
    } else {
        response.status(401).send('Authentication failed');
    }
};

// Register User API
app.post('/register', async (request, response) => {
    const { username, password } = request.body;
    const registerQuery = `INSERT INTO user (username, password) VALUES ("${username}", "${password}")`;
    try {
        await db.run(registerQuery);
        response.send('User registered successfully');
    } catch (e) {
        response.status(400).send('User registration failed: ' + e.message);
    }
});

// Login API
app.post('/login', async (request, response) => {
    const { username, password } = request.body;
    const userQuery = `SELECT * FROM user WHERE username = "${username}" AND password ="${password}";`;
    
    try {
        const userDetails = await db.get(userQuery);

        if (userDetails) {
            response.send({ userId: userDetails.id });
        } else {
            response.status(401).send('Invalid username or password');
        }
    } catch (e) {
        response.status(500).send('Login failed: ' + e.message);
    }
});

// Add Transaction API
app.post('/transactions/', authenticateUser, async (request, response) => {
    const { id, type, amount, category, date, description } = request.body;
    const valDate = isValid(new Date(date));

    if (validTransactionTypes.includes(type)) {
        if (validCategories.includes(category)) {
            if (valDate) {
                const fDate = format(new Date(date), 'yyyy-MM-dd');
                const addTransactionQuery = `
                    INSERT INTO transactions (type, amount, category, date, description, userId) 
                    VALUES (${id}, "${type}", ${amount}, "${category}", "${fDate}", "${description}", ${request.userId});`;
                await db.run(addTransactionQuery);
                response.send('Transaction Successfully Added');
            } else {
                response.status(400).send('Invalid Date');
            }
        } else {
            response.status(400).send('Invalid Category');
        }
    } else {
        response.status(400).send('Invalid Transaction Type');
    }
});

// Convert DB Object to Server Object
function convertDBObjectToServerObject(dbObject) {
    return {
        id: dbObject.id,
        type: dbObject.type,
        amount: dbObject.amount,
        category: dbObject.category,
        date: dbObject.date,
        description: dbObject.description,
    };
}

// Get Transactions API with Pagination
app.get('/transactions/', authenticateUser, async (request, response) => {
    const { category, type, page = 1, limit = 10 } = request.query;
    let getTransactionsQuery = 'SELECT * FROM transactions WHERE userId = ' + request.userId;
    const conditions = [];

    if (category !== undefined) {
        if (validCategories.includes(category)) {
            conditions.push(`category="${category}"`);
        } else {
            return response.status(400).send('Invalid Category');
        }
    }

    if (type !== undefined) {
        if (validTransactionTypes.includes(type)) {
            conditions.push(`type="${type}"`);
        } else {
            return response.status(400).send('Invalid Transaction Type');
        }
    }

    if (conditions.length > 0) {
        getTransactionsQuery += ' AND ' + conditions.join(' AND ');
    }

    const offset = (page - 1) * limit;
    getTransactionsQuery += ` LIMIT ${limit} OFFSET ${offset}`;

    const transactionsArray = await db.all(getTransactionsQuery);
    response.send(transactionsArray.map(each => convertDBObjectToServerObject(each)));
});

// Get Transaction by ID API
app.get('/transactions/:transactionId/', authenticateUser, async (request, response) => {
    const { transactionId } = request.params;
    const getTransactionQuery = `SELECT * FROM transactions WHERE id=${transactionId} AND userId=${request.userId}`;
    const transactionObject = await db.get(getTransactionQuery);

    if (transactionObject) {
        response.send(convertDBObjectToServerObject(transactionObject));
    } else {
        response.status(404).send('Transaction Not Found');
    }
});

// Update Transaction API
app.put('/transactions/:transactionId/', authenticateUser, async (request, response) => {
    const { transactionId } = request.params;
    const { type, amount, category, date, description } = request.body;
    const valDate = date && isValid(new Date(date));

    const updates = [];

    if (type !== undefined && validTransactionTypes.includes(type)) {
        updates.push(`type="${type}"`);
    }
    if (amount !== undefined) {
        updates.push(`amount=${amount}`);
    }
    if (category !== undefined && validCategories.includes(category)) {
        updates.push(`category="${category}"`);
    }
    if (date !== undefined && valDate) {
        const fDate = format(new Date(date), 'yyyy-MM-dd');
        updates.push(`date="${fDate}"`);
    }
    if (description !== undefined) {
        updates.push(`description="${description}"`);
    }

    if (updates.length > 0) {
        const updateTransactionQuery = `UPDATE transactions SET ${updates.join(', ')} WHERE id=${transactionId} AND userId=${request.userId}`;
        await db.run(updateTransactionQuery);
        response.send('Transaction Updated');
    } else {
        response.status(400).send('No valid fields to update');
    }
});

// Get Monthly Spending by Category
app.get('/reports/monthly', authenticateUser, async (request, response) => {
    const { year } = request.query;
    const reportQuery = `
        SELECT 
            strftime('%Y-%m', date) AS month, 
            category, 
            SUM(amount) AS totalAmount
        FROM transactions
        WHERE userId = ${request.userId} AND type = 'expense' AND strftime('%Y', date) = ?
        GROUP BY month, category
        ORDER BY month, category;
    `;

    const reportData = await db.all(reportQuery, [year]);
    response.send(reportData);
});

// Delete Transaction API
app.delete('/transactions/:transactionId/', authenticateUser, async (request, response) => {
    const { transactionId } = request.params;
    const deleteTransactionQuery = `DELETE FROM transactions WHERE id=${transactionId} AND userId=${request.userId}`;
    const result = await db.run(deleteTransactionQuery);

    if (result.changes === 0) {
        response.status(404).send('Transaction Not Found');
    } else {
        response.send('Transaction Deleted');
    }
});

// Get Summary of Transactions
app.get('/summary', authenticateUser, async (request, response) => {
    const { startDate, endDate, category } = request.query;
    let summaryQuery = `
        SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS totalIncome,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS totalExpenses 
        FROM transactions WHERE userId = ${request.userId}`;
    let conditions = [];

    if (startDate) {
        conditions.push(`date >= "${startDate}"`);
    }
    if (endDate) {
        conditions.push(`date <= "${endDate}"`);
    }
    if (category) {
        conditions.push(`category = "${category}"`);
    }

    if (conditions.length > 0) {
        summaryQuery += ' AND ' + conditions.join(' AND ');
    }

    const summary = await db.get(summaryQuery);
    summary.balance = summary.totalIncome - summary.totalExpenses;
    response.send(summary);
});

// Documentation endpoint
app.get('/docs', (request, response) => {
    response.send(`
        <h1>API Documentation</h1>
        
        <h2>User Management</h2>
        <h3>POST /register</h3>
        <p>Registers a new user.</p>
        <h3>POST /login</h3>
        <p>Authenticates a user and returns the user ID.</p>

        <h2>Transactions</h2>
        <h3>POST /transactions</h3>
        <p>Adds a new transaction (income or expense).</p>
        <h3>GET /transactions</h3>
        <p>Retrieves all transactions for the authenticated user.</p>
        <h3>GET /transactions/:transactionId</h3>
        <p>Retrieves a specific transaction by ID for the authenticated user.</p>
        <h3>PUT /transactions/:transactionId</h3>
        <p>Updates a specific transaction by ID for the authenticated user.</p>
        <h3>DELETE /transactions/:transactionId</h3>
        <p>Deletes a specific transaction by ID for the authenticated user.</p>
        <h3>GET /summary</h3>
        <p>Retrieves a summary of transactions for the authenticated user, with optional filters.</p>
    `);
});

module.exports = app;
