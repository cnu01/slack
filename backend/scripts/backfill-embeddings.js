/**
 * BACKFILL EMBEDDINGS SCRIPT
 * 
 * This script backfills message embeddings for existing messages in the database.
 * It's a one-time operation that should only be run when setting up AI search for the first time
 * or when you need to re-index all messages.
 * 
 * HOW TO RUN:
 * 1. Make sure your backend server is running on localhost:5001
 * 2. Update the login credentials below if needed (email/password)
 * 3. Update the workspaceId if needed
 * 4. Run: node backend/scripts/backfill-embeddings.js
 * 
 * WHEN TO RUN:
 * - First time setting up AI search functionality
 * - If Pinecone index was deleted and recreated
 * - If there are issues with AI search not finding existing messages
 * 
 * NOTE: This script processes ALL messages in the workspace, so it may take time for large datasets.
 * New messages are automatically indexed when sent, so this is only for historical data.
 */

const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const backfillEmbeddings = async () => {
  try {
    console.log('🔑 Logging in to get authentication token...');
    
    // First, login to get a valid token
    const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'testing@a.com',
        password: '123456'
      })
    });

    const loginResult = await loginResponse.json();
    
    console.log('Login response:', loginResult);
    
    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResult);
      return;
    }

    const token = loginResult.token || loginResult.data?.token;
    if (!token) {
      console.error('❌ No token found in login response');
      return;
    }
    console.log('✅ Login successful, token obtained');

    console.log('🔄 Starting backfill of message embeddings...');

    const response = await fetch('http://localhost:5001/api/ai/backfill-embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        workspaceId: '684da836c7e8104019c99dd0'
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Backfill completed successfully:', result);
    } else {
      console.error('❌ Backfill failed:', result);
    }
  } catch (error) {
    console.error('❌ Error during backfill:', error);
  }
};

backfillEmbeddings();
