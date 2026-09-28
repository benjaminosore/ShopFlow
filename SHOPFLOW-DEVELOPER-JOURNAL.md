ShopFlow Developer Journal

Day 1 — Project Planning

Project Name

ShopFlow

Project Type

Full-Stack E-commerce Management Platform

Project Vision

ShopFlow is a modern full-stack e-commerce platform designed to help a small business manage its online store and day-to-day sales operations.

The platform will have a customer-facing shopping experience and an administrative management dashboard.

Customers will be able to browse products, view product details, add products to a cart, checkout, place orders, and view their order history.

Administrators will be able to manage products, categories, inventory, customers, orders, and sales information through a dynamic dashboard.

Technology Stack

Frontend

React
JavaScript
HTML
CSS

Backend

Node.js
Express.js
REST API
JSON

Database

MySQL

Development Tools

Git
GitHub
Postman
VS Code

System Architecture

React Frontend
↓
Node.js + Express REST API
↓
MySQL Database

The React frontend will communicate with the backend through HTTP requests and JSON responses.

The Node.js and Express backend will handle API requests, business logic, authentication, validation, and communication with the MySQL database.

Main Users

Customer

A customer will be able to:

Register and log in
Browse products
Search and filter products
View product details
Add products to a shopping cart
Checkout
Place orders
View previous orders

Administrator

An administrator will be able to:

Log in securely
View the dashboard
Manage products
Manage categories
Manage inventory
Manage customers
Manage orders
View sales information
View reports

Project Goal

The main goal of ShopFlow is to build a complete, modern full-stack application that demonstrates practical software development skills.

The project will demonstrate:

React development
REST API development
Node.js and Express
MySQL database design
Authentication and authorization
CRUD operations
API integration
Git and GitHub
Testing
Error handling
Security
Responsive UI design
Software documentation

Development Approach

ShopFlow will be developed incrementally.

Each major feature will be planned, implemented, tested, documented, and committed to Git before moving to the next feature.

The developer will understand the technologies, code, architecture, and decisions used in the project rather than simply copying code.

Interview Goal

ShopFlow is being developed as an interview-ready portfolio project.

The developer should be able to explain:

Why React was selected for the frontend
Why Node.js and Express were selected for the backend
How the REST API works
How React communicates with the API
How the MySQL database is structured
How authentication works
How orders are processed
How inventory is updated
How errors are handled
How the application is tested
How the application is deployed

Version Control: 
Git was initialized for the ShopFlow project, and the default branch was set to main. Git will be used to track development progress, feature changes, and project milestones.

Commit: docs: add ShopFlow developer journal
Purpose: Created the initial developer journal containing the ShopFlow project vision, architecture, development approach, technology choices, and interview goals.

Git Best Practice: 
A .gitignore file will be used to prevent dependencies, environment files, secrets, generated files, and other unnecessary files from being committed to the repository.

`.gitignore` Verification

The ShopFlow `.gitignore` was configured for the React + Node.js project.

The ignore rules were tested using Git:

`.env` is ignored to protect environment variables and database credentials.
`node_modules/` is ignored to prevent installed dependencies from being committed.
Build files, logs, coverage files, IDE files, and operating-system files are also excluded.

Verification commands:
`git check-ignore -v .env`
`git check-ignore -v node_modules/`

Both tests confirmed that Git is correctly applying the `.gitignore` rules.

Second Commit

Commit:`chore: add project gitignore`

Purpose: Added project-specific Git ignore rules and updated the developer journal with the Git setup and verification details.

GitHub Repository

The local ShopFlow Git repository was connected to the public GitHub repository:

`https://github.com/benjaminosore/ShopFlow`

The local `main` branch was pushed successfully to GitHub and configured to track `origin/main`.

Result:The ShopFlow project is now backed up remotely and ready for collaborative, version-controlled development.

Initial commits:

`47b9650` — `docs: add ShopFlow developer journal`
`ed881fc` — `chore: add project gitignore`

Day 2 — Backend Setup
Backend Initialization: The ShopFlow backend was initialized as a Node.js project using npm init -y. This created package.json, which will manage backend metadata, scripts, and dependencies.

Module System Decision

ShopFlow will use ES Modules (ESM)for the Node.js backend instead of CommonJS.

CommonJS:
`const express = require("express");`

ES Modules:
`import express from "express";`

The `package.json` configuration was changed from:

