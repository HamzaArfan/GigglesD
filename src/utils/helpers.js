/**
 * Utility functions for the Discord bot
 */

/**
 * Format a welcome message by replacing placeholders
 * @param {string} message - Template message with placeholders
 * @param {Object} data - Data to replace placeholders with
 * @param {Object} data.user - Discord user object
 * @param {Object} data.guild - Discord guild object
 * @returns {string} Formatted message
 */
function formatWelcomeMessage(message, { user, guild }) {
    if (!message || !user || !guild) {
        return "Welcome to the server! 🎉";
    }

    return message
        .replace(/{user}/g, `<@${user.id}>`)
        .replace(/{username}/g, user.username || user.displayName || 'Unknown')
        .replace(/{guild}/g, guild.name || 'this server')
        .replace(/{server}/g, guild.name || 'this server')
        .replace(/{membercount}/g, guild.memberCount?.toString() || '0');
}

/**
 * Validate Discord snowflake ID
 * @param {string} id - Discord ID to validate
 * @returns {boolean} True if valid snowflake
 */
function isValidSnowflake(id) {
    return /^\d{17,19}$/.test(id);
}

/**
 * Get a random welcome emoji
 * @returns {string} Random emoji
 */
function getRandomWelcomeEmoji() {
    const emojis = ['🎉', '👋', '🎊', '🎈', '🌟', '✨', '🚀', '🎯', '💫', '🔥'];
    return emojis[Math.floor(Math.random() * emojis.length)];
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after timeout
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix for truncated text
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 100, suffix = '...') {
    if (!text || text.length <= maxLength) {
        return text || '';
    }
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Check if a channel is suitable for sending messages
 * @param {Object} channel - Discord channel object
 * @param {Object} botMember - Bot's guild member object
 * @returns {boolean} True if channel is suitable
 */
function isChannelSuitable(channel, botMember) {
    if (!channel || !botMember) return false;
    
    // Check if it's a text channel
    if (channel.type !== 0) return false;
    
    // Check bot permissions
    const permissions = channel.permissionsFor(botMember);
    if (!permissions) return false;
    
    return permissions.has(['ViewChannel', 'SendMessages']);
}

/**
 * Find the best welcome channel in a guild
 * @param {Object} guild - Discord guild object
 * @param {string} preferredChannelId - Preferred channel ID (optional)
 * @returns {Object|null} Best suitable channel or null
 */
function findBestWelcomeChannel(guild, preferredChannelId = null) {
    if (!guild || !guild.channels) return null;
    
    const botMember = guild.members.me;
    if (!botMember) return null;
    
    // Try preferred channel first
    if (preferredChannelId) {
        const preferredChannel = guild.channels.cache.get(preferredChannelId);
        if (preferredChannel && isChannelSuitable(preferredChannel, botMember)) {
            return preferredChannel;
        }
    }
    
    // Try system channel
    if (guild.systemChannel && isChannelSuitable(guild.systemChannel, botMember)) {
        return guild.systemChannel;
    }
    
    // Look for common welcome channel names
    const welcomeChannelNames = [
        'welcome', 'welcomes', 'new-members', 'greetings',
        'general', 'main', 'lobby', 'entrance',
        'announcements', 'community'
    ];
    
    for (const channelName of welcomeChannelNames) {
        const channel = guild.channels.cache.find(ch => 
            ch.name.toLowerCase().includes(channelName) && 
            isChannelSuitable(ch, botMember)
        );
        if (channel) return channel;
    }
    
    // Find any suitable text channel
    return guild.channels.cache.find(ch => isChannelSuitable(ch, botMember)) || null;
}

/**
 * Log with timestamp
 * @param {string} level - Log level (info, warn, error)
 * @param {string} message - Message to log
 * @param {Object} data - Additional data to log
 */
function logWithTimestamp(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const levelEmoji = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
        success: '✅'
    };
    
    const emoji = levelEmoji[level] || 'ℹ️';
    let logMessage = `[${timestamp}] ${emoji} ${message}`;
    
    if (data) {
        logMessage += ` | Data: ${JSON.stringify(data)}`;
    }
    
    console.log(logMessage);
}

/**
 * Escape Discord markdown in text
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/([*_`~\\])/g, '\\$1');
}

/**
 * Get user-friendly time difference
 * @param {Date} date - Date to compare
 * @returns {string} Human-readable time difference
 */
function getTimeAgo(date) {
    if (!date) return 'Unknown';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
}

/**
 * Check if a message contains URLs
 * @param {string} content - Message content to check
 * @returns {boolean} True if message contains URLs
 */
function containsUrls(content) {
    if (!content) return false;
    
    // URL regex pattern - matches http/https URLs and common patterns
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[a-z]{2,}\/[^\s]*)/gi;
    return urlRegex.test(content);
}

/**
 * Check if a user has moderator or admin permissions
 * @param {GuildMember} member - Guild member to check
 * @returns {boolean} True if user has mod/admin permissions
 */
function hasModeratorPermissions(member) {
    if (!member || !member.permissions) return false;
    
    // Check for admin permissions
    if (member.permissions.has('Administrator')) return true;
    
    // Check for moderator-like permissions
    const modPermissions = [
        'ManageMessages',
        'ManageChannels', 
        'ManageGuild',
        'BanMembers',
        'KickMembers',
        'ModerateMembers'
    ];
    
    return modPermissions.some(permission => member.permissions.has(permission));
}

/**
 * Compare two message contents to detect if URLs were added/modified
 * @param {string} oldContent - Original message content
 * @param {string} newContent - New message content
 * @returns {Object} Object with hasChangedUrls boolean and details
 */
function detectUrlChanges(oldContent, newContent) {
    if (!oldContent || !newContent) return { hasChangedUrls: false };
    
    const oldHasUrls = containsUrls(oldContent);
    const newHasUrls = containsUrls(newContent);
    
    // If URLs were added to a message that didn't have them
    if (!oldHasUrls && newHasUrls) {
        return { hasChangedUrls: true, type: 'added' };
    }
    
    // If URLs were modified (both had URLs but content changed)
    if (oldHasUrls && newHasUrls && oldContent !== newContent) {
        return { hasChangedUrls: true, type: 'modified' };
    }
    
    return { hasChangedUrls: false };
}

module.exports = {
    formatWelcomeMessage,
    isValidSnowflake,
    getRandomWelcomeEmoji,
    sleep,
    truncateText,
    isChannelSuitable,
    findBestWelcomeChannel,
    logWithTimestamp,
    escapeMarkdown,
    getTimeAgo,
    containsUrls,
    hasModeratorPermissions,
    detectUrlChanges
}; 