export const config = {
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/slack-clone',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // AI Services
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || '',
  
  // Pinecone
  PINECONE_API_KEY: process.env.PINECONE_API_KEY || 'your-pinecone-api-key',
  PINECONE_ENVIRONMENT: process.env.PINECONE_ENVIRONMENT || 'us-east-1-aws',
  PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME || 'ai-workspace-embeddings',
  
  // Firebase Configuration (for file uploads)
  FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
  FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
  FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '',
  
  // Server
  PORT: process.env.PORT || 5001,
  NODE_ENV: process.env.NODE_ENV || 'development'
};
