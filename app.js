require('dotenv').config()
const { Client } = require('@notionhq/client');
const {Bot,GrammyError,HttpError} = require('grammy')
const { Menu } = require("@grammyjs/menu");


const notion = new Client({
    auth: process.env.NOTION_API_KEY,
})

const bot = new Bot(process.env.BOT_API_KEY);
const databaseId = process.env.DATA_BASE_ID

const userStates = {};

const menu = new Menu("my-menu-identifier")
    .text("Задать вопрос", (ctx) => {
        userStates[ctx.from.id] = { canAskQuestion: true };
        ctx.reply("Теперь вы можете задать вопрос.");
    }).row()

// Make it interactive.
bot.use(menu);

bot.api.setMyCommands([
    {command:'start',description:'Запускает бота'},
])
//можно в команде иметь массив команд, команды работают как ИЛИ
bot.command('start', async (ctx)=>{
    await ctx.reply('Привет, я бот от Дакен')
    await ctx.reply("Check out this menu:", { reply_markup: menu })
})

bot.on('message:text', async ctx => {
    if (!userStates[ctx.from.id] || !userStates[ctx.from.id].canAskQuestion) {
        await ctx.reply("Пожалуйста, выберите 'Задать вопрос' в меню, прежде чем задавать вопрос.");
        return;
    }

    let msgFrom = ctx.msg.from.first_name;
    let date = new Date().toISOString(); // Ensure to call toISOString() as a method
    let text = ctx.msg.text; // Assuming 'text' should be the message text from the user
    let timestamp = date; // Using 'date' as the timestamp

    await notion.pages.create({
        parent: { database_id: databaseId }, // Specify the parent database ID
        properties: {
            User: {
              title: [
                {
                  text: {
                    content: msgFrom // Assuming you want to store the user's name
                  }
                }
              ]
            },
            Date: {
              date: {
                start: timestamp
              }
            },
            Questions: {
              rich_text: [
                {
                  text: {
                    content: text
                  }
                }
              ]
            },
        }
    });
    // Сброс состояния
    userStates[ctx.from.id].canAskQuestion = false;
    await ctx.reply('Ваш вопрос отправлен')
});

bot.catch((err)=>{
    const ctx = err.ctx
    console.error(`Error while handling update ${ctx.update.update_id}`)
    const e = err.error
    if(e instanceof GrammyError){
        console.error('Error in request:', e.description)
    }else if(e instanceof HttpError){
        console.error('Could not contact Telegram:', e)
    }else{
        console.error('Uknown error:',e)
    }
});

bot.start()
