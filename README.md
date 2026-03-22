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

- `POST /api/feedback` - Submit feedback (sends email)
- `GET /api/health` - Health check