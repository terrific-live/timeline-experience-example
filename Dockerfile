FROM node:22

WORKDIR /app

# Copy package.json and create the new server file first
COPY package.json .
COPY src/ src/

# Create the simplified server file
COPY ./server.js .

# Install dependencies
RUN npm install

# Expose the port
EXPOSE 8080

ENV PORT=8080

# Start the server
CMD ["node", "server.js"]