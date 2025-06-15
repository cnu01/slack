import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import { 
  generateAutoReply,
  analyzeMessage,
  searchOrgBrain,
  summarizeConversation,
  summarizeThread,
  backfillMessageEmbeddings
} from '../controllers/aiController';
import { validate } from '../middleware/validation';
import { 
  autoReplySchema, 
  analyzeMessageSchema, 
  orgBrainSearchSchema, 
  summarizeSchema,
  summarizeThreadSchema
} from '../validation/aiValidation';

const router = Router();

// Auto-reply generation
router.post('/auto-reply', validate(autoReplySchema), generateAutoReply);

// Message analysis (tone & sentiment)
router.post('/analyze', validate(analyzeMessageSchema), analyzeMessage);

// Org Brain search
router.post('/org-brain/search', validate(orgBrainSearchSchema), searchOrgBrain);

// Conversation summarization
router.post('/summarize', validate(summarizeSchema), summarizeConversation);

// Thread summarization
router.post('/summarize-thread', validate(summarizeThreadSchema), summarizeThread);

// Backfill message embeddings (admin function)
router.post('/backfill-embeddings', backfillMessageEmbeddings);

export default router;
