# SoilGuard Feedback Form

A feedback collection form for SoilGuard products with backend email integration.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Gmail credentials:**
   - Go to your Gmail account settings
   - Enable 2-factor authentication if not already enabled
   - Generate an App Password: https://support.google.com/accounts/answer/185833
   - Update the `.env` file with your Gmail credentials:
     ```
     GMAIL_USER=soilguard8@gmail.com
     GMAIL_APP_PASSWORD=your_generated_app_password
     ```

3. **Run the backend server:**
   ```bash
   npm start
   ```
   The server will run on http://localhost:5000

4. **Open the feedback form:**
   - Open `index.html` in your browser
   - The form will automatically send feedback emails to soilguard8@gmail.com

## Features

- Multi-step feedback form for different SoilGuard products
- User information collection (name, role, location)
- Product-specific ratings and satisfaction surveys
- Automatic email notifications to Gmail
- Responsive design

## API

- `POST /api/register` - Register account with `{username, password}`
- `POST /api/login` - Login with `{username, password}`, returns `{token}`
- `POST /api/feedback` - Submit feedback (sends email + stores in SQLite) Immutable. Optional auth bearer token attaches `userId`.
- `GET /api/feedbacks` - Retrieve all submitted feedback entries (requires Bearer JWT) with pagination + filters:
  - `page`, `limit` (default 20, max 100)
  - `role`, `product`, `fromDate`, `toDate` (ISO timestamp)
- `GET /api/health` - Health check

### View saved user info

1. Register and login:
   - `POST http://localhost:5000/api/register`
   - `POST http://localhost:5000/api/login`
2. Use returned token in `Authorization: Bearer <token>` header.
3. Query feedback list:
   - `GET http://localhost:5000/api/feedbacks?page=1&limit=20`

Example filter:
- `GET http://localhost:5000/api/feedbacks?role=farmer&product=kit&fromDate=2025-01-01T00:00:00Z&toDate=2026-12-31T23:59:59Z`

> Requires secure authentication to protect user information. JWT secret is set via `.env` as `JWT_SECRET`.

### Env settings

- `GMAIL_USER` - soilguard8@gmail.com
- `GMAIL_APP_PASSWORD` - Gmail app password
- `JWT_SECRET` - secret for token signing (set to secure random string in production)
