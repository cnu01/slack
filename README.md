# SlackAI - Slack Clone with AI-Powered Org Memory & Instant Reply Engine

## 📌 Overview

SlackAI is an advanced Slack-style collaboration platform that combines real-time messaging with AI capabilities to automate replies, analyze message tone, and surface knowledge from across channels. This platform addresses the challenge of buried team knowledge by integrating powerful AI features directly into the messaging experience.

## 🚀 Project Deployment

### 🌐 Frontend
- **URL:** [https://quiet-daffodil-293b8e.netlify.app](https://quiet-daffodil-293b8e.netlify.app/)
- **Hosted on:** Netlify

### 🛠️ Backend
- **URL:** [https://slack-7ln6.onrender.com](https://slack-7ln6.onrender.com)
- **Hosted on:** Render

---

## 🎯 Features

### 💬 Core Communication Features
- **Workspaces & Channels**: Public and private channels within workspaces
- **Direct Messaging**: Private conversations between users
- **Message Threading**: Organize conversations with reply threads
- **Mentions**: Tag users with @username or entire channels
- **Reactions & Emoji**: React to messages with emoji
- **File Sharing**: Upload and share files in conversations
- **Real-time Updates**: Instant message delivery and typing indicators
- **Presence Indicators**: See which users are online, away, or offline
- **Pinned Messages**: Save important information for easy access

### 🤖 AI-Powered Features

#### 🧠 Org Brain
The Org Brain plugin allows users to query organizational knowledge across all public channels and pinned documents.

**Usage**:
1. Click the "Org Brain" icon in the sidebar
2. Ask questions about projects, discussions, or decisions
3. Receive AI-generated summaries with links to the original conversations

**Examples**:
- "What's the latest on Project Atlas?"
- "Summarize discussions on Q3 OKRs."
- "What decisions were made about the new product launch?"

#### 📄 Document Processing & Search
Automatically process and index uploaded PDF documents for intelligent search.

**Features**:
- **Vector Search**: Use semantic search to find relevant document content
- **Document Pinning**: Pin important documents for priority processing
- **Smart Summarization**: AI-generated summaries of document content
- **Keyword Extraction**: Automatic tagging with relevant keywords

#### ✍️ Auto-Reply Composer
AI-powered response suggestions based on conversation context and organizational memory.

**Usage**:
1. Click the "Suggest Reply" button below any message
2. AI generates contextually appropriate response options
3. Edit or send the suggested reply

#### 📊 Tone & Impact Meter
Real-time feedback on message tone and potential impact using Hugging Face sentiment analysis.

**Usage**:
- The tone meter appears as you type, providing feedback on:
  - Communication tone (formal, casual, harsh, etc.)
  - Impact level (high, medium, low)
  - Suggestions for clarity improvements

#### 📝 Meeting Notes Generator
Automatically generate structured summaries from channel discussions.

**Usage**:
1. Select any channel or thread
2. Click "Generate Meeting Notes"
3. AI summarizes key points, action items, stakeholders, and deadlines
4. Export as Markdown or copy to clipboard

## 🛠️ Tech Stack

### Frontend
- React + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Zustand for state management
- Socket.IO client for real-time communication

### Backend
- Node.js + Express
- TypeScript
- MongoDB for data storage
- Socket.IO for real-time features
- JWT for authentication
- Multer for file uploads

### AI & NLP
- OpenAI API for intelligent features and document summarization
- Pinecone for vector embeddings and semantic search
- Hugging Face for sentiment analysis and tone detection
- PDF-parse for document text extraction
- Custom algorithms for keyword extraction

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB
- OpenAI API key
- Pinecone API key
- Hugging Face API key (for sentiment analysis)

### Local Development Setup

#### Backend Setup
1. Clone the repository
   ```bash
   git clone https://github.com/cnu01/slack.git
   cd slack-clone
   ```

2. Install backend dependencies
   ```bash
   cd backend
   npm install
   ```

3. Create a `.env` file in the backend directory using the template in `.env.example`

4. Start the backend server
   ```bash
   npm run dev
   ```

#### Frontend Setup
1. Open a new terminal and navigate to the frontend directory
   ```bash
   cd ../frontend
   ```

2. Install frontend dependencies
   ```bash
   npm install
   ```

3. Start the frontend development server
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3001`

### Production Deployment

#### Backend Deployment
1. Build the backend
   ```bash
   cd backend
   npm run build
   ```

2. Set up environment variables on your hosting platform using `.env.example` as a guide

3. Deploy the `dist` directory to your hosting service

#### Frontend Deployment
1. Build the frontend
   ```bash
   cd frontend
   npm run build
   ```

2. Deploy the contents of the `dist` directory to a static hosting service

## 📋 Environment Variables

Create a `.env` file in both frontend and backend directories based on the examples below:

### Backend `.env.example`
```
# Server Configuration
PORT=5001
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/slack_clone
MONGODB_URI_PROD=mongodb+srv://user:password@cluster.mongodb.net/slack_clone

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_EXPIRES_IN=30d

# AI Services
OPENAI_API_KEY=your_openai_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=your_pinecone_index_name

# CORS
ALLOWED_ORIGINS=http://localhost:3001,https://your-production-frontend-domain.com
```

### Frontend `.env.example`
```
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
VITE_FILE_UPLOAD_URL=http://localhost:5001/api/files/upload
```

## 🔧 Key Features Implementation

### Document Processing Pipeline
1. **Upload**: PDF files are uploaded via the file upload API
2. **Text Extraction**: PDF content is extracted using pdf-parse
3. **Vectorization**: Document chunks are embedded using OpenAI and stored in Pinecone
4. **Indexing**: Documents are automatically indexed for semantic search
5. **Search**: Org Brain queries search both messages and document content

### Real-time Communication
- WebSocket connections for instant messaging
- Typing indicators across channels and DMs
- Live presence updates
- Message delivery confirmations

### AI Integration
- Sentiment analysis using Hugging Face models
- Vector similarity search with Pinecone
- Contextual response generation with OpenAI
- Document summarization and keyword extraction

## 📷 Screenshots

### 🏠 Login & Authentication
![Login Screen](screenshots/login-screen.png)
*Clean and intuitive login interface with sparkles branding*

### 💬 Main Chat Interface
![Main Interface](screenshots/main-interface.png)
*Real-time messaging with channels, direct messages, and typing indicators*

### 🤖 AI-Powered Features
![AI Features](screenshots/ai-features.png)
*Org Brain search, auto-reply suggestions, and tone analysis in action*

### 📊 Workspace Management
![Workspace Dashboard](screenshots/workspace-dashboard.png)
*Comprehensive workspace overview with channels, members, and activity*

## 📚 Documentation

For additional documentation:

- [API Documentation](docs/API.md)
- [AI Features Implementation Details](docs/AI_FEATURES.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ✨ Contributors

- [Chandra Nuli](https://github.com/cnu01)

## 🙏 Acknowledgements

- OpenAI for providing the API that powers our intelligent features
- Hugging Face for sentiment analysis models
- Pinecone for vector database capabilities
- Slack for inspiration and UX patterns 