`"type": "commonjs"`

to:

`"type": "module"`

Why ESM was selected:

It is the standardized JavaScript module system.
It uses modern `import` and `export` syntax.
It keeps the backend module syntax consistent with modern React development.
It supports the modular architecture planned for ShopFlow.
 Understanding ESM also helps the developer understand modern Node.js projects.

Interview takeaway: The developer should be able to explain the difference between CommonJS and ES Modules and why ESM was selected for ShopFlow.

Backend Dependencies

The ShopFlow backend was initialized with the following Node.js packages:

Express 5.2.1— REST API and HTTP server framework.
CORS 2.8.6 — controls cross-origin communication between the frontend and backend.
dotenv 18.0.2 — loads configuration and secrets from environment variables.
mysql2 3.24.4— provides MySQL connectivity for the Node.js backend.

The installation completed successfully with 0 vulnerabilities reported by npm.

`package.json` and `package-lock.json` now record the project's backend dependencies and their versions.

Backend Architecture

ShopFlow will use a modular backend architecture based on Node.js and Express.js.

The backend will separate responsibilities into:

 `config/` — application and database configuration
`controllers/` — request and response handling
`middleware/` — authentication, validation, and error handling
`models/` — database-related logic
 `routes/` — REST API endpoint definitions
 `services/` — business logic
`app.js` — main Express application

This structure is intended to improve maintainability, readability, testing, and scalability.

Interview takeaway: The developer should be able to explain why backend responsibilities are separated instead of placing all application logic inside a single file.
app.js is the main entry point of the ShopFlow Express backend. It will configure the application, middleware, API routes, and error handling.

First Backend Code:
app.js is the central Express application file. The application will be built incrementally, starting with the Express server configuration and then adding middleware, routes, database connectivity, and error handling.

First Express Import

ShopFlow uses the ES Module syntax to import Express:

javascript
import express from "express";


This makes the Express framework available to the ShopFlow backend so we can create and configure the HTTP server.

Interview takeaway: Because ShopFlow uses `"type": "module"` in `package.json`, backend files use modern `import` and `export` syntax.

const app = express(); creates the ShopFlow Express application instance. The app object will be used to configure middleware, routes, error handling, and other backend behavior.

JSON Middleware

ShopFlow uses Express JSON middleware:

javascript
app.use(express.json());


This allows the Express backend to parse incoming JSON request bodies.

For example, when the React frontend sends customer registration data as JSON, Express can make that data available through `req.body`.

Interview takeaway: `express.json()` allows Express to parse JSON request bodies sent to the API.

Initial Express Application

The ShopFlow Express application was configured with:

CORS middleware for communication between the React frontend and backend.
JSON middleware for parsing JSON request bodies.
A `GET /api/health` endpoint for checking API availability.
An ES Module export so the Express application can be imported by the server entry point.

The health-check endpoint returns a JSON response confirming that the ShopFlow API is running.

Interview takeaway: A health-check endpoint provides a simple way to verify that the backend service is running and responding to HTTP requests.

Server Entry Point

ShopFlow separates the Express application configuration from server startup.

`app.js` configures the Express application, middleware, and routes.
`server.js` imports the application and starts the HTTP server.
The development server uses port `5000`.

This separation makes the backend easier to maintain and test.

Architecture:

`server.js → app.js → Express → REST API`

Interview takeaway: Separating application configuration from server startup allows the Express app to be reused independently, which is useful for testing and maintainability.

First Working API

ShopFlow's backend was successfully started using Node.js and Express.

The first API endpoint created was:

`GET /api/health`

The endpoint returns a JSON response confirming that the API is running.

Request:
`GET http://localhost:5000/api/health`

Expected response:

json
{
  "status": "success",
  "message": "ShopFlow API is running"
}


This confirmed that the Node.js server, Express application, middleware, routing, and JSON response handling are working correctly.

Interview takeaway: A health-check endpoint can be used to verify that an API service is available and responding correctly.

Database Technology: ShopFlow uses MySQL as its relational database. The Node.js backend will communicate with MySQL using the mysql2 package.

Database Environment: ShopFlow uses MariaDB 10.4.32 provided by XAMPP for local development. The Node.js backend connects to the database through the mysql2 package.

ShopFlow Database

A dedicated MariaDB database named `shopflow` was created for the project.

