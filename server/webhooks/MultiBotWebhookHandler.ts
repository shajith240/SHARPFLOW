import { Request, Response } from 'express';
import { supabase } from '../db';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      type: string;
    };
    date: number;
    text?: string;
  };
}

export class MultiBotWebhookHandler {
  
  static async handleWebhook(req: Request, res: Response) {
    try {
      const update: TelegramUpdate = req.body;
      
      console.log('📱 Multi-bot webhook received:', JSON.stringify(update, null, 2));
      
      if (!update.message || !update.message.text) {
        return res.status(200).json({ ok: true });
      }

      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text.trim();
      const telegramUserId = message.from.id;
      const username = message.from.username;
      const firstName = message.from.first_name;

      // Extract bot token from request headers or URL
      const botToken = this.extractBotToken(req);
      if (!botToken) {
        console.error('❌ No bot token found in request');
        return res.status(400).json({ error: 'Bot token not found' });
      }

      // Find which user this bot belongs to
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, telegram_bot_username, telegram_id, telegram_username')
        .eq('telegram_bot_token', botToken)
        .single();

      if (userError || !user) {
        console.error(`❌ No user found for bot token: ${botToken.substring(0, 10)}...`);
        return res.status(404).json({ error: 'Bot not configured' });
      }

      console.log(`💬 Message from @${username} (${firstName}) to @${user.telegram_bot_username}: "${text}"`);

      // Handle different message types
      await this.processMessage(
        user.id,
        user.telegram_bot_username,
        botToken,
        chatId,
        text,
        telegramUserId,
        username,
        firstName,
        user.telegram_id,
        user.telegram_username
      );

      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('❌ Multi-bot webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private static extractBotToken(req: Request): string | null {
    // Try to extract bot token from various sources
    
    // 1. From URL path (e.g., /webhook/BOT_TOKEN)
    const urlToken = req.path.split('/').pop();
    if (urlToken && urlToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      return urlToken;
    }

    // 2. From headers
    const headerToken = req.headers['x-telegram-bot-token'] as string;
    if (headerToken && headerToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      return headerToken;
    }

    // 3. From query parameter
    const queryToken = req.query.bot_token as string;
    if (queryToken && queryToken.match(/^\d+:[A-Za-z0-9_-]+$/)) {
      return queryToken;
    }

    return null;
  }

  private static async processMessage(
    userId: string,
    botUsername: string,
    botToken: string,
    chatId: number,
    text: string,
    telegramUserId: number,
    username?: string,
    firstName?: string,
    linkedTelegramId?: number,
    linkedTelegramUsername?: string
  ) {
    try {
      const command = text.toLowerCase();

      // Check if user is linked to this bot
      const isLinked = linkedTelegramId === telegramUserId;

      if (command.startsWith('/start')) {
        await this.handleStartCommand(botToken, chatId, isLinked, firstName, userId);
      } else if (command.startsWith('/help')) {
        await this.handleHelpCommand(botToken, chatId, isLinked);
      } else if (this.isVerificationCode(text)) {
        await this.handleVerificationCode(botToken, chatId, text, telegramUserId, username, userId);
      } else if (isLinked) {
        // User is linked, forward message to their n8n workflow
        await this.forwardToN8nWorkflow(
          userId,
          botUsername,
          chatId,
          telegramUserId,
          text
        );
      } else {
        // User not linked, prompt to link account
        await this.sendMessage(botToken, chatId, 
          `🔗 **Account Not Linked**\n\n` +
          `To use your personal SharpFlow bot, please:\n` +
          `1. Visit https://sharpflow.com/dashboard\n` +
          `2. Go to Bot settings\n` +
          `3. Generate a verification code\n` +
          `4. Send the code here to link your account\n\n` +
          `💡 Type /help for more information`
        );
      }
    } catch (error) {
      console.error('Error processing message:', error);
      await this.sendMessage(botToken, chatId, 
        `❌ **Error**\n\nSomething went wrong. Please try again later or contact support.`
      );
    }
  }

  private static async handleStartCommand(
    botToken: string,
    chatId: number,
    isLinked: boolean,
    firstName?: string
  ) {
    const greeting = firstName ? `Hello ${firstName}! 👋` : 'Hello! 👋';
    
    if (isLinked) {
      await this.sendMessage(botToken, chatId,
        `${greeting}\n\n` +
        `🎉 **Welcome to Your Personal SharpFlow Bot!**\n\n` +
        `✅ Your account is linked and ready\n\n` +
        `🚀 **What you can do:**\n` +
        `• Send any message to generate leads\n` +
        `• Request research reports\n` +
        `• Get company analysis\n` +
        `• All data flows directly to your dashboard\n\n` +
        `💡 **Quick Commands:**\n` +
        `• "find leads in san francisco tech" - Generate leads\n` +
        `• "research [LinkedIn URL]" - Analyze profiles\n` +
        `• "help" - Show all commands\n\n` +
        `🌐 **Dashboard:** https://sharpflow.com/dashboard`
      );
    } else {
      await this.sendMessage(botToken, chatId,
        `${greeting}\n\n` +
        `🤖 **Welcome to Your Personal SharpFlow Bot!**\n\n` +
        `This is your dedicated bot for lead generation and research.\n\n` +
        `🔗 **Get Started:**\n` +
        `1. Visit https://sharpflow.com/dashboard\n` +
        `2. Go to Bot settings\n` +
        `3. Generate a verification code\n` +
        `4. Send the code here to link your account\n\n` +
        `💡 Type /help for more information`
      );
    }
  }

  private static async handleHelpCommand(botToken: string, chatId: number, isLinked: boolean) {
    if (isLinked) {
      await this.sendMessage(botToken, chatId,
        `📚 **Your Personal SharpFlow Bot Help**\n\n` +
        `🔗 **Account:** Linked ✅\n\n` +
        `🚀 **Available Commands:**\n\n` +
        `**Lead Generation:**\n` +
        `• Send any natural language request\n` +
        `• "find leads in [location] [industry]"\n` +
        `• "get prospects for [job title] in [company type]"\n\n` +
        `**Research & Analysis:**\n` +
        `• "research [LinkedIn URL]" - Profile analysis\n` +
        `• "analyze [company name]" - Company research\n\n` +
        `**Account:**\n` +
        `• "status" - Check your usage\n` +
        `• "help" - Show this help\n\n` +
        `💡 **How it works:**\n` +
        `Your messages are processed by your personal n8n workflow, which uses Apollo.io to find leads and stores results directly in your SharpFlow dashboard.\n\n` +
        `🌐 **Dashboard:** https://sharpflow.com/dashboard`
      );
    } else {
      await this.sendMessage(botToken, chatId,
        `📚 **Personal SharpFlow Bot Help**\n\n` +
        `🔗 **Account:** Not linked\n\n` +
        `**To get started:**\n` +
        `1. Visit https://sharpflow.com/dashboard\n` +
        `2. Go to Bot settings\n` +
        `3. Generate verification code\n` +
        `4. Send the code here\n\n` +
        `**What you'll get:**\n` +
        `• Personal lead generation bot\n` +
        `• Direct integration with your n8n workflow\n` +
        `• All data stored in your private dashboard\n` +
        `• Complete data isolation from other clients\n\n` +
        `💡 This is your dedicated bot - no sharing with other users!`
      );
    }
  }

  private static async handleVerificationCode(
    botToken: string,
    chatId: number,
    code: string,
    telegramUserId: number,
    username: string | undefined,
    userId: string
  ) {
    try {
      console.log(`🔍 Processing verification code: ${code} for user ${userId}`);

      // Find verification code in database
      const { data: verification, error: verificationError } = await supabase
        .from('telegram_verification_codes')
        .select('*, users(*)')
        .eq('verification_code', code)
        .eq('used', false)
        .eq('user_id', userId) // Ensure code belongs to this user
        .gte('expires_at', new Date().toISOString())
        .single();

      if (verificationError || !verification) {
        console.log(`❌ Verification code ${code} not found or expired for user ${userId}`);
        await this.sendMessage(botToken, chatId,
          `❌ **Invalid Code**\n\n` +
          `The verification code is invalid or expired.\n\n` +
          `💡 **Generate a new code:**\n` +
          `1. Go to https://sharpflow.com/dashboard\n` +
          `2. Navigate to Bot settings\n` +
          `3. Click "Generate Verification Code"\n` +
          `4. Send the new code here`
        );
        return;
      }

      console.log(`✅ Valid verification code found for user: ${verification.user_id}`);

      // Link the account
      const { error: linkError } = await supabase
        .from('users')
        .update({
          telegram_id: telegramUserId,
          telegram_username: username,
          telegram_linked_at: new Date().toISOString()
        })
        .eq('id', verification.user_id);

      if (linkError) {
        console.error('❌ Error linking account:', linkError);
        await this.sendMessage(botToken, chatId,
          `❌ **Linking Failed**\n\n` +
          `There was an error linking your account. Please try again or contact support.`
        );
        return;
      }

      // Mark code as used
      await supabase
        .from('telegram_verification_codes')
        .update({ used: true })
        .eq('id', verification.id);

      const user = verification.users;
      const plan = user.subscription_plan || 'starter';

      console.log(`🎉 Account linked successfully: ${user.email} -> Telegram ${telegramUserId}`);

      await this.sendMessage(botToken, chatId,
        `🎉 **Account Linked Successfully!**\n\n` +
        `✅ Your Telegram account is now connected to your personal SharpFlow bot\n\n` +
        `👤 **Account:** ${user.first_name} ${user.last_name}\n` +
        `📧 **Email:** ${user.email}\n` +
        `📊 **Plan:** ${plan.charAt(0).toUpperCase() + plan.slice(1)}\n\n` +
        `🚀 **You can now:**\n` +
        `• Send any message to generate leads\n` +
        `• Get research reports\n` +
        `• All data flows to your personal dashboard\n\n` +
        `💡 Try: "find leads in san francisco tech companies"\n\n` +
        `🌐 **Dashboard:** https://sharpflow.com/dashboard`
      );

    } catch (error) {
      console.error('Error handling verification code:', error);
      await this.sendMessage(botToken, chatId,
        `❌ **Linking Failed**\n\n` +
        `There was an error linking your account. Please try again or contact support.`
      );
    }
  }

  private static async forwardToN8nWorkflow(
    userId: string,
    botUsername: string,
    chatId: number,
    telegramUserId: number,
    messageContent: string
  ) {
    try {
      console.log(`🔄 Forwarding message to n8n for user ${userId}: "${messageContent}"`);

      // Send to multi-bot processing endpoint
      const response = await fetch(`${process.env.BASE_URL || 'http://localhost:3000'}/api/multi-bot/process-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          botUsername,
          telegramChatId: chatId,
          telegramUserId,
          messageType: 'text',
          messageContent
        })
      });

      if (response.ok) {
        console.log(`✅ Message forwarded to n8n for user ${userId}`);
        
        // Send confirmation to user
        await this.sendMessage(
          await this.getBotToken(userId),
          chatId,
          `🚀 **Processing Your Request**\n\n` +
          `"${messageContent}"\n\n` +
          `⏳ Your personal n8n workflow is processing this request...\n\n` +
          `📊 Results will appear in your dashboard shortly\n` +
          `🔔 You'll be notified when complete\n\n` +
          `🌐 **Dashboard:** https://sharpflow.com/dashboard`
        );
      } else {
        console.error(`❌ Failed to forward message for user ${userId}`);
        await this.sendMessage(
          await this.getBotToken(userId),
          chatId,
          `❌ **Processing Error**\n\n` +
          `There was an error processing your request. Please try again or contact support.`
        );
      }
    } catch (error) {
      console.error('Error forwarding to n8n:', error);
    }
  }

  private static async getBotToken(userId: string): Promise<string> {
    const { data: user } = await supabase
      .from('users')
      .select('telegram_bot_token')
      .eq('id', userId)
      .single();
    
    return user?.telegram_bot_token || '';
  }

  private static isVerificationCode(text: string): boolean {
    return /^\d{6}$/.test(text.trim());
  }

  private static async sendMessage(botToken: string, chatId: number, text: string) {
    try {
      const response = await fetch(`${TELEGRAM_API_BASE}${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      throw error;
    }
  }
}

export default MultiBotWebhookHandler;
