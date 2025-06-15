# Deployment Guide

This guide provides detailed instructions for deploying SlackAI to production environments.

## Prerequisites

Before deploying, ensure you have the following:

- Node.js v18+ installed on your deployment server
- MongoDB instance (Atlas recommended for production)
- OpenAI API key with sufficient credits
- Pinecone account with vector index created
- Firebase project configured for file storage
- Domain name (optional but recommended)

## Deployment Options

### Option 1: Traditional VPS/VM Deployment

#### Backend Deployment

1. **Prepare your server**
   ```bash
   # Update package lists
   sudo apt-get update
   
   # Install Node.js, npm, and other dependencies
   sudo apt-get install -y nodejs npm git nginx
   ```

2. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/slack-clone.git
   cd slack-clone
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example backend/.env
   # Edit the .env file with your production values
   nano backend/.env
   ```

4. **Install dependencies and build**
   ```bash
   cd backend
   npm install
   npm run build
   ```

5. **Set up process management with PM2**
   ```bash
   # Install PM2 globally
   sudo npm install -g pm2
   
   # Start the application with PM2
   pm2 start dist/app.js --name slack-ai-backend
   
   # Set PM2 to start on system reboot
   pm2 startup
   pm2 save
   ```

6. **Configure Nginx as a reverse proxy**
   ```bash
   sudo nano /etc/nginx/sites-available/slack-ai
   ```

   Add the following configuration:
   ```nginx
   server {
     listen 80;
     server_name api.yourslackdomain.com;

     location / {
       proxy_pass http://localhost:5001;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

7. **Enable the site and restart Nginx**
   ```bash
   sudo ln -s /etc/nginx/sites-available/slack-ai /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

8. **Set up SSL with Certbot**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourslackdomain.com
   ```

#### Frontend Deployment

1. **Build the frontend**
   ```bash
   cd ../frontend
   
   # Create production .env file
   cp .env.example .env
   
   # Update with production values
   # VITE_API_URL=https://api.yourslackdomain.com/api
   # VITE_SOCKET_URL=https://api.yourslackdomain.com
   nano .env
   
   # Install dependencies and build
   npm install
   npm run build
   ```

2. **Configure Nginx for the frontend**
   ```bash
   sudo nano /etc/nginx/sites-available/slack-ai-frontend
   ```

   Add the following configuration:
   ```nginx
   server {
     listen 80;
     server_name app.yourslackdomain.com;
     root /path/to/slack-clone/frontend/dist;
     index index.html;

     location / {
       try_files $uri $uri/ /index.html;
     }
   }
   ```

3. **Enable the site and restart Nginx**
   ```bash
   sudo ln -s /etc/nginx/sites-available/slack-ai-frontend /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Set up SSL with Certbot**
   ```bash
   sudo certbot --nginx -d app.yourslackdomain.com
   ```

### Option 2: Docker Deployment

#### Prerequisites
- Docker and Docker Compose installed on your server

#### Setup

1. **Create a Docker Compose file in the project root**
   ```bash
   nano docker-compose.yml
   ```

2. **Add the following configuration**
   ```yaml
   version: '3'

   services:
     backend:
       build:
         context: ./backend
       environment:
         - PORT=5001
         - NODE_ENV=production
         - MONGODB_URI=mongodb://mongo:27017/slack_clone
         - JWT_SECRET=your_jwt_secret_key
         - JWT_EXPIRES_IN=7d
         - OPENAI_API_KEY=your_openai_api_key
         - PINECONE_API_KEY=your_pinecone_api_key
         - PINECONE_ENVIRONMENT=your_pinecone_environment
         - PINECONE_INDEX_NAME=your_pinecone_index_name
         - FIREBASE_PROJECT_ID=your_firebase_project_id
         - FIREBASE_PRIVATE_KEY=your_firebase_private_key
         - FIREBASE_CLIENT_EMAIL=your_firebase_client_email
         - FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
         - ALLOWED_ORIGINS=http://localhost:3000,https://app.yourslackdomain.com
       ports:
         - "5001:5001"
       volumes:
         - ./backend/uploads:/app/uploads
       depends_on:
         - mongo
       restart: always

     frontend:
       build:
         context: ./frontend
         args:
           - VITE_API_URL=https://api.yourslackdomain.com/api
           - VITE_SOCKET_URL=https://api.yourslackdomain.com
           - VITE_FILE_UPLOAD_URL=https://api.yourslackdomain.com/api/files/upload
       ports:
         - "3000:80"
       depends_on:
         - backend
       restart: always

     mongo:
       image: mongo:latest
       volumes:
         - mongo_data:/data/db
       ports:
         - "27017:27017"

   volumes:
     mongo_data:
   ```

3. **Create a Dockerfile for the backend**
   ```bash
   nano backend/Dockerfile
   ```

   ```dockerfile
   FROM node:18-alpine

   WORKDIR /app

   COPY package*.json ./

   RUN npm install

   COPY . .

   RUN npm run build

   # Create upload directories
   RUN mkdir -p uploads/avatars uploads/files

   EXPOSE 5001

   CMD ["node", "dist/app.js"]
   ```

4. **Create a Dockerfile for the frontend**
   ```bash
   nano frontend/Dockerfile
   ```

   ```dockerfile
   # Build stage
   FROM node:18-alpine as build

   WORKDIR /app

   COPY package*.json ./

   RUN npm install

   COPY . .

   ARG VITE_API_URL
   ARG VITE_SOCKET_URL
   ARG VITE_FILE_UPLOAD_URL

   ENV VITE_API_URL=$VITE_API_URL
   ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
   ENV VITE_FILE_UPLOAD_URL=$VITE_FILE_UPLOAD_URL

   RUN npm run build

   # Production stage
   FROM nginx:alpine

   COPY --from=build /app/dist /usr/share/nginx/html

   # Add nginx config for SPA routing
   COPY nginx.conf /etc/nginx/conf.d/default.conf

   EXPOSE 80

   CMD ["nginx", "-g", "daemon off;"]
   ```

5. **Create an Nginx config for the frontend**
   ```bash
   nano frontend/nginx.conf
   ```

   ```nginx
   server {
     listen 80;
     
     location / {
       root /usr/share/nginx/html;
       index index.html;
       try_files $uri $uri/ /index.html;
     }
   }
   ```

6. **Deploy with Docker Compose**
   ```bash
   docker-compose up -d
   ```

7. **Set up Nginx as a reverse proxy on your host**
   ```nginx
   server {
     listen 80;
     server_name api.yourslackdomain.com;

     location / {
       proxy_pass http://localhost:5001;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }

   server {
     listen 80;
     server_name app.yourslackdomain.com;

     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

### Option 3: Cloud Platform Deployment

#### Deploy to Heroku

1. **Create a Procfile in the backend directory**
   ```
   web: node dist/app.js
   ```

2. **Configure Heroku for the backend**
   ```bash
   # Install Heroku CLI if you haven't already
   npm install -g heroku

   # Login to Heroku
   heroku login

   # Create a new Heroku app
   cd backend
   heroku create slack-ai-backend

   # Add MongoDB add-on or set your MongoDB URI
   heroku addons:create mongolab:sandbox
   # OR
   heroku config:set MONGODB_URI=your_mongodb_uri

   # Set other environment variables
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your_jwt_secret
   heroku config:set JWT_EXPIRES_IN=7d
   heroku config:set OPENAI_API_KEY=your_openai_api_key
   heroku config:set PINECONE_API_KEY=your_pinecone_api_key
   heroku config:set PINECONE_ENVIRONMENT=your_pinecone_environment
   heroku config:set PINECONE_INDEX_NAME=your_pinecone_index_name
   heroku config:set ALLOWED_ORIGINS=https://your-frontend-app.herokuapp.com

   # Deploy the backend
   git add .
   git commit -m "Prepare for Heroku deployment"
   git push heroku main
   ```

3. **Configure Heroku for the frontend**
   ```bash
   cd ../frontend
   heroku create slack-ai-frontend

   # Set environment variables
   heroku config:set VITE_API_URL=https://slack-ai-backend.herokuapp.com/api
   heroku config:set VITE_SOCKET_URL=https://slack-ai-backend.herokuapp.com
   heroku config:set VITE_FILE_UPLOAD_URL=https://slack-ai-backend.herokuapp.com/api/files/upload

   # Add the buildpack for Vite
   heroku buildpacks:set https://github.com/heroku/heroku-buildpack-nodejs

   # Add a static.json file for SPA routing
   echo '{
     "root": "dist",
     "clean_urls": true,
     "routes": {
       "/**": "index.html"
     }
   }' > static.json

   # Deploy the frontend
   git add .
   git commit -m "Prepare frontend for Heroku"
   git push heroku main
   ```

## Production Considerations

### Scaling

For high-traffic deployments, consider:

1. **Backend scaling**
   - Use load balancers to distribute traffic across multiple backend instances
   - Implement Redis for session storage and caching
   - Utilize MongoDB replica sets for database redundancy

2. **AI service optimization**
   - Implement caching for common AI requests
   - Set up rate limiting for AI API calls
   - Consider batching vector operations

### Monitoring

1. **Set up monitoring with Prometheus and Grafana**
   - Monitor API response times
   - Track real-time connections
   - Set alerts for error spikes

2. **Logging**
   - Implement centralized logging with ELK stack
   - Log all AI interactions for auditing
   - Set up error tracking with Sentry

### Backups

1. **Database backups**
   - Schedule daily MongoDB backups
   - Test restoration procedures regularly
   - Store backups in multiple geographic locations

2. **File storage backups**
   - Implement redundancy for file storage
   - Schedule regular backups of uploaded files

### Security

1. **API security**
   - Implement rate limiting
   - Add CORS protection
   - Use helmet.js for security headers

2. **AI security**
   - Implement input sanitization for AI prompts
   - Set up monitoring for AI usage
   - Regular security audits of AI interactions

## Troubleshooting

### Common Deployment Issues

1. **Socket.IO connection issues**
   - Check CORS settings
   - Verify WebSocket support in your hosting environment
   - Ensure proper proxy configuration

2. **MongoDB connection errors**
   - Check connection string
   - Verify network access to MongoDB
   - Check MongoDB user permissions

3. **AI service timeouts**
   - Implement proper retry logic
   - Set appropriate timeouts
   - Consider fallback options

### Debugging Production

1. **Enable temporary debug logging**
   ```javascript
   // In app.ts
   if (process.env.DEBUG === 'true') {
     app.use((req, res, next) => {
       console.log(`[${req.method}] ${req.path}`);
       next();
     });
   }
   ```

2. **Monitor server logs**
   ```bash
   # For PM2
   pm2 logs slack-ai-backend
   
   # For Heroku
   heroku logs --tail --app slack-ai-backend
   ```

## CI/CD Setup

For automated deployments, consider setting up GitHub Actions:

1. **Create a workflow file**
   `.github/workflows/deploy.yml`

   ```yaml
   name: Deploy

   on:
     push:
       branches: [ main ]

   jobs:
     deploy-backend:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Deploy to Heroku (Backend)
           uses: akhileshns/heroku-deploy@v3.12.12
           with:
             heroku_api_key: ${{secrets.HEROKU_API_KEY}}
             heroku_app_name: "slack-ai-backend"
             heroku_email: ${{secrets.HEROKU_EMAIL}}
             appdir: "backend"

     deploy-frontend:
       runs-on: ubuntu-latest
       needs: deploy-backend
       steps:
         - uses: actions/checkout@v2
         - name: Deploy to Heroku (Frontend)
           uses: akhileshns/heroku-deploy@v3.12.12
           with:
             heroku_api_key: ${{secrets.HEROKU_API_KEY}}
             heroku_app_name: "slack-ai-frontend"
             heroku_email: ${{secrets.HEROKU_EMAIL}}
             appdir: "frontend"
   ``` 