# Link Editing Rules Feature

## Overview

The **Link Editing Rules** feature automatically detects and prevents non-moderator users from adding or modifying links in their Discord messages through editing. This helps maintain security and prevents potential spam or malicious link distribution through message edits.

## How It Works

### Detection System
- The bot monitors all message edits using the `messageUpdate` event
- It compares the original and edited message content to detect URL changes
- Uses regex patterns to identify various URL formats:
  - `http://` and `https://` URLs
  - `www.` prefixed URLs
  - Domain-based URLs (e.g., `example.com/path`)

### Rule Enforcement
1. **Permission Check**: Users with moderator/admin permissions can edit links freely
2. **Violation Detection**: When a non-moderator edits a message to add or modify links:
   - The edited message is automatically deleted
   - A warning message is sent (auto-deleted after 10 seconds)
   - The violation is logged to the database and console

### Moderator Permissions
Users with any of these permissions can edit links without restriction:
- `Administrator`
- `ManageMessages`
- `ManageChannels`
- `ManageGuild`
- `BanMembers`
- `KickMembers`
- `ModerateMembers`

## Database Logging

All link editing violations are logged to the `link_edit_violations` table with:
- User and guild information
- Channel and message IDs
- Original and new message content
- Violation type (`added` or `modified`)
- Timestamp and action taken

## Setup Requirements

### 1. Discord Bot Permissions
Your bot needs these permissions in the Discord Developer Portal:
- **Server Members Intent** (already required)
- **Message Content Intent** (newly required for this feature)

### 2. Bot Server Permissions
Grant these permissions to your bot in each Discord server:
- `View Channels`
- `Send Messages`
- `Manage Messages` (to delete violating messages)
- `Read Message History`

### 3. Database Setup
Run the updated `database_schema.sql` file in your Supabase SQL Editor to create the violations table.

## Configuration

### Environment Variables
Ensure these are set in your `.env` file:
```
DISCORD_BOT_TOKEN=your_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

### Customization Options

#### Modify URL Detection
Edit the regex pattern in `src/utils/helpers.js` in the `containsUrls()` function:
```javascript
const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[a-z]{2,}\/[^\s]*)/gi;
```

#### Adjust Warning Message
Modify the embed in `src/events/messageUpdate.js`:
```javascript
const warningEmbed = new EmbedBuilder()
    .setColor('#ff6b6b')
    .setTitle('🚫 Link Editing Not Allowed')
    .setDescription('Your custom message here...')
```

#### Change Warning Duration
Adjust the auto-delete timeout (default: 10 seconds):
```javascript
setTimeout(async () => {
    // Delete warning message
}, 10000); // Change this value (in milliseconds)
```

## Testing the Feature

1. **As a Regular User**:
   - Post a message: `Hello everyone!`
   - Edit it to: `Hello everyone! Check out https://example.com`
   - The edited message should be deleted with a warning

2. **As a Moderator**:
   - Same steps as above
   - The edit should be allowed without any action

3. **Check Logs**:
   - Console logs show violation details
   - Database contains violation records

## Monitoring and Analytics

### View Recent Violations
```javascript
const { getRecentLinkViolations } = require('./src/database/supabase');

// Get last 50 violations for a guild
const violations = await getRecentLinkViolations('guild_id_here', 50);
```

### Console Monitoring
The bot logs all violations with detailed information:
```
[timestamp] ⚠️ Link editing rule violation detected | Data: {...}
[timestamp] ✅ Deleted message with link edit violation | Data: {...}
```

## Troubleshooting

### Common Issues

1. **Bot Not Detecting Edits**
   - Ensure `MessageContent` intent is enabled in Discord Developer Portal
   - Check bot has `Read Message History` permission

2. **Can't Delete Messages**
   - Verify bot has `Manage Messages` permission
   - Check role hierarchy (bot role must be higher than user's highest role)

3. **Database Errors**
   - Verify Supabase credentials in `.env`
   - Ensure database schema is updated with new table

### Error Handling
The feature includes comprehensive error handling:
- Failed message deletion falls back to warning-only mode
- Database logging failures don't affect rule enforcement
- All errors are logged with context for debugging

## Security Considerations

- The feature only prevents link editing, not initial link posting
- Moderators can still edit links (intended behavior)
- Original and edited content is logged (consider privacy implications)
- Content is truncated to 1000 characters in database storage

## Future Enhancements

Potential improvements:
- Whitelist trusted domains
- Configurable permission levels per guild
- Appeal/override system for false positives
- Integration with existing moderation bots
- Custom regex patterns per server

## Support

If you encounter issues:
1. Check console logs for error details
2. Verify bot permissions and intents
3. Test with a simple edit first
4. Review database connection status 