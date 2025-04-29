const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const HTTPS_PORT = process.env.PORT || 3000;

// HTTPS options with SSL certificates
const options = {
  key: fs.readFileSync('./src/local-certification/key.pem'),
  cert: fs.readFileSync('./src/local-certification/cert.pem')
};

// Common request handler for both HTTP and HTTPS
const requestHandler = (req, res) => {
  // Parse the URL and get the pathname without query parameters
  const parsedUrl = url.parse(req.url, true);
  
  // Get the file path from pathname only
  let filePath = '.' + parsedUrl.pathname;
  if (filePath === './') {
    filePath = './src/html/home-page-example.html';
  }
  if (filePath === './daily-timeline') {
    filePath = './src/html/timeline-day-example.html';
  }

  // Get the file extension
  const extname = path.extname(filePath);
  
  // Set default content type
  let contentType = 'text/html';
  
  // Map file extensions to content types
  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
      contentType = 'image/jpg';
      break;
  }

  // Read the file
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Page not found
        fs.readFile('./404.html', (err, content) => {
          if (err) {
            // If 404.html doesn't exist, send a simple error message
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('404 Not Found', 'utf-8');
          } else {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
          }
        });
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
};

// Create HTTPS server
const httpsServer = https.createServer(options, requestHandler);

// Start both servers
httpsServer.listen(HTTPS_PORT, () => {
  console.log(`HTTPS Server running at https://localhost:${HTTPS_PORT}/`);
});
