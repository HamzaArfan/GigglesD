const { createClient } = require('@supabase/supabase-js');

let supabaseClient = null;

/**
 * Initialize Supabase client
 * @returns {Object} Supabase client instance
 */
function initializeSupabase() {
    if (!supabaseClient) {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('❌ Missing Supabase environment variables. Please check SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_KEY)');
        }

        supabaseClient = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase client initialized successfully');
    }

    return supabaseClient;
}

/**
 * Test database connection
 * @returns {Promise<boolean>} Connection test result
 */
async function testConnection() {
    try {
        const { data, error } = await supabaseClient
            .from('guilds')
            .select('count')
            .limit(1);
        
        if (error) {
            console.error('❌ Supabase connection test failed:', error.message);
            return false;
        }
        
        console.log('✅ Supabase connection test successful');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection error:', error);
        return false;
    }
}

/**
 * Log new member join to database
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @param {string} username - User's display name
 * @param {string} joinedAt - Join timestamp
 */
async function logMemberJoin(guildId, userId, username, joinedAt) {
    try {
        const { error } = await supabaseClient
            .from('member_joins')
            .insert([
                {
                    guild_id: guildId,
                    user_id: userId,
                    username: username,
                    joined_at: joinedAt,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error('❌ Failed to log member join:', error);
            return false;
        }

        console.log(`📝 Logged member join: ${username} (${userId}) in guild ${guildId}`);
        return true;
    } catch (error) {
        console.error('❌ Error logging member join:', error);
        return false;
    }
}

/**
 * Get guild settings from database
 * @param {string} guildId - Discord guild ID
 * @returns {Promise<Object|null>} Guild settings or null if not found
 */
async function getGuildSettings(guildId) {
    try {
        const { data, error } = await supabaseClient
            .from('guilds')
            .select('*')
            .eq('guild_id', guildId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows found - return default settings
                return null;
            }
            console.error('❌ Failed to get guild settings:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('❌ Error getting guild settings:', error);
        return null;
    }
}

/**
 * Create or update guild settings
 * @param {string} guildId - Discord guild ID
 * @param {string} guildName - Discord guild name
 * @param {Object} settings - Guild settings object
 */
async function upsertGuildSettings(guildId, guildName, settings = {}) {
    try {
        const defaultSettings = {
            guild_id: guildId,
            guild_name: guildName,
            welcome_channel_id: null,
            welcome_message: "Welcome to {guild}, {user}! 🎉",
            is_active: true,
            updated_at: new Date().toISOString(),
            ...settings
        };

        const { error } = await supabaseClient
            .from('guilds')
            .upsert([defaultSettings], { 
                onConflict: 'guild_id',
                ignoreDuplicates: false 
            });

        if (error) {
            console.error('❌ Failed to upsert guild settings:', error);
            return false;
        }

        console.log(`📝 Updated guild settings for: ${guildName} (${guildId})`);
        return true;
    } catch (error) {
        console.error('❌ Error upserting guild settings:', error);
        return false;
    }
}

/**
 * Log link editing violation or attempt to database
 * @param {string} guildId - Discord guild ID
 * @param {string} userId - Discord user ID
 * @param {string} username - User's display name
 * @param {string} channelId - Discord channel ID
 * @param {string} messageId - Discord message ID (optional)
 * @param {string} violationType - Type of violation ('added' or 'modified')
 * @param {string} oldContent - Original message content
 * @param {string} newContent - New message content
 * @param {string} actionTaken - Action taken by the bot ('message_deleted', 'allowed_within_grace_period', etc.)
 */
async function logLinkViolation(guildId, userId, username, channelId, messageId, violationType, oldContent, newContent, actionTaken = 'message_deleted') {
    try {
        const { error } = await supabaseClient
            .from('link_edit_violations')
            .insert([
                {
                    guild_id: guildId,
                    user_id: userId,
                    username: username,
                    channel_id: channelId,
                    message_id: messageId,
                    violation_type: violationType,
                    old_content: oldContent?.substring(0, 1000), // Limit content length
                    new_content: newContent?.substring(0, 1000), // Limit content length
                    action_taken: actionTaken,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error('❌ Failed to log link violation:', error);
            return false;
        }

        const actionMessage = actionTaken === 'allowed_within_grace_period' 
            ? `📝 Logged link editing attempt (allowed): ${username} (${userId}) in guild ${guildId}`
            : `📝 Logged link editing violation: ${username} (${userId}) in guild ${guildId}`;
        
        console.log(actionMessage);
        return true;
    } catch (error) {
        console.error('❌ Error logging link violation:', error);
        return false;
    }
}

/**
 * Get recent link violations and attempts for a guild
 * @param {string} guildId - Discord guild ID
 * @param {number} limit - Number of records to fetch (default: 50)
 * @param {string} actionFilter - Filter by action type (optional)
 * @returns {Promise<Array|null>} Array of violations or null if error
 */
async function getRecentLinkViolations(guildId, limit = 50, actionFilter = null) {
    try {
        let query = supabaseClient
            .from('link_edit_violations')
            .select('*')
            .eq('guild_id', guildId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (actionFilter) {
            query = query.eq('action_taken', actionFilter);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ Failed to get link violations:', error);
            return null;
        }

        return data;
    } catch (error) {
        console.error('❌ Error getting link violations:', error);
        return null;
    }
}

/**
 * Get link violation statistics for a guild
 * @param {string} guildId - Discord guild ID
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<Object|null>} Statistics object or null if error
 */
async function getLinkViolationStats(guildId, days = 30) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabaseClient
            .from('link_edit_violations')
            .select('action_taken, violation_type, created_at')
            .eq('guild_id', guildId)
            .gte('created_at', startDate.toISOString());

        if (error) {
            console.error('❌ Failed to get link violation stats:', error);
            return null;
        }

        const stats = {
            total: data.length,
            deleted: data.filter(v => v.action_taken === 'message_deleted').length,
            allowed: data.filter(v => v.action_taken === 'allowed_within_grace_period').length,
            added: data.filter(v => v.violation_type === 'added').length,
            modified: data.filter(v => v.violation_type === 'modified').length,
            period_days: days
        };

        return stats;
    } catch (error) {
        console.error('❌ Error getting link violation stats:', error);
        return null;
    }
}

module.exports = {
    initializeSupabase,
    testConnection,
    logMemberJoin,
    getGuildSettings,
    upsertGuildSettings,
    logLinkViolation,
    getRecentLinkViolations,
    getLinkViolationStats
};