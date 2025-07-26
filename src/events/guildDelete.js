const { upsertGuildSettings } = require('../database/supabase');

/**
 * Handle bot leaving a guild
 * @param {Client} client - Discord client instance
 * @param {Guild} guild - The guild the bot left
 */
async function guildDelete(client, guild) {
    try {
        console.log(`👋 Left guild: ${guild.name} (${guild.id})`);

        // Deactivate guild settings instead of deleting
        // This preserves data in case the bot is re-added later
        await upsertGuildSettings(guild.id, guild.name, {
            is_active: false,
            updated_at: new Date().toISOString()
        });

        console.log(`🔄 Deactivated settings for ${guild.name}`);
        console.log(`📈 Now serving ${client.guilds.cache.size} total guilds`);

    } catch (error) {
        console.error('❌ Error in guildDelete event:', error);
    }
}

module.exports = guildDelete; 