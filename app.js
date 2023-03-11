const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const NodeCache = require('node-cache');
const fs = require('fs')

const tocen = '6246698710:AAHjcWCzVDYJEhlhOUeR7nYlenj4OSSUzn0';

const idChat = 535124715;

let bot = new TelegramBot(tocen, {polling: true});
let myCache = new NodeCache({ stdTTL: 60000});

const apiWeather = 'https://pro.openweathermap.org/data/2.5/forecast?q=Khmelnytskyi&lang=ua&appid=b1b15e88fa797225412429c1c50c122a1';
const apiCorrency = 'https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5';

bot.setMyCommands([
    {command: '/start', description: 'Вибери з чим хочите працювати'},
])

let sort = 1;

let correncyName = 'USD';

let startMessg = {
    reply_markup: {
        resize_keyboard: true,
        keyboard: [
            [
                {text: '/Погода'},
            ],
            [
                {text: '/Курс валют'},
            ],
        ]}
}

bot.on('message', async (msg) => {
    if(msg.text === '/start') {
        await bot.sendMessage(msg.chat.id, 'Вибери з чим хочите працювати', startMessg)

    } else if (msg.text === '/Погода') {
        await bot.sendMessage(msg.chat.id, 'Вибери час', {
            reply_markup: {
                resize_keyboard: true,
                keyboard: [
                    [
                        {text: 'Кожні 3 години'},
                        {text: 'Кожні 6 години'},
                    ],
                    [
                        {text: 'Повернутися до меню'},
                    ],
                ]
            }
        })
    } else if(msg.text === 'Кожні 3 години') {
        sort = 1;
        sendWeather();
    } else if (msg.text === 'Кожні 6 години') {
        sort = 2;
        sendWeather();
    } else if (msg.text === 'Повернутися до меню') {
        await bot.sendMessage(msg.chat.id, 'Вибери з чим хочиш працювати', startMessg)
    } else if (msg.text === '/Курс валют') {
        await bot.sendMessage(msg.chat.id, 'Вибери валюту', {
            reply_markup: {
                resize_keyboard: true,
                keyboard: [
                    [
                        {text: 'USD'},
                        {text: 'EUR'},
                    ],
                    [
                        {text: 'Повернутися до меню'},
                    ],
                ]
            }
        })
    } else if (msg.text === 'USD') {
        correncyName = 'USD';
        sendCorrency();
    } else if (msg.text === 'EUR') {
        correncyName = 'EUR';
        sendCorrency();
    } else {
        bot.sendMessage(idChat, 'Я тебе не розумію!')
    }
})

// sendWeather()
function sendWeather() {
    axios.get(apiWeather)
    .then(respons => {
        dataProcessing(respons.data);
    })
    .catch(err => {
        if (err.message) {
            bot.sendMessage(idChat, 'Сталася помилка, спробуй пізніше.')
        }
    })

    function dataProcessing(data) {
        
        let state = {};
        let structureMessage = '';
        let weather = '';

        
        let dateSettings = { weekday:"long", year:"numeric", month:"short", day:"numeric", time:'numeric'}
        
        for(let i=0; i<data.list.length; i+=sort) {

            let time = data.list[i].dt_txt.split(' ')[1].substr(0, 5);
            let date = new Date(data.list[i].dt_txt).toLocaleDateString('uk', dateSettings);
            let temp = Math.round(data.list[i].main.temp);
            let feelsLike = Math.round(data.list[i].main.feels_like);
            let description = data.list[i].weather[0].description;

            if(state[date] !== undefined) {
                state[date].info.push(
                    {
                        "hour": time,
                        "temp": temp,
                        "feelsLike": feelsLike,
                        "description": description
                    }
                )
            } else {
                state[date] = {
                    "dt_txt": date,
                    "info": [
                        {
                            "hour": time,
                            "temp": temp,
                            "feelsLike": feelsLike,
                            "description": description
                        }
                    ]
                        
                }
            }
        }
        
        for (item in state) {
            let info = '';

            state[item].info.forEach(item => {

                let temp = item.temp <= 273 ? `${item.temp - 273}°C` : `+${item.temp - 273}°C`
                let feelsLike = item.feelsLike <= 273 ? `${item.feelsLike - 273}°C` : `+${item.feelsLike - 273}°C`

                info += `  ${item.hour}, ${temp}, Відчувається: ${feelsLike}, ${item.description}\n`;
            })

            weather += `${state[item].dt_txt}\n${info}\n `;
        }

        structureMessage = `Погода в Хмельницькому: \n\n${weather}`.trim();

        bot.sendMessage(idChat, structureMessage);
        // console.log(structureMessage)
    }

}




let sendCorrency = () => { 
    if (fs.existsSync('correncys.txt') === false) {
        fs.writeFileSync('correncys.txt', '[]')

        setTimeout(() => {	
            fs.unlinkSync("correncys.txt")
        }, 60000)
    } else {
        setTimeout(() => {	
            fs.unlinkSync("correncys.txt")
        }, 6000)
    }



    let correncys = JSON.parse(fs.readFileSync('correncys.txt', 'utf8'))

    if(correncys.length) {
         dataProcessing(correncys)
    } else {
        axios.get(apiCorrency)
        .then(respons => {
            respons.data.forEach(element => {
                correncys.push(element)
            });
            
            fs.writeFileSync('correncys.txt', JSON.stringify(correncys));
            dataProcessing(respons.data);
        })
        .catch(err => {
            if (err.message) {
                bot.sendMessage(idChat, 'Сталася помилка, спробуй пізніше.')
            }
        })
    } 

    function dataProcessing(data) {

        data.forEach(item => {

            if(correncyName === item.ccy) {
                let value = Number(item.buy).toFixed(2)
                bot.sendMessage(idChat, `${item.ccy}: ${value}`)
            }
        })        
    }
}


