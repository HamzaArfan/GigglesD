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
                ['about-agenci', 'about-acw', 'about-gigglesd'].some((name) =>
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
        // Use section-specific banner if provided, otherwise fall back to the legacy var or a default image
        const bannerUrl = process.env.ANNOUNCEMENT_BANNER_URL_ABOUT ||
            process.env.ANNOUNCEMENT_BANNER_URL ||
            'https://i.imgur.com/8rWCY4B.png';

        // Determine channel mentions (or fall back to plain text if not found)
        const channelMap = {
            introductions: 'introductions', // kept for bullet reference, no announcement sent
            whatIsAgenci: 'agenci-help',
            byLocation: 'acw-by-location',
            ideas: 'ideas', // kept for bullet reference, no announcement sent
            rules: 'server-rules'
        };
        const resolved = Object.fromEntries(
            Object.entries(channelMap).map(([key, name]) => {
                const ch = guild.channels.cache.find((c) => c.type === 0 && c.name === name);
                return [key, ch ? `<#${ch.id}>` : `#${name}`];
            })
        );

        // Use actual bullet point instead of emoji
        const bullet = '•';

        // Send banner image first
        const bannerEmbed = new EmbedBuilder()
            .setColor('#201679')
            .setImage(bannerUrl);
        
        const textEmbed = new EmbedBuilder()
            .setColor('#201679')
            .setTitle('Welcome to ACW — A Conversation Worldwide')
            .setDescription(
                [
                    'ACW is designed for founders and creators who are actively developing and expanding their ideas. Whether you\'re still figuring things out or already making moves, this is your space to get structure, guidance, and advice from people who are right where you are. Expect live events, free 1-on-1 consulting, networking, giveaways, and much more.',
                    '',
                    'This isn\'t just another Discord server. **It\'s a community** of people working on real things — some who are just getting started, some who are further ahead, and all supported by the ACW expert team. You\'ll meet people building where you are, and others who\'ve already faced the challenges you\'re up against.',
                    '',
                    'Here\'s how to dive in: Start connecting with people who are building just like you.',
                    `${bullet} Introduce yourself in ${resolved.introductions}`,
                    `${bullet} Head to ${resolved.whatIsAgenci} to meet **AgencI**, your AI co-founder`,
                    `${bullet} Join your city channel in ${resolved.byLocation}`,
                    `${bullet} Share what you're working on in ${resolved.ideas}`,
                    `${bullet} Read the rules in ${resolved.rules}`,
                    '',
                    '**This is a space for action.** Get in, get support, and start making things happen.'
                ].join('\n')
            )
            .setTimestamp();

        // Send banner as an attachment so it renders full-width, then include the text embed below it (same message)
        await announcementChannel.send({ files: [bannerUrl], embeds: [textEmbed] });
        console.log(`✅ Static announcement sent in ${guild.name} (#${announcementChannel.name})`);

        // ---- Additional per-channel announcements ----
        const perChannelContent = [
            // 1. What is AgencI?
            {
                channelKey: 'whatIsAgenci',
                title: 'What is AgencI?',
                bannerEnvVar: 'ANNOUNCEMENT_BANNER_URL_WHAT_IS_AGENCI',
                paragraphs: [
                    'AgencI is your AI co-founder. It helps you define your goals, break them into manageable tasks, prioritize what matters most, and keep momentum week after week. Whether you\'re building a pitch deck, outlining your launch plan, or figuring out where to focus, AgencI gives you structure and next steps tailored to where you are. It helps you plan, execute, and stay on track as you build your business.',
                    '',
                    'How it helps:',
                    `${bullet} Guides you through your journey, step-by-step, based on where you are`,
                    `${bullet} Helps you set goals, prioritize tasks, and avoid overwhelm`,
                    `${bullet} Offers direct, personalized support with clear next steps`,
                    `${bullet} Surfaces resources and tools relevant to your current stage`,
                    '',
                    'Sign up here: https://agencibyacw.com/',
                    '',
                    `In the ${resolved.whatIsAgenci.replace('#', '')} channel you can:`,
                    `${bullet} Ask questions about using AgencI`,
                    `${bullet} Share what you're building with it`,
                    `${bullet} Take a short journey quiz to figure out what stage you're at and what to focus on next`
                ]
            },

            // 2. ACW by Location
            {
                channelKey: 'byLocation',
                title: 'ACW by Location – Let\'s Make It Local',
                bannerEnvVar: 'ANNOUNCEMENT_BANNER_URL_BY_LOCATION',
                paragraphs: [
                    'This is where the global community gets personal.',
                    '',
                    'Find your region, meet others nearby, and:',
                    `${bullet} Collaborate with local founders`,
                    `${bullet} Attend IRL or virtual meetups`,
                    `${bullet} Share local resources, tools, and opportunities`,
                    'We currently only support New York and Chicago. #new-york #chicago'
                ]
            },

            // 3. Rules / Guidelines
            {
                channelKey: 'rules',
                title: 'ACW Community Guidelines',
                bannerEnvVar: 'ANNOUNCEMENT_BANNER_URL_RULES',
                paragraphs: [
                    'This is a professional space for people building and growing their ideas. Let\'s keep it focused:',
                    `${bullet} Be respectful — No hate, harassment, or unnecessary negativity`, 
                    `${bullet} No spam — Keep promo and links in the right channels`,
                    `${bullet} Stay focused — This space is for building, learning, and collaborating`,
                    `${bullet} Respect privacy — No DMs without permission; no screenshots or recordings`,
                    `${bullet} Contribute — This space is as strong as the people in it`,
                    '',
                    'We\'ll take action if needed to protect the community and keep the space focused and supportive. Let\'s keep it real.'
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

            const banner = process.env[item.bannerEnvVar] || 'https://i.imgur.com/8rWCY4B.png';

            const bannerEmbed = new EmbedBuilder()
                .setColor('#201679')
                .setImage(banner);

            const sectionEmbed = new EmbedBuilder()
                .setColor('#201679')
                .setTitle(item.title)
                .setDescription(item.paragraphs.join('\n'))
                .setTimestamp();

            try {
                // Banner attachment (full-width) + section embed in the same message
                await targetChannel.send({ files: [banner], embeds: [sectionEmbed] });

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