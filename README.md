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

3. **Set up Google Sheets API (for reading feedback data):**
   - Create a Google Cloud project: https://console.cloud.google.com/
   - Enable the Google Sheets API
   - Create a service account: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Generate a JSON key for the service account and download it
   - Rename the downloaded file to `service-account-key.json` and place it in the project root
   - Share the Google Sheet (https://docs.google.com/spreadsheets/d/1FQwb3NNwOKc-2zF2GCFDhXn-obWp4YrTlAT5ehJA80U/edit) with the service account email (found in the JSON key file)
   - Ensure the sheet has headers in row 1: name, role, location, product, kitease, accuracy, rating, satisfaction, issue, suggestion, feedback

4. **Run the backend server:**
   ```bash
   npm start
   ```
   The server will run on http://localhost:5000

5. **Open the feedback form:**
   - Open `index.html` in your browser
   - The form will automatically send feedback emails to soilguard8@gmail.com

## Features

- Multi-step feedback form for different SoilGuard products
- User information collection (name, role, location)
- Product-specific ratings and satisfaction surveys
- Automatic email notifications to Gmail

- Persistent storage in SQLite database
- Secure API access with JWT authentication
- Data export to Google Sheets via SheetDB API
- Responsive design

## API

- `POST /api/register` - Register account with `{username, password}`
- `POST /api/login` - Login with `{username, password}`, returns `{token}`
- `POST /api/feedback` - Submit feedback (sends email + stores in SQLite) Immutable. Optional auth bearer token attaches `userId`.
- `GET /api/feedbacks` - Retrieve all submitted feedback entries (requires Bearer JWT) with pagination + filters:
  - `page`, `limit` (default 20, max 100)
  - `role`, `product`, `fromDate`, `toDate`
- `GET /api/sheetdb-data` - Retrieve feedback data from SheetDB (requires Bearer JWT)
- `GET /api/sheet-feedback` - Retrieve feedback data directly from Google Sheets (requires Bearer JWT)
- `GET /api/apps-script-feedback` - Retrieve feedback data via Google Apps Script (requires Bearer JWT)
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
