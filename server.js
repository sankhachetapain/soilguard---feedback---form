require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from current directory

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // soilguard8@gmail.com
    pass: process.env.GMAIL_APP_PASSWORD // App password from Gmail
  }
});

// API endpoint for feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const data = req.body;

    // Format the email content
    const emailContent = `
SoilGuard Feedback Submission

Product: ${data.productName} (${data.product})
Timestamp: ${data.timestamp}

User Information:
- Name: ${data.name}
- Role: ${data.role}
- Location: ${data.location}

Ratings:
${Object.entries(data.ratings).map(([key, value]) => `- ${key}: ${value} stars`).join('\n')}

Satisfaction: ${data.satisfaction}
Suggestions: ${data.suggestions}

Recommendation: ${data.recommend}

Language: ${data.lang}
`;

    // Send email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER, // Send to the same email
      subject: `SoilGuard Feedback: ${data.productName} - ${data.name}`,
      text: emailContent
    };

    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Feedback sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, message: 'Failed to send feedback' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});