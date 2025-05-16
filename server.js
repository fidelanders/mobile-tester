require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { testDevices, testWebsiteOnDevice } = require('./tester');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./server/utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;


// CORS Configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the React build
app.use(express.static(path.join(__dirname, '../client/build')));

// API Endpoints
app.post('/api/test', async (req, res) => {
  try {
    // Input validation
    if (!req.body.url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const { url, deviceName } = req.body;
    const testId = uuidv4();
    const outputDir = path.join(__dirname, 'reports', testId);
    
    fs.mkdirSync(outputDir, { recursive: true });

    // Find device or use default
    const device = testDevices.find(d => d.name === deviceName) || testDevices[0];
    
    // Run test
    const result = await testWebsiteOnDevice(url, device, outputDir);
    
    // Prepare response with absolute URLs
    res.json({
      success: true,
      testId,
      problems: result.problems,
      screenshots: result.screenshots.map(s => 
        `/api/screenshot/${testId}/${path.basename(s)}`
      ),
      reportUrl: `/api/report/${testId}`
    });
  } catch (error) {
    logger.error('Error message', { error: err });
    // console.error('API Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Static file serving
// app.use('/api/screenshot', express.static(path.join(__dirname, 'reports')));
// Update your screenshot serving endpoint
app.get('/api/screenshot/:testId/:filename', (req, res) => {
  const screenshotPath = path.join(
    __dirname, 
    'reports', 
    req.params.testId, 
    'screenshots', 
    req.params.filename
  );
  
  if (fs.existsSync(screenshotPath)) {
    res.sendFile(screenshotPath, {
      headers: {
        'Content-Type': 'image/jpeg', // or 'image/png'
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } else {
    res.status(404).json({ error: 'Screenshot not found' });
  }
});

app.use('/api/report', express.static(path.join(__dirname, 'reports')));

// Serve React app in production


// Catch-all to send React's index.html for frontend routes
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: ${corsOptions.origin}`);
});