The database will contain the relational data required by ShopFlow, including users, categories, products, orders, order items, inventory-related information, and reporting data.

The database is running locally through the XAMPP MariaDB environment.

Interview takeaway: ShopFlow uses a dedicated relational database to keep application data organized and isolated from other projects.

Database Selection: The shopflow database was selected as the active database using USE shopflow;. All subsequent ShopFlow schema operations will be performed within this database.

Database Schema Design

ShopFlow's initial relational database design consists of five core tables:

1. users — stores customer and administrator accounts.
2. categories — stores product categories.
3. products — stores products, pricing, inventory, and category relationships.
4. orders — stores customer orders and their status.
5. order_items — stores the individual products and quantities belonging to each order.

Core Relationships

One user can have many orders.
One order can contain many order items.
One product can appear in many order items.
One category can contain many products.

Primary keys and foreign keys will enforce these relationships.

The schema will also use appropriate constraints, indexes, timestamps, and controlled values to maintain data integrity.

Interview takeaway: `order_items` acts as the junction/detail table between orders and products, allowing one order to contain multiple products while preserving quantity and purchase price.

Categories Table

The first ShopFlow database table created was `categories`.

The table contains:

A unique auto-incrementing primary key.
A unique category name.
An optional description.
Creation and update timestamps.

The `UNIQUE` constraint on the category name prevents duplicate category names.

This table will later be referenced by the `products` table through a foreign key relationship.

Interview takeaway: Database constraints such as primary keys, `NOT NULL`, and `UNIQUE` help maintain data integrity at the database level rather than relying entirely on application code.

Database Schema Management

ShopFlow database definitions will be maintained in SQL files rather than being entered manually through the MariaDB interactive terminal.

The main schema will be stored in:

`database/schema.sql`

This approach makes the database structure:

Reusable
Version-controlled
Easier to review
Easier to recreate
Less prone to manual typing errors

A separate `seed.sql` file may later be used for development/test data.

Core E-commerce Tables

The ShopFlow schema was extended with three core tables:

 `products` — stores product information, pricing, inventory, images, and category relationships.
`orders` — stores customer orders, order status, totals, and timestamps.
`order_items` — stores the individual products contained in each order, including quantity and the price at the time of purchase.

Database Design Decisions

 `DECIMAL(10,2)` is used for monetary values.
Foreign keys enforce relationships between related tables.
Indexes are added to frequently queried relationship and filtering columns.
`ON DELETE RESTRICT` protects important historical records from accidental deletion.
`ON DELETE CASCADE` allows order items to be removed automatically when their parent order is deleted.
`unit_price` is stored in `order_items` so historical orders preserve the price paid at the time of purchase.

Interview takeaway: A well-designed relational database doesn't only store data; constraints, indexes, and relationships help enforce business rules and data integrity.

Database Schema Implementation

The ShopFlow database schema was successfully executed against the local `shopflow` MariaDB database.

The following five core tables were created and verified:

 `users` — customer and administrator accounts
`categories` — product categories
 `products` — product catalog and inventory
`orders` — customer orders and order status
`order_items` — individual products belonging to orders

The schema was executed from the version-controlled `database/schema.sql` file instead of entering each table definition manually in the MariaDB terminal.

Verification using `SHOW TABLES;` confirmed that all five tables exist.

Development lesson:
Maintaining database structure in SQL files makes the database easier to reproduce, version-control, review, and maintain across development environments.

Interview takeaway:
ShopFlow's database is built around relational data modeling with primary keys, foreign keys, constraints, indexes, and appropriate data types for e-commerce data.

Database Structure Verification

After executing `database/schema.sql`, the structure of all five ShopFlow tables was inspected using MariaDB `DESCRIBE` commands.

The verification confirmed that:

All primary keys use auto-incrementing unsigned integers.
User email addresses are uniquely constrained.
User roles are restricted to `customer` and `admin`.
Passwords are represented by a `password_hash` field rather than plain-text passwords.
Products contain category references, pricing, inventory quantities, and optional image URLs.
Product prices and order amounts use `DECIMAL(10,2)` for monetary values.
Orders are associated with users and have controlled order statuses.
Order items connect orders to products and store quantity and unit price.
Foreign-key columns have indexes for efficient relational queries.
Created and updated timestamps are automatically maintained.

No schema corrections were required after verification.

Development lesson:
Database design should be verified after schema creation rather than assuming that a successful SQL execution means the structure is correct.

