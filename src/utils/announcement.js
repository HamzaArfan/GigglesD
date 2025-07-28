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
        const channelMap = {
            introductions: 'introductions',
            whatIsAgenci: 'what-is-agenci',
            byLocation: 'how-acw-by-location-works',
            ideas: 'ideas',
            rules: 'rules'
        };
        const resolved = Object.fromEntries(
            Object.entries(channelMap).map(([key, name]) => {
                const ch = guild.channels.cache.find((c) => c.type === 0 && c.name === name);
                return [key, ch ? `<#${ch.id}>` : `#${name}`];
            })
        );

        const purple = '🔹';

        const embed = new EmbedBuilder()
            .setColor('#201679')
            .setTitle('Welcome to ACW — A Conversation Worldwide')
            .setDescription(
                [
                    'ACW is designed for founders and creators who are actively developing and expanding their ideas. Whether you’re still figuring things out or already making moves, this is your space to get structure, guidance, and advice from people who are right where you are. Expect live events, free 1-on-1 consulting, networking, giveaways, and much more.',
                    '',
                    'This isn’t just another Discord server. It’s a community of people working on real things — some who are just getting started, some who are further ahead, and **all supported by the ACW expert team**. You’ll meet people building where you are, and others who’ve already faced the challenges you’re up against.',
                    '',
                    'Here’s how to dive in:',
                    `${purple} Introduce yourself in ${resolved.introductions}`,
                    `${purple} Head to ${resolved.whatIsAgenci} to meet **AgencI**, your AI co-founder`,
                    `${purple} Join your city channel in ${resolved.byLocation}`,
                    `${purple} Share what you’re working on in ${resolved.ideas}`,
                    `${purple} Read the rules in ${resolved.rules}`,
                    '',
                    'This is a space for action. Get in, get support, and start making things happen!'
                ].join('\n')
            )
            .setImage(bannerUrl)
            .setTimestamp();

        await announcementChannel.send({ embeds: [embed] });
        console.log(`✅ Static announcement sent in ${guild.name} (#${announcementChannel.name})`);

        // ---- Additional per-channel announcements ----
        const perChannelContent = [
            {
                channelKey: 'rules',
                title: 'ACW Community Guidelines',
                paragraphs: [
                    'This is a professional space for people building and growing their ideas. Let’s keep it focused:',
                    `${purple} Be respectful — No hate, harassment, or unnecessary negativity`,
                    `${purple} No spam — Keep promo and links in the right channels`,
                    `${purple} Stay focused — This space is for building, learning, and collaborating`,
                    `${purple} Respect privacy — No DMs without permission; no screenshots or recordings`,
                    `${purple} Contribute — This space is as strong as the people in it`,
                    '',
                    'We’ll take action if needed to protect the community and keep the space focused and supportive. Let’s keep it real.'
                ]
            },
            {
                channelKey: 'whatIsAgenci',
                title: 'What is AgencI?',
                paragraphs: [
                    'AgencI is your AI co-founder. It helps you define your goals, break them into manageable tasks, prioritize what matters most, and keep momentum week after week. Whether you\'re building a pitch deck, outlining your launch plan, or figuring out where to focus, AgencI gives you structure and next steps tailored to where you are. It helps you plan, execute, and stay on track as you build your business.',
                    '',
                    'How it helps:',
                    `${purple} Guides you through your journey, step-by-step, based on where you are`,
                    `${purple} Helps you set goals, prioritize tasks, and avoid overwhelm`,
                    `${purple} Offers direct, personalized support with clear next steps`,
                    `${purple} Surfaces resources and tools relevant to your current stage`,
                    '',
                    'Sign up here: https://agencibyacw.com/',
                    '',
                    `In the ${resolved.whatIsAgenci.replace('#', '')} channel you can:`,
                    `${purple} Ask questions about using AgencI`,
                    `${purple} Share what you’re building with it`,
                    `${purple} Take a short journey quiz to figure out what stage you’re at and what to focus on next`
                ]
            },
            {
                channelKey: 'byLocation',
                title: 'ACW by Location – Let’s Make It Local',
                paragraphs: [
                    'This is where the global community gets personal.',
                    '',
                    'Find your region, meet others nearby, and:',
                    `${purple} Collaborate with local founders`,
                    `${purple} Attend IRL or virtual meetups`,
                    `${purple} Share local resources, tools, and opportunities`,
                    'We currently only support New York and Chicago. #new-york #chicago'
                ]
            }
        ];

        for (const item of perChannelContent) {
            const chName = channelMap[item.channelKey];
            const targetChannel = guild.channels.cache.find((c) => c.type === 0 && c.name === chName);
            if (!targetChannel) continue;

            const recent = await targetChannel.messages.fetch({ limit: 20 });
            const exists = recent.find((m) => m.author.id === guild.members.me.id && m.embeds?.[0]?.title === item.title);
            if (exists) {
                continue;
            }

            const sectionEmbed = new EmbedBuilder()
                .setColor('#201679')
                .setTitle(item.title)
                .setDescription(item.paragraphs.join('\n'))
                .setTimestamp();

            try {
                await targetChannel.send({ embeds: [sectionEmbed] });
                console.log(`✅ Section announcement "${item.title}" sent in #${targetChannel.name}`);
            } catch (err) {
                console.log(`⚠️ Failed to send section embed in #${targetChannel?.name}:`, err.message);
            }
        }
    } catch (error) {
        console.error('❌ Failed to send announcements in ' + (guild?.name || 'unknown guild') + ':', error);
    }
}

module.exports = sendStaticAnnouncement;