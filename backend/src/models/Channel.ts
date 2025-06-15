import mongoose, { Document, Schema } from 'mongoose';

export interface IChannel extends Document {
  name: string;
  description?: string;
  workspace: mongoose.Types.ObjectId;
  isPrivate: boolean;
  members: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChannelModel extends mongoose.Model<IChannel> {
  createDefaultChannel(workspaceId: string, userId: string): Promise<IChannel>;
}

const channelSchema = new Schema<IChannel>({
  name: {
    type: String,
    required: [true, 'Channel name is required'],
    trim: true,
    minlength: [1, 'Channel name must be at least 1 character long'],
    maxlength: [80, 'Channel name cannot exceed 80 characters'],
    validate: {
      validator: function(name: string) {
        // Channel names should be lowercase, no spaces, can have hyphens and underscores
        return /^[a-z0-9_-]+$/.test(name);
      },
      message: 'Channel name can only contain lowercase letters, numbers, hyphens, and underscores'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [250, 'Channel description cannot exceed 250 characters']
  },
  workspace: {
    type: Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Ensure channel names are unique within a workspace
channelSchema.index({ name: 1, workspace: 1 }, { unique: true });

// Create a default "general" channel for each workspace
channelSchema.statics.createDefaultChannel = async function(workspaceId: string, userId: string) {
  const defaultChannel = new this({
    name: 'general',
    description: 'This channel is for workspace-wide communication and announcements.',
    workspace: workspaceId,
    isPrivate: false,
    members: [userId],
    createdBy: userId
  });
  
  return await defaultChannel.save();
};

export default mongoose.model<IChannel, IChannelModel>('Channel', channelSchema);