Interview takeaway:
ShopFlow demonstrates relational database modeling, normalization, constraints, indexing, foreign-key relationships, controlled values, and appropriate data types for e-commerce transactions.

Environment Configuration

ShopFlow uses environment variables to store application and database configuration separately from the source code.

The backend environment variables include:

`PORT` — Node.js server port
`DB_HOST` — database server host
`DB_PORT` — MariaDB port
`DB_USER` — database username
`DB_PASSWORD` — database password
`DB_NAME` — ShopFlow database name

The `.env` file is excluded from Git using `.gitignore` so local configuration and credentials are not committed to the public repository.

Development lesson:
Environment variables make applications easier to configure across development, testing, and production environments while reducing the risk of exposing sensitive configuration.

Interview takeaway:
Production applications should not hardcode database credentials or secrets directly in source code.

MariaDB Connection Pool

ShopFlow connects to MariaDB using the `mysql2` package and a connection pool.

The database configuration is stored in environment variables and loaded using `dotenv`.

The connection pool is configured with:

Database host
Database port
Database username
Database password
Database name
Connection pooling
Maximum connection limit
Connection queueing

ShopFlow uses `mysql2/promise` so database operations can use JavaScript `async/await`.

Development lesson:
A connection pool allows the application to reuse database connections instead of creating a new connection for every request.

Interview takeaway:
The backend separates database configuration from application code and uses connection pooling to manage database access efficiently.

Node.js Database Connection Test

A database connection test was created using `mysql2/promise` and the ShopFlow database connection pool.

The test executed the query:

`SELECT DATABASE() AS database_name`

The result confirmed:

Node.js successfully loaded the environment configuration.
`dotenv` successfully loaded the database variables.
`mysql2` successfully established a connection.
The backend successfully communicated with MariaDB.
The active database was confirmed as `shopflow`.

Result:

`Database connection successful!`

`Connected database: shopflow`

Development lesson:
Testing the database connection independently helps identify configuration or connectivity problems before building application features on top of the database.

Interview takeaway:
ShopFlow's Node.js backend has a working database layer using environment configuration and a reusable MariaDB connection pool.

Database Integrated with Express API

The ShopFlow MariaDB database was successfully integrated into the Express backend.

The `/api/health` endpoint was refactored into a modular route and controller structure:

`healthRoutes.js → healthController.js → database.js → MariaDB`

The endpoint successfully returned:

API status: `success`
API message: `ShopFlow API is running`
Database status: `connected`
Database name: `shopflow`

This confirms that the Express application can successfully communicate with the ShopFlow MariaDB database through the `mysql2` connection pool.

Development lesson:
Separating routes, controllers, and database configuration creates a modular backend structure that is easier to maintain and extend.

Interview takeaway:
ShopFlow now has a working Express REST API connected to a relational MariaDB database through a reusable connection pool.

Categories REST API

The Categories API was implemented as the first complete CRUD resource in ShopFlow.

Endpoints

| Method | Endpoint | Purpose |
GET | `/api/categories` | Retrieve all categories |
GET | `/api/categories/:id` | Retrieve one category |POST | `/api/categories` /Create a category/
PUT | `/api/categories/:id` | Update a category |
DELETE | `/api/categories/:id` | Delete a category |

Architecture

The implementation follows the ShopFlow backend structure:

`Route → Controller → Model → Database`

- Routes-define the HTTP endpoints.
- Controllers-validate requests and return HTTP responses.
- Models- handle database operations.
- MariaDB-stores the category records.

Validation and Error Handling

The API validates that a category name is provided before creating or updating a category.

The API also handles:

`400 Bad Request` — missing category name
`404 Not Found` — category does not exist
`409 Conflict` — duplicate category name
`500 Internal Server Error` — unexpected server/database failure

Database queries use parameterized placeholders (`?`) instead of directly inserting user input into SQL statements.

Testing

The Categories API was tested using `curl` from Git Bash.

The following operations were successfully verified:

1. Created an `Electronics` category.
2. Retrieved all categories.
3. Retrieved a category by ID.
4. Updated the category to `Home Appliances`.
5. Retrieved the updated category and confirmed the database timestamp changed.
6. Deleted the category.
7. Retrieved all categories again and confirmed the result was empty.

This completed the first full CRUD resource for the ShopFlow REST API.
















