# 🤖 GigglesD - Discord Welcome Bot

A Discord bot that automatically welcomes new members to your server using Supabase as the backend database.

## 🌟 Features

- ✅ **Automatic Welcome Messages** - Greets new members when they join
- 📝 **Customizable Messages** - Use placeholders like `{user}`, `{guild}`, `{membercount}`
- 🎯 **Smart Channel Detection** - Automatically finds appropriate welcome channels
- 📊 **Member Join Logging** - Tracks member joins in your Supabase database
- 🔧 **Per-Server Configuration** - Different settings for each Discord server
- 🎨 **Rich Embeds** - Beautiful welcome messages with user avatars and server info

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- Discord Bot Token ([Create a bot](https://discord.com/developers/applications))
- Supabase project with database ([Create account](https://supabase.com))

### Installation

1. **Clone and navigate to the bot directory:**
   ```bash
   cd GigglesD/discord-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   Create a `.env` file in the bot directory with:
   ```env
   DISCORD_BOT_TOKEN=your_discord_bot_token_here
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   NODE_ENV=development
   ```

4. **Set up your Supabase database** (see Database Schema below)

5. **Run the bot:**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

## 🗄️ Database Schema

Create these tables in your Supabase database:

### `guilds` table
Stores Discord server configuration:

```sql
CREATE TABLE guilds (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) UNIQUE NOT NULL,
    guild_name TEXT NOT NULL,
    welcome_channel_id VARCHAR(20),
    welcome_message TEXT DEFAULT 'Welcome to {guild}, {user}! 🎉',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_guilds_guild_id ON guilds(guild_id);
```

### `member_joins` table
Logs when members join servers:

```sql
CREATE TABLE member_joins (
    id BIGSERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    username TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics and lookups
CREATE INDEX idx_member_joins_guild_id ON member_joins(guild_id);
CREATE INDEX idx_member_joins_user_id ON member_joins(user_id);
CREATE INDEX idx_member_joins_joined_at ON member_joins(joined_at);
```

### Row Level Security (RLS)
Enable RLS and create policies as needed for your security requirements.

## 🎛️ Configuration

### Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token for your `.env` file
5. Enable these **Privileged Gateway Intents**:
   - Server Members Intent
   - Message Content Intent (optional)

### Bot Permissions

When inviting the bot to servers, ensure it has these permissions:
- `View Channels`
- `Send Messages`
- `Embed Links`
- `Read Message History`

### Supabase Setup

1. Create a new Supabase project
2. Get your project URL and anon key from Settings > API
3. Execute the SQL schema above in the SQL editor
4. Configure Row Level Security policies as needed

## 📝 Message Customization

The bot supports these placeholders in welcome messages:

- `{user}` - Mentions the new user (@username)
- `{username}` - User's display name
- `{guild}` - Server name
- `{server}` - Server name (alias for {guild})
- `{membercount}` - Total member count

### Example Messages:
```
Welcome to {guild}, {user}! 🎉 You're member #{membercount}!

Hey {username}! Thanks for joining {server}. Hope you enjoy your stay! 🚀

🎊 {user} just landed in {guild}! We now have {membercount} awesome members!
```

## 🔧 Project Structure

```
discord-bot/
├── src/
│   ├── index.js              # Main bot entry point
│   ├── database/
│   │   └── supabase.js       # Database connection & queries
│   └── events/
│       ├── eventHandler.js   # Event registration
│       ├── guildMemberAdd.js # New member welcome logic
│       ├── guildCreate.js    # Bot joins server logic
│       └── guildDelete.js    # Bot leaves server logic
├── package.json
└── README.md
```

## 🎯 How It Works

1. **Bot Initialization**: Connects to Discord and Supabase
2. **Server Join**: When added to a server, creates default settings
3. **Member Join**: When someone joins:
   - Logs the join to database
   - Retrieves server settings
   - Finds appropriate welcome channel
   - Sends customized welcome message with embed
4. **Smart Fallbacks**: If no welcome channel is set, looks for common channel names

## 🛠️ Development

### Scripts
- `npm start` - Run the bot in production
- `npm run dev` - Run with nodemon for development

### Debugging
The bot provides comprehensive console logging:
- ✅ Success operations (green checkmarks)
- ❌ Error operations (red X marks)
- ⚠️ Warning operations (yellow warning signs)
- 📊 Statistics and info

### Adding New Features

1. **New Events**: Add event handlers in `src/events/`
2. **Database Operations**: Extend `src/database/supabase.js`
3. **New Commands**: Create command handlers (future feature)

## 📊 Database Analytics

Query examples for member join analytics:

```sql
-- Member joins per day
SELECT 
    DATE(joined_at) as join_date,
    COUNT(*) as joins
FROM member_joins 
WHERE guild_id = 'your_guild_id'
GROUP BY DATE(joined_at)
ORDER BY join_date DESC;

-- Most active servers
SELECT 
    g.guild_name,
    COUNT(mj.id) as total_joins
FROM guilds g
LEFT JOIN member_joins mj ON g.guild_id = mj.guild_id
WHERE g.is_active = true
GROUP BY g.guild_id, g.guild_name
ORDER BY total_joins DESC;
```

## 🔒 Security Notes

- Never commit your `.env` file
- Use environment variables for all sensitive data
- Enable RLS on your Supabase tables
- Regularly rotate your bot token and database keys
- Monitor bot permissions in Discord servers

## 🆘 Troubleshooting

### Common Issues

**Bot not responding:**
- Check if bot token is correct
- Verify bot has necessary permissions
- Check console for error messages

**Database connection failed:**
- Verify Supabase URL and anon key
- Check if database tables exist
- Ensure network connectivity

**Welcome messages not sending:**
- Verify bot has `Send Messages` permission
- Check if welcome channel exists and is accessible
- Look for permission errors in console

### Getting Help

1. Check console logs for error details
2. Verify all environment variables are set
3. Test database connection manually
4. Ensure Discord bot permissions are correct

## 📈 Future Enhancements

- Slash commands for server administrators
- Custom welcome images/GIFs
- Role assignment for new members
- Welcome message scheduling
- Advanced analytics dashboard
- Multi-language support

## 📄 License

MIT License - feel free to modify and distribute as needed.

---

Made with ❤️ for Discord communities 