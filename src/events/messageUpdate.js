const { EmbedBuilder } = require('discord.js');
const { containsUrls, hasModeratorPermissions, detectUrlChanges, logWithTimestamp } = require('../utils/helpers');
const { logLinkViolation } = require('../database/supabase');

/**
 * Handle message updates to enforce time-based link editing rules
 * @param {Client} client - Discord client instance
 * @param {Message} oldMessage - The message before the edit
 * @param {Message} newMessage - The message after the edit
 */
async function messageUpdate(client, oldMessage, newMessage) {
    try {
        // Ignore bot messages and system messages
        if (newMessage.author.bot || newMessage.system) return;
        
        // Ignore if message is from DM (no guild)
        if (!newMessage.guild) return;
        
        // Ignore if we can't access the member (shouldn't happen but safety check)
        if (!newMessage.member) return;
        
        // Check if the user has moderator permissions - if so, allow the edit
        if (hasModeratorPermissions(newMessage.member)) {
            logWithTimestamp('info', `Moderator ${newMessage.author.username} edited message - allowed`, {
                userId: newMessage.author.id,
                guildId: newMessage.guild.id,
                channelId: newMessage.channel.id,
                messageId: newMessage.id
            });
            return;
        }
        
        // Detect if URLs were added or modified in the edit
        const urlChanges = detectUrlChanges(oldMessage.content, newMessage.content);
        
        // If no URL changes detected, allow the edit
        if (!urlChanges.hasChangedUrls) {
            logWithTimestamp('info', `Message edit without URL changes - allowed`, {
                userId: newMessage.author.id,
                guildId: newMessage.guild.id,
                channelId: newMessage.channel.id,
                messageId: newMessage.id
            });
            return;
        }
        
        // Calculate time since original message was sent
        const originalTimestamp = oldMessage.createdTimestamp;
        const currentTimestamp = Date.now();
        const timeDifferenceMinutes = (currentTimestamp - originalTimestamp) / (1000 * 60);
        
        // 10-minute grace period for link editing
        const GRACE_PERIOD_MINUTES = 10;
        
        logWithTimestamp('info', `Link editing detected - checking time restrictions`, {
            userId: newMessage.author.id,
            username: newMessage.author.username,
            guildId: newMessage.guild.id,
            guildName: newMessage.guild.name,
            channelId: newMessage.channel.id,
            messageId: newMessage.id,
            changeType: urlChanges.type,
            timeDifferenceMinutes: timeDifferenceMinutes.toFixed(2),
            gracePeriodMinutes: GRACE_PERIOD_MINUTES,
            withinGracePeriod: timeDifferenceMinutes <= GRACE_PERIOD_MINUTES
        });
        
        // If within grace period, allow the edit but log the attempt
        if (timeDifferenceMinutes <= GRACE_PERIOD_MINUTES) {
            logWithTimestamp('info', `Link edit attempt within ${GRACE_PERIOD_MINUTES} minute grace period - allowed but logged`, {
                userId: newMessage.author.id,
                username: newMessage.author.username,
                guildId: newMessage.guild.id,
                timeDifferenceMinutes: timeDifferenceMinutes.toFixed(2),
                changeType: urlChanges.type
            });
            
            // Log the attempt to database (even though it's allowed)
            logLinkViolation(
                newMessage.guild.id,
                newMessage.author.id,
                newMessage.author.username,
                newMessage.channel.id,
                newMessage.id,
                urlChanges.type,
                oldMessage.content,
                newMessage.content,
                'allowed_within_grace_period'
            ).catch(dbError => {
                logWithTimestamp('error', 'Failed to log link edit attempt to database', {
                    error: dbError.message,
                    userId: newMessage.author.id,
                    guildId: newMessage.guild.id
                });
            });
            
            return;
        }
        
        // Grace period exceeded - log the violation and take action
        logWithTimestamp('warn', `Link editing rule violation - grace period exceeded`, {
            userId: newMessage.author.id,
            username: newMessage.author.username,
            guildId: newMessage.guild.id,
            guildName: newMessage.guild.name,
            channelId: newMessage.channel.id,
            messageId: newMessage.id,
            changeType: urlChanges.type,
            timeDifferenceMinutes: timeDifferenceMinutes.toFixed(2),
            gracePeriodMinutes: GRACE_PERIOD_MINUTES,
            oldContent: oldMessage.content.substring(0, 100) + '...',
            newContent: newMessage.content.substring(0, 100) + '...'
        });

        // Log violation to database (async, don't await to avoid blocking)
        logLinkViolation(
            newMessage.guild.id,
            newMessage.author.id,
            newMessage.author.username,
            newMessage.channel.id,
            newMessage.id,
            urlChanges.type,
            oldMessage.content,
            newMessage.content,
            'message_deleted'
        ).catch(dbError => {
            logWithTimestamp('error', 'Failed to log link violation to database', {
                error: dbError.message,
                userId: newMessage.author.id,
                guildId: newMessage.guild.id
            });
        });
        
        // Try to delete the message immediately
        try {
            await newMessage.delete();
            logWithTimestamp('success', `Message deleted due to link edit violation`, {
                userId: newMessage.author.id,
                guildId: newMessage.guild.id,
                channelId: newMessage.channel.id,
                messageId: newMessage.id,
                timeDifferenceMinutes: timeDifferenceMinutes.toFixed(2)
            });
            
            // Send the custom warning message (auto-delete after 20 seconds)
            const warningMessage = `🚫 🔗 ✏️ 5️⃣ ⏰ ‼️\n👋 ${newMessage.author}, NO LINK EDITING AFTER 5 MINUTES!\n🛡️ For server safety, your message has been deleted.\n🎇 This notice will self-destruct in 20 seconds...`;
            
            const sentWarning = await newMessage.channel.send(warningMessage);
            
            // Auto-delete the warning message after 20 seconds
            setTimeout(async () => {
                try {
                    await sentWarning.delete();
                    logWithTimestamp('info', `Warning message auto-deleted after 20 seconds`, {
                        userId: newMessage.author.id,
                        guildId: newMessage.guild.id,
                        channelId: newMessage.channel.id
                    });
                } catch (deleteError) {
                    logWithTimestamp('warn', 'Could not delete warning message', {
                        error: deleteError.message,
                        userId: newMessage.author.id,
                        guildId: newMessage.guild.id
                    });
                }
            }, 20000);
            
        } catch (deleteError) {
            logWithTimestamp('error', `Failed to delete message with link edit violation`, {
                error: deleteError.message,
                userId: newMessage.author.id,
                guildId: newMessage.guild.id,
                channelId: newMessage.channel.id,
                messageId: newMessage.id,
                timeDifferenceMinutes: timeDifferenceMinutes.toFixed(2)
            });
            
            // If we can't delete the message, try to send a warning anyway
            try {
                const fallbackWarning = `⚠️ ${newMessage.author}, link editing is not allowed after ${GRACE_PERIOD_MINUTES} minutes for regular members.\n\nPlease ask a moderator if you need to share a link.`;
                await newMessage.channel.send(fallbackWarning);
                
                logWithTimestamp('info', `Fallback warning message sent`, {
                    userId: newMessage.author.id,
                    guildId: newMessage.guild.id,
                    channelId: newMessage.channel.id
                });
            } catch (warningError) {
                logWithTimestamp('error', `Failed to send warning message`, {
                    error: warningError.message,
                    userId: newMessage.author.id,
                    guildId: newMessage.guild.id,
                    channelId: newMessage.channel.id
                });
            }
        }
        
    } catch (error) {
        logWithTimestamp('error', `Error in messageUpdate handler`, {
            error: error.message,
            stack: error.stack,
            messageId: newMessage?.id,
            guildId: newMessage?.guild?.id,
            userId: newMessage?.author?.id
        });
    }
}

module.exports = messageUpdate;