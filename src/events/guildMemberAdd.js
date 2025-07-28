const { logMemberJoin, getGuildSettings } = require('../database/supabase');
const { EmbedBuilder } = require('discord.js');
const { findBestWelcomeChannel, formatWelcomeMessage, getRandomWelcomeEmoji } = require('../utils/helpers');

/**
 * Handle new member joining a guild
 * @param {Client} client - Discord client instance
 * @param {GuildMember} member - The member who joined
 */
async function guildMemberAdd(client, member) {
    try {
        const { guild, user } = member;
        
        console.log(`👋 New member joined: ${user.username} in ${guild.name}`);

        // Log member join to database
        await logMemberJoin(
            guild.id,
            user.id,
            user.username,
            member.joinedAt?.toISOString() || new Date().toISOString()
        );

        // Get guild settings from database
        const guildSettings = await getGuildSettings(guild.id);
        
        // If guild is not active or no settings found, skip welcome message
        if (!guildSettings || !guildSettings.is_active) {
            console.log(`⏭️ Skipping welcome message for ${guild.name} (not active or no settings)`);
            return;
        }

        // Find the best welcome channel (prefer #new-joiners if it exists)
        let welcomeChannel = guild.channels.cache.find(ch => 
            ch.type === 0 && // text
            ch.name.toLowerCase() === 'new-joiners' &&
            ch.permissionsFor(guild.members.me)?.has(['ViewChannel', 'SendMessages'])
        );

        // Fallback to helper if #new-joiners is absent
        if (!welcomeChannel) {
            welcomeChannel = findBestWelcomeChannel(guild, guildSettings.welcome_channel_id);
        }

        if (!welcomeChannel) {
            console.log(`❌ No suitable welcome channel found in ${guild.name}`);
            return;
        }

        // Prepare welcome message
        const welcomeMessageTemplate = guildSettings.welcome_message || "Welcome to {guild}, {user}! 🎉";
        const welcomeMessage = formatWelcomeMessage(welcomeMessageTemplate, { user, guild });

        // Create welcome embed
        const welcomeEmoji = getRandomWelcomeEmoji();
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle(`${welcomeEmoji} Welcome to the Server!`)
            .setDescription(welcomeMessage)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields([
                {
                    name: '👤 Member Info',
                    value: `**Username:** ${user.username}\n**ID:** ${user.id}`,
                    inline: true
                },
                {
                    name: '📊 Server Stats',
                    value: `**Total Members:** ${guild.memberCount}\n**Server:** ${guild.name}`,
                    inline: true
                }
            ])
            .setFooter({ 
                text: `Welcome #${guild.memberCount}`, 
                iconURL: guild.iconURL({ dynamic: true }) 
            })
            .setTimestamp();

        // Send welcome message in server
        await welcomeChannel.send({
            content: `${user} just joined us! 🎉`,
            embeds: [welcomeEmbed]
        });

        console.log(`✅ Server welcome message sent for ${user.username} in ${guild.name}`);

        // Create DM welcome embed (personalized version)
        // Send direct message to user with a personalized welcome text (no emojis or images)
        const dmMessage = [
            'We just wanted to thank you for joining our server.',
            'We created this space to actually offer support that feels real, not surface-level stuff, but the kind of help that makes a difference when you’re building something from scratch or trying to figure out your next move.',
            'ACW (A Conversation Worldwide) exists to make starting (and continuing) less lonely and more doable. That’s the heart of it.',
            'Here’s what we promise to hold ourselves to:',
            '• We’ll always be honest, not performative.',
            '• We’ll keep things simple and clear.',
            '• We’ll keep this a space where new conversations can thrive.',
            'This server is a place to share progress, get feedback, meet others who get it, and just feel a little more seen in the process. No pressure to be perfect here.',
            'We’re glad you’re with us.',
            'If you ever need anything, just shoot a message.',
            'Because anything is possible with the right support.',
            '— The ACW Team'
        ].join('\n\n');

        // Send direct message to user
        try {
            await user.send(dmMessage);
            console.log(`✅ DM welcome message sent to ${user.username}`);
        } catch (dmError) {
            console.log(`⚠️ Could not send DM to ${user.username}: ${dmError.message}`);
            // This is normal - some users have DMs disabled
        }

    } catch (error) {
        console.error('❌ Error in guildMemberAdd event:', error);
    }
}

module.exports = guildMemberAdd; 