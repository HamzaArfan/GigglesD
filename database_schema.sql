-- GigglesD Discord Bot Database Schema
-- Execute this in your Supabase SQL Editor

-- Create guilds table for storing Discord server configurations
CREATE TABLE IF NOT EXISTS guilds (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) UNIQUE NOT NULL,
    guild_name TEXT NOT NULL,
    welcome_channel_id VARCHAR(20),
    welcome_message TEXT DEFAULT 'Welcome to {guild}, {user}! 🎉',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create member_joins table for logging when members join servers
CREATE TABLE IF NOT EXISTS member_joins (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    username TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guilds_guild_id ON guilds(guild_id);
CREATE INDEX IF NOT EXISTS idx_member_joins_guild_id ON member_joins(guild_id);
CREATE INDEX IF NOT EXISTS idx_member_joins_user_id ON member_joins(user_id);
CREATE INDEX IF NOT EXISTS idx_member_joins_joined_at ON member_joins(joined_at);

-- Enable Row Level Security (RLS) for better security
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_joins ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow authenticated access (adjust as needed)
-- Note: You may want to customize these policies based on your security requirements

-- Allow all operations on guilds table for authenticated users
CREATE POLICY "Allow authenticated users to manage guilds" ON guilds
    FOR ALL USING (auth.role() = 'authenticated');

-- Allow all operations on member_joins table for authenticated users  
CREATE POLICY "Allow authenticated users to manage member joins" ON member_joins
    FOR ALL USING (auth.role() = 'authenticated');

-- Optional: Create a function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on guilds table
CREATE TRIGGER update_guilds_updated_at 
    BEFORE UPDATE ON guilds 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some example data (optional - remove if not needed)
-- This creates a sample guild entry to test with
INSERT INTO guilds (guild_id, guild_name, welcome_message, is_active) 
VALUES 
    ('123456789012345678', 'Test Server', 'Welcome to {guild}, {user}! 🎉 You are member #{membercount}!', true)
ON CONFLICT (guild_id) DO NOTHING;

-- Verification queries to check if everything was created successfully
SELECT 'Tables created successfully' as status;

-- Show table structure
\d guilds;
\d member_joins;

-- Show indexes
SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('guilds', 'member_joins');

-- Show policies
SELECT schemaname, tablename, policyname, cmd, qual FROM pg_policies WHERE tablename IN ('guilds', 'member_joins');

-- Create link_edit_violations table for tracking moderation events
CREATE TABLE IF NOT EXISTS link_edit_violations (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    username TEXT NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    message_id VARCHAR(20),
    violation_type VARCHAR(20) DEFAULT 'link_edit', -- 'added' or 'modified'
    old_content TEXT,
    new_content TEXT,
    action_taken VARCHAR(50) DEFAULT 'message_deleted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for the new table
CREATE INDEX IF NOT EXISTS idx_link_violations_guild_id ON link_edit_violations(guild_id);
CREATE INDEX IF NOT EXISTS idx_link_violations_user_id ON link_edit_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_link_violations_created_at ON link_edit_violations(created_at);

-- Enable RLS for the new table
ALTER TABLE link_edit_violations ENABLE ROW LEVEL SECURITY;

-- Create policy for the new table
CREATE POLICY "Allow authenticated users to manage link violations" ON link_edit_violations
    FOR ALL USING (auth.role() = 'authenticated');

-- Create message_tracking table for link editing timer system
CREATE TABLE IF NOT EXISTS message_tracking (
    id BIGSERIAL PRIMARY KEY,
    message_id VARCHAR(20) UNIQUE NOT NULL,
    guild_id VARCHAR(20) NOT NULL,
    channel_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for the message tracking table
CREATE INDEX IF NOT EXISTS idx_message_tracking_message_id ON message_tracking(message_id);
CREATE INDEX IF NOT EXISTS idx_message_tracking_guild_id ON message_tracking(guild_id);
CREATE INDEX IF NOT EXISTS idx_message_tracking_posted_at ON message_tracking(posted_at);

-- Enable RLS for the new table
ALTER TABLE message_tracking ENABLE ROW LEVEL SECURITY;

-- Create policy for the new table
CREATE POLICY "Allow authenticated users to manage message tracking" ON message_tracking
    FOR ALL USING (auth.role() = 'authenticated');

-- Create function to clean up old message tracking records (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_message_tracking()
RETURNS void AS $$
BEGIN
    DELETE FROM message_tracking 
    WHERE posted_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql; 