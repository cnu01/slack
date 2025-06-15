# API Documentation

This document provides details about the available API endpoints in SlackAI.

## Authentication

### Register a new user
```
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "username": "johndoe",
  "profession": "Software Engineer"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "username": "johndoe",
    "profession": "Software Engineer",
    "avatar": null,
    "workspaces": [],
    "isOnline": true,
    "createdAt": "timestamp"
  },
  "token": "jwt_token",
  "refreshToken": "refresh_token"
}
```

### Login
```
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "username": "johndoe",
    "profession": "Software Engineer",
    "avatar": "avatar_url",
    "workspaces": ["workspace_ids"],
    "isOnline": true,
    "createdAt": "timestamp"
  },
  "token": "jwt_token",
  "refreshToken": "refresh_token"
}
```

### Get User Profile
```
GET /api/auth/profile
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "username": "johndoe",
    "profession": "Software Engineer",
    "avatar": "avatar_url",
    "workspaces": ["workspace_ids"],
    "isOnline": true,
    "createdAt": "timestamp"
  }
}
```

### Logout
```
POST /api/auth/logout
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

### Update Avatar
```
PUT /api/auth/avatar
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body (Form Data):**
```
avatar: [File]
```

**Response:**
```json
{
  "message": "Avatar updated successfully",
  "user": {
    "_id": "user_id",
    "email": "user@example.com",
    "username": "johndoe",
    "profession": "Software Engineer",
    "avatar": "new_avatar_url",
    "workspaces": ["workspace_ids"],
    "isOnline": true,
    "createdAt": "timestamp"
  },
  "avatarUrl": "new_avatar_url"
}
```

## Workspaces

### Get All Workspaces
```
GET /api/workspaces
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "workspaces": [
    {
      "_id": "workspace_id",
      "name": "Workspace Name",
      "description": "Workspace description",
      "owner": "user_id",
      "members": ["user_ids"],
      "channels": ["channel_ids"],
      "isPublic": true,
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
}
```

### Create Workspace
```
POST /api/workspaces
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "name": "New Workspace",
  "description": "Workspace description",
  "isPublic": true
}
```

**Response:**
```json
{
  "message": "Workspace created successfully",
  "workspace": {
    "_id": "workspace_id",
    "name": "New Workspace",
    "description": "Workspace description",
    "owner": "user_id",
    "members": ["user_id"],
    "channels": ["general_channel_id"],
    "isPublic": true,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

## Channels

### Get Workspace Channels
```
GET /api/channels?workspace=workspace_id
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "channels": [
    {
      "_id": "channel_id",
      "name": "general",
      "description": "General channel",
      "workspace": "workspace_id",
      "type": "public",
      "members": ["user_ids"],
      "createdBy": "user_id",
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
}
```

### Create Channel
```
POST /api/channels
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "name": "new-channel",
  "displayName": "New Channel",
  "description": "Channel description",
  "workspace": "workspace_id",
  "type": "public"
}
```

**Response:**
```json
{
  "message": "Channel created successfully",
  "channel": {
    "_id": "channel_id",
    "name": "new-channel",
    "displayName": "New Channel",
    "description": "Channel description",
    "workspace": "workspace_id",
    "type": "public",
    "members": ["user_ids"],
    "createdBy": "user_id",
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

## Messages

### Get Channel Messages
```
GET /api/messages?channel=channel_id
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Response:**
```json
{
  "messages": [
    {
      "_id": "message_id",
      "content": "Message content",
      "sender": {
        "_id": "user_id",
        "username": "johndoe",
        "avatar": "avatar_url"
      },
      "channel": "channel_id",
      "workspace": "workspace_id",
      "mentions": ["user_ids"],
      "reactions": [
        {
          "emoji": "👍",
          "users": ["user_ids"]
        }
      ],
      "attachments": ["file_ids"],
      "isDeleted": false,
      "isPinned": false,
      "createdAt": "timestamp",
      "updatedAt": "timestamp"
    }
  ]
}
```

### Send Message
```
POST /api/messages
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "content": "Hello world!",
  "channel": "channel_id",
  "workspace": "workspace_id",
  "mentions": ["user_ids"],
  "attachments": ["file_ids"]
}
```

**Response:**
```json
{
  "message": "Message sent successfully",
  "newMessage": {
    "_id": "message_id",
    "content": "Hello world!",
    "sender": {
      "_id": "user_id",
      "username": "johndoe",
      "avatar": "avatar_url"
    },
    "channel": "channel_id",
    "workspace": "workspace_id",
    "mentions": ["user_ids"],
    "reactions": [],
    "attachments": ["file_ids"],
    "isDeleted": false,
    "isPinned": false,
    "createdAt": "timestamp",
    "updatedAt": "timestamp"
  }
}
```

## Message Actions

### Add Reaction
```
POST /api/message-actions/react
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "messageId": "message_id",
  "emoji": "👍"
}
```

**Response:**
```json
{
  "message": "Reaction added successfully",
  "reactions": [
    {
      "emoji": "👍",
      "users": ["user_ids"]
    }
  ]
}
```

### Pin Message
```
POST /api/message-actions/pin
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "messageId": "message_id"
}
```

**Response:**
```json
{
  "message": "Message pinned successfully",
  "isPinned": true
}
```

### Unpin Message
```
POST /api/message-actions/unpin
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "messageId": "message_id"
}
```

**Response:**
```json
{
  "message": "Message unpinned successfully",
  "isPinned": false
}
```

## AI Features

### Get Org Brain Response
```
POST /api/ai/org-brain
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "query": "What's the latest on Project Atlas?",
  "workspace": "workspace_id",
  "maxResults": 5
}
```

**Response:**
```json
{
  "response": "Based on recent discussions, Project Atlas is currently in the testing phase. The team reported successful completion of the backend API (discussed on Oct 10) and frontend components are about 80% complete (mentioned by Jane on Oct 12). Current blockers include third-party API integration issues that Mark is working on. The project is expected to launch in 2 weeks according to the timeline shared in the #project-atlas channel.",
  "sources": [
    {
      "messageId": "message_id",
      "channelId": "channel_id",
      "channelName": "project-atlas",
      "author": "johndoe",
      "timestamp": "timestamp",
      "content": "Just completed the backend API for Project Atlas. All tests passing!"
    },
    {
      "messageId": "message_id",
      "channelId": "channel_id",
      "channelName": "project-atlas",
      "author": "jane",
      "timestamp": "timestamp",
      "content": "Frontend components are about 80% complete. Should be ready for integration by Friday."
    }
  ]
}
```

### Get Auto-Reply Suggestions
```
POST /api/ai/auto-reply
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "messageId": "message_id",
  "channelId": "channel_id",
  "workspaceId": "workspace_id"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "text": "I'll work on that feature today and have it ready by tomorrow afternoon.",
      "tone": "professional",
      "formality": "medium"
    },
    {
      "text": "Got it, will tackle this ASAP and update you when it's done.",
      "tone": "casual",
      "formality": "low"
    },
    {
      "text": "Thank you for the assignment. I'll begin work immediately and provide a status update by EOD.",
      "tone": "formal",
      "formality": "high"
    }
  ]
}
```

### Analyze Message Tone
```
POST /api/ai/analyze-tone
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "text": "I need this fixed immediately. The client is very unhappy."
}
```

**Response:**
```json
{
  "analysis": {
    "sentiment": "negative",
    "tone": "urgent",
    "impact": "high",
    "formality": "medium",
    "suggestions": [
      "Consider softening the tone by providing context",
      "Add a collaborative element to make it less demanding"
    ]
  }
}
```

### Generate Meeting Notes
```
POST /api/ai/meeting-notes
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body:**
```json
{
  "channelId": "channel_id",
  "startTime": "timestamp",
  "endTime": "timestamp",
  "title": "Weekly Team Sync"
}
```

**Response:**
```json
{
  "notes": {
    "title": "Weekly Team Sync - October 15, 2023",
    "keyPoints": [
      "Backend API development is complete",
      "Frontend is 80% complete, expected to be ready by Friday",
      "Third-party API integration issues identified"
    ],
    "decisions": [
      "Launch date set for October 30th",
      "Additional QA resources to be allocated next week"
    ],
    "actionItems": [
      {
        "task": "Fix third-party API integration issues",
        "assignee": "Mark",
        "deadline": "October 18"
      },
      {
        "task": "Complete frontend components",
        "assignee": "Jane",
        "deadline": "October 20"
      }
    ],
    "participants": ["Jane", "John", "Mark", "Sarah"]
  }
}
```

## Files

### Upload File
```
POST /api/files/upload
```

**Headers:**
```
Authorization: Bearer jwt_token
```

**Request Body (Form Data):**
```
file: [File]
channelId: channel_id
workspaceId: workspace_id
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "file": {
    "_id": "file_id",
    "filename": "document.pdf",
    "originalName": "document.pdf",
    "path": "file_url",
    "size": 2048576,
    "type": "application/pdf",
    "uploader": "user_id",
    "workspace": "workspace_id",
    "channel": "channel_id",
    "createdAt": "timestamp"
  }
}
``` 