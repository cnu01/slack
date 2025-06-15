import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkspace extends Document {
  name: string;
  description?: string;
  createdBy: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  channels: mongoose.Types.ObjectId[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>({
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    trim: true,
    minlength: [2, 'Workspace name must be at least 2 characters long'],
    maxlength: [50, 'Workspace name cannot exceed 50 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  channels: [{
    type: Schema.Types.ObjectId,
    ref: 'Channel'
  }],
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Add creator to members array when workspace is created
WorkspaceSchema.pre('save', function(next) {
  if (this.isNew && !this.members.includes(this.createdBy)) {
    this.members.push(this.createdBy);
  }
  next();
});

export default mongoose.model<IWorkspace>('Workspace', WorkspaceSchema);
