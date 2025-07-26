const { upsertGuildSettings } = require('../database/supabase');

/**
 * Handle bot joining a new guild
 * @param {Client} client - Discord client instance
 * @param {Guild} guild - The guild the bot joined
 */
async function guildCreate(client, guild) {
    try {
        console.log(`🎉 Joined new guild: ${guild.name} (${guild.id})`);
        console.log(`📊 Guild has ${guild.memberCount} members`);

        // Create default settings for the new guild
        await upsertGuildSettings(guild.id, guild.name, {
            welcome_message: `Welcome to ${guild.name}, {user}! 🎉 We're glad to have you here!`,
            is_active: true
        });

        // Try to find an appropriate channel to send a setup message
        let systemChannel = guild.systemChannel;
        
        if (!systemChannel) {
            // Look for common channel names
            const channelNames = ['general', 'main', 'welcome', 'announcements', 'bot-commands'];
            
            for (const channelName of channelNames) {
                systemChannel = guild.channels.cache.find(
                    channel => channel.name.toLowerCase().includes(channelName) && 
                              channel.type === 0 // Text channel
                );
                if (systemChannel) break;
            }
        }

        // If still no channel, use the first available text channel
        if (!systemChannel) {
            systemChannel = guild.channels.cache.find(channel => 
                channel.type === 0 && 
                channel.permissionsFor(guild.members.me)?.has(['SendMessages', 'ViewChannel'])
            );
        }

        // Send setup message if we found a suitable channel
        if (systemChannel) {
            const setupMessage = `
🤖 **Thanks for adding Giggles to ${guild.name}!** 

I'm here to welcome new members with customizable messages. Here's what I can do:

✅ **Automatic welcome messages** when new members join
📝 **Customizable welcome text** with placeholders like {user}, {guild}, {membercount}
🎯 **Flexible channel selection** - I'll find the best channel or you can set one specifically
📊 **Member join logging** to keep track of your community growth

**Quick Setup:**
• I'm already active and will welcome new members automatically!
• I'll use channels like #welcome, #general, or your server's system channel
• You can customize my welcome messages through the database settings

**Need help?** Contact the bot administrator for advanced configuration options.

Ready to welcome your next member! 🎉
            `.trim();

            try {
                await systemChannel.send(setupMessage);
                console.log(`✅ Setup message sent to ${systemChannel.name} in ${guild.name}`);
            } catch (error) {
                console.log(`⚠️ Could not send setup message in ${guild.name}:`, error.message);
            }
        } else {
            console.log(`⚠️ No suitable channel found for setup message in ${guild.name}`);
        }

        // Log guild statistics
        console.log(`📈 Now serving ${client.guilds.cache.size} total guilds`);

    } catch (error) {
        console.error('❌ Error in guildCreate event:', error);
    }
}

module.exports = guildCreate; 