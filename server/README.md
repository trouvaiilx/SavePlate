# SavePlate API Server

This directory contains the REST API backend for the SavePlate application.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database Client**: `mysql2`
- **Authentication**: JWT (`jsonwebtoken`) & `bcrypt` for password hashing
- **Emails**: `nodemailer`
- **Security**: `express-rate-limit`, `cors`

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- MySQL database running (see the `/database` folder for schema setup)

### Installation

1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy the provided `.env.example` file to a new file named `.env` and fill in the necessary configuration (e.g., database credentials, JWT secret, email SMTP settings).

### Running the Server

- **Development mode** (with auto-reload via `nodemon`):
  ```bash
  npm run dev
  ```
- **Production mode**:
  ```bash
  npm start
  ```

The server will typically start on `http://localhost:5000` (or the port specified in your `.env` file).
