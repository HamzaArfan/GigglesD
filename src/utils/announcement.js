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
                ['about'].some((name) =>
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

        // Map each logical key to either a channel ID or a channel name (used as fallback / lookup)
        const channelMap = {
            introductions: { id: '1397710401449230347', name: 'introductions' },
            whatIsAgenci:   { id: '1394840198210261092', name: 'what-is-agenci' },
            agenciHelp:     { id: '1395469596026339511', name: 'agenci-help' },
            rules:          { id: '1394834581114458235', name: 'rules' },
            byLocation:     { id: '1395474602255319070', name: 'acw-by-location' },
            ideas:          { id: '1397710423792554196', name: 'ideas' },

            // Additional general channels
            generalChat:    { id: '1394840946356650164', name: 'general-chat' },
            businessColab:  { id: '1394842749563572234', name: 'business-colab' },
            businessHelp:   { id: '1394841039218671766', name: 'business-help' }
        };

        // City-specific channels used in the by-location section text
        const cityChannelMap = {
            newYork: { id: '1394841687746023444', name: 'new-york' },
            chicago: { id: '1394841948715487322', name: 'chicago' }
        };

        const getCityChannel = (key) => {
            const spec = cityChannelMap[key] || {};
            let ch;
            if (spec.id) ch = guild.channels.cache.get(spec.id);
            if (!ch && spec.name) ch = guild.channels.cache.find((c) => c.type === 0 && c.name === spec.name);
            return ch;
        };

        const resolvedCities = Object.fromEntries(
            Object.keys(cityChannelMap).map((key) => {
                const ch = getCityChannel(key);
                const fallback = cityChannelMap[key].name ? `#${cityChannelMap[key].name}` : `<#${cityChannelMap[key].id}>`;
                return [key, ch ? `<#${ch.id}>` : fallback];
            })
        );

        // Helper to get a channel by key (using ID if available, otherwise by name)
        const getChannel = (key) => {
            const spec = channelMap[key] || {};
            let ch;
            if (spec.id) {
                ch = guild.channels.cache.get(spec.id);
            }
            if (!ch && spec.name) {
                ch = guild.channels.cache.find((c) => c.type === 0 && c.name === spec.name);
            }
            return ch;
        };

        // Build resolved mention strings for bullets (fallbacks to plain text if channel missing)
        const resolved = Object.fromEntries(
            Object.keys(channelMap).map((key) => {
                const ch = getChannel(key);
                const fallback = channelMap[key].name ? `#${channelMap[key].name}` : `<#${channelMap[key].id}>`;
                return [key, ch ? `<#${ch.id}>` : fallback];
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
                    `We currently only support New York and Chicago. ${resolvedCities.newYork} ${resolvedCities.chicago}`
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
            },

            // 4. AgencI Help & Support
            {
                channelKey: 'agenciHelp',
                title: 'AgencI Help & Support',
                bannerEnvVar: 'ANNOUNCEMENT_BANNER_URL_AGENCI_HELP',
                paragraphs: [
                    'Have questions about using AgencI or need troubleshooting assistance? This is the place to get direct support from the team and fellow founders.',
                    '',
                    'In this channel you can:',
                    `${bullet} Ask anything about AgencI features or workflow`,
                    `${bullet} Share screenshots or examples of what you\'re building`,
                    `${bullet} Get feedback and tips from the community`,
                    '',
                    'Please keep discussions focused on AgencI. For broader topics, visit other channels like #ideas or #acw-by-location.'
                ]
            }
        ];

        for (const item of perChannelContent) {
            const chName = channelMap[item.channelKey];
            const targetChannel = getChannel(item.channelKey);
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