<<<<<<< HEAD
# Expense Tracker API

This is a simple application for tracking income and expenses. It allows users to register, log in, manage transactions, and retrieve various reports and summaries.

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Postman Collection](#postman-collection)
- [Technologies Used](#technologies-used)

## Features

- User registration and authentication
- Add, update, delete, and retrieve transactions
- Filter transactions by category and type
- Pagination for transaction retrieval
- Monthly spending reports by category
- Summary of transactions with optional date filters

## Getting Started

### Prerequisites

- Node.js (>= 12.x)
- SQLite3

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/expense-tracker.git
   cd expense-tracker
2. Install dependencies:
    npm install
3. Run the application:
    node index.js
    The server will start running at http://localhost:3000/.

4. Database Setup
    The application will automatically create a SQLite database file named expenses.db in the root directory and initialize the required tables upon first run.

5. API Endpoints
    User Management

    POST /register

    Registers a new user.
        Request Body: { "username": "exampleUser", "password": "examplePass" }
        POST /login

    Authenticates a user and returns the user ID.
        Request Body: { "username": "exampleUser", "password": "examplePass" }
        Response: { "userId": 1 }

    Transactions

    POST /transactions

    Adds a new transaction (income or expense).
    Request Body: json
        {
        "type": "expense",
        "amount": 100,
        "category": "Food",
        "date": "2023-10-01",
        "description": "Groceries"
        }

    GET /transactions
        Retrieves all transactions for the authenticated user, with optional filtering and pagination.
        Query Parameters: ?category=Food&type=expense&page=1&limit=10

    GET /transactions/
        Retrieves a specific transaction by ID for the authenticated user.

    PUT /transactions/
        Updates a specific transaction by ID for the authenticated user.
        Request Body: json
            {
            "amount": 120
            }

    DELETE /transactions/
        Deletes a specific transaction by ID for the authenticated user.

    Reports

    GET /reports/monthly
        Retrieves monthly spending by category for a specified year.
        Query Parameters: ?year=2023

    Summary

    GET /summary
        Retrieves a summary of transactions for the authenticated user, with optional filters for date and category.
        
5. Usage Examples
    Use Postman or any other API client to interact with the endpoints. Here are some example requests:

    Register a User
        POST http://localhost:3000/register
        Content-Type: application/json
            {
            "username": "johnDoe",
            "password": "password123"
            }
            
    Login a User
        POST http://localhost:3000/login
        Content-Type: application/json
            {
            "username": "johnDoe",
            "password": "password123"
            }

    Add a Transaction
        POST http://localhost:3000/transactions
        Content-Type: application/json
            {
            "type": "expense",
            "amount": 50,
            "category": "Transport",
            "date": "2023-10-15",
            "description": "Bus ticket"
            }

    Get Monthly Report
        GET http://localhost:3000/reports/monthly?year=2023
    
6. Postman Collection
    You can use the provided Postman collection to test all the API endpoints. It includes examples for each of the operations.

7. Technologies Used
    Node.js
    Express.js
    SQLite3
    date-fns for date handling
=======
# expenses-tracker
>>>>>>> 82381398de69c6d60f48be9f4e7da5eaa0a888e9
