-- Migration: Add Groq support columns to user_api_keys
-- Run this in Supabase SQL Editor

-- Add groq_key_encrypted column for storing encrypted Groq API keys
ALTER TABLE user_api_keys 
ADD COLUMN IF NOT EXISTS groq_key_encrypted TEXT;

-- Add ai_provider column for storing user's preferred AI provider
ALTER TABLE user_api_keys 
ADD COLUMN IF NOT EXISTS ai_provider TEXT DEFAULT 'gemini';

-- Add comment for documentation
COMMENT ON COLUMN user_api_keys.groq_key_encrypted IS 'Encrypted Groq API key for OSS AI model access';
COMMENT ON COLUMN user_api_keys.ai_provider IS 'User preferred AI provider: gemini (default) or groq';
