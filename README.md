# Terrific Timeline Integration Example

This project demonstrates the integration of Terrific Timeline in a webpage with both HTTP and HTTPS support.

## Setup and Running

### Prerequisites

- Node.js installed on your system
- OpenSSL for certificate generation (comes pre-installed on most Mac and Linux systems)

### Installation

1. Clone this repository
2. Navigate to the project directory


### Running the Server

#### HTTPS-only Server

```bash
npm start
```

This will start the (https) server at `https://localhost:3000`


### Quick Setup (Generate Certificates and Start Server)

## Browser Security Warning

Since we're using self-signed certificates for local development, your browser will show a security warning. You can:

1. Click "Advanced" or similar option
2. Choose "Proceed to localhost (unsafe)" or similar option

This is normal for development environments. In production, you should use properly signed certificates.
