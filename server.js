const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const HTTP_PORT = process.env.PORT || 3000;


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
  if (filePath === './devs') {
    filePath = './src/html/devs.html';
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
const httpServer = http.createServer(requestHandler);

// Disable timeout (unlimited)
httpServer.setTimeout(0); 

// Start both servers
httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTPS Server running at http://localhost:${HTTP_PORT}/`);
});

// Add error handling for the HTTPS server
httpServer.on('error', (error) => {
  console.error(`Failed to start HTTPS server: ${error.message}`);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${HTTP_PORT} is already in use`);
  }
  process.exit(1);
});
