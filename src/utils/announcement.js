const { EmbedBuilder } = require('discord.js');

/**
 * Send a static announcement message (with banner image) to the server's announcement channel.
 * It tries to avoid duplicates by checking recent messages for one already sent by the bot.
 *
 * Environment variables:
 *  - ANNOUNCEMENT_BANNER_URL (optional): URL of the banner image to use.
 *
 * @param {import('discord.js').Guild} guild - The guild to send the announcement in.
 */
async function sendStaticAnnouncement(guild) {
    try {
        // Attempt to locate an announcement-type channel
        const announcementChannel = guild.channels.cache.find(
            (ch) =>
                ch.type === 0 && // text channel
                ['announcement', 'announcements', 'announce', 'server-announce', 'news'].some((name) =>
                    ch.name.toLowerCase().includes(name)
                ) &&
                ch.permissionsFor(guild.members.me)?.has(['ViewChannel', 'SendMessages'])
        );

        if (!announcementChannel) {
            console.log(`ℹ️ No announcement channel found in ${guild.name}. Skipping static announcement.`);
            return;
        }

        // Prevent duplicates: look for an existing message with an embed whose title is "About GigglesD"
        const recentMessages = await announcementChannel.messages.fetch({ limit: 20 });
        const alreadyExists = recentMessages.find(
            (msg) => msg.author.id === guild.members.me.id && msg.embeds?.[0]?.title === 'About GigglesD'
        );
        if (alreadyExists) {
            console.log(`ℹ️ Announcement already exists in ${guild.name}. Skipping.`);
            return;
        }

        // Build the announcement embed
        const bannerUrl = process.env.ANNOUNCEMENT_BANNER_URL ||
            'https://i.imgur.com/8rWCY4B.png'; // Fallback generic banner

        // Determine channel mentions (or fall back to plain text if not found)
        const channelNames = ['test', 'test1', 'new-joiners'];
        const channelMentions = channelNames.map((name) => {
            const ch = guild.channels.cache.find((c) => c.type === 0 && c.name === name);
            return ch ? `<#${ch.id}>` : `#${name}`;
        });
        const [testCh, test1Ch, newJoinersCh] = channelMentions;

        const embed = new EmbedBuilder()
            .setColor('#FF0000') // red
            .setTitle('About GigglesD')
            .setDescription(
                [
                    'Welcome to **GigglesD** – your all-in-one community companion! 🎉 GigglesD powers smart onboarding, security and networking features that you can customise for any Discord server.',
                    '',
                    'What can GigglesD do right now?',
                    '• 🤖 **Personalised welcomes** – automatic, rich-embed greetings for new members',
                    '• 🔒 **Link-edit protection** – deletes risky link edits and logs details to keep raids at bay',
                    `• 💬 **Join us in ${newJoinersCh}** – meet other newcomers and get quick help`,
                    `Useful channels: ${testCh}, ${test1Ch}, ${newJoinersCh}`,
                    '',
                    'Learn more in **#docs** or ping the dev team if you have questions. Thanks for choosing GigglesD!'
                ].join('\n')
            )
            .setImage(bannerUrl)
            .setTimestamp();

        await announcementChannel.send({ embeds: [embed] });
        console.log(`✅ Static announcement sent in ${guild.name} (#${announcementChannel.name})`);
    } catch (error) {
        console.error(`❌ Failed to send static announcement in ${guild?.name}:`, error);
    }
}

module.exports = sendStaticAnnouncement; 