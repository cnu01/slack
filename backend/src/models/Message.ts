import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  content: string;
  author: mongoose.Types.ObjectId;
  channel: mongoose.Types.ObjectId | string; // Allow string for DM channels
  workspace: mongoose.Types.ObjectId;
  messageType: 'text' | 'file' | 'image' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  reactions: {
    emoji: string;
    users: mongoose.Types.ObjectId[];
  }[];
  // Thread support
  threadId?: mongoose.Types.ObjectId; // Parent message ID if this is a thread reply
  replyTo?: mongoose.Types.ObjectId; // Backward compatibility - same as threadId
  threadReplies?: mongoose.Types.ObjectId[]; // Array of reply message IDs if this is a parent
  threadReplyCount?: number; // Count of replies in thread
  lastThreadReply?: Date; // Timestamp of last thread reply
  // Mentions
  mentions: {
    type: 'user' | 'channel' | 'everyone';
    targetId?: mongoose.Types.ObjectId; // User ID for user mentions, Channel ID for channel mentions
    displayText: string; // @username, @channel, @everyone
  }[];
  // Pin support
  isPinned: boolean;
  pinnedBy?: mongoose.Types.ObjectId;
  pinnedAt?: Date;
  // Edit support
  isEdited: boolean;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  content: {
    type: String,
    required: function(this: IMessage) {
      // Content is required for text messages, but optional for file/image messages
      return this.messageType === 'text';
    },
    maxlength: [4000, 'Message cannot exceed 4000 characters']
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channel: {
    type: Schema.Types.Mixed, // Allow both ObjectId and String for DM support
    required: true
  },
  workspace: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: false // Not required for DMs
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'image', 'system'],
    default: 'text'
  },
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  fileType: {
    type: String
  },
  reactions: [{
    emoji: {
      type: String,
      required: true
    },
    users: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  // Thread support
  threadId: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  replyTo: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  threadReplies: [{
    type: Schema.Types.ObjectId,
    ref: 'Message'
  }],
  threadReplyCount: {
    type: Number,
    default: 0
  },
  lastThreadReply: {
    type: Date
  },
  // Mentions
  mentions: [{
    type: {
      type: String,
      enum: ['user', 'channel', 'everyone'],
      required: true
    },
    targetId: {
      type: Schema.Types.ObjectId,
      refPath: function(this: any) {
        return this.mentions.type === 'user' ? 'User' : 'Channel';
      }
    },
    displayText: {
      type: String,
      required: true
    }
  }],
  // Pin support
  isPinned: {
    type: Boolean,
    default: false
  },
  pinnedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  pinnedAt: {
    type: Date
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  },
  deletedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient message retrieval
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ workspace: 1, createdAt: -1 });
messageSchema.index({ threadId: 1, createdAt: 1 });
messageSchema.index({ isPinned: 1, channel: 1 });
messageSchema.index({ 'mentions.targetId': 1 });
messageSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model<IMessage>('Message', messageSchema);
