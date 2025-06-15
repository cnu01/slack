import Joi from 'joi';

export const autoReplySchema = Joi.object({
  messageContent: Joi.string().required().min(1).max(1000),
  channelContext: Joi.string().optional().max(100),
  tone: Joi.string().valid('professional', 'casual', 'supportive', 'urgent').optional()
});

export const analyzeMessageSchema = Joi.object({
  text: Joi.string().required().min(1).max(1000)
});

export const orgBrainSearchSchema = Joi.object({
  query: Joi.string().required().min(1).max(500),
  workspaceId: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/),
  maxResults: Joi.number().integer().min(1).max(20).optional().default(10)
});

export const summarizeSchema = Joi.object({
  channelId: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/),
  messageCount: Joi.number().integer().min(1).max(100).optional().default(50)
});

export const summarizeThreadSchema = Joi.object({
  messageId: Joi.string().required().pattern(/^[0-9a-fA-F]{24}$/)
});
