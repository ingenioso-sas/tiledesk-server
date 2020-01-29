const EventEmitter = require('events');
const messageEvent = require('../event/messageEvent');
var winston = require('../config/winston');

class BotEvent extends EventEmitter {}

const botEvent = new BotEvent();


//TODO use request. getBotId
function getBotFromParticipants(participants) {
    var botIdTmp;
  
    if (participants) {
      participants.forEach(function(participant) { 
        //winston.debug("participant", participant);
        if (participant.indexOf("bot_")> -1) {
          botIdTmp = participant.replace("bot_","");
          //winston.debug("botIdTmp", botIdTmp);
          //break;        
        }
      });
    
      return botIdTmp;
    }else {
      return null;
    }
  }

//TODO use request. getBotId
function getBotId(message) {
    var sender = message.sender;
    winston.debug("sender", sender);
 
    if (sender=="sytem") {
         return null;
    }
 
    var recipient = message.recipient;
    winston.debug("recipient", recipient);
 
    if (recipient.startsWith('bot_')) {
        return recipient.replace('bot_','');
    }
    // var text = message.text;
    // winston.debug("text", text);
    
    if ( message.request== null || message.request.participants == null) {
        return null;
    }

    var participants = message.request.participants;
    winston.debug("participants", participants);
 
    var botId = getBotFromParticipants(participants);
    winston.debug("botId: " + botId);
 
   if (botId) {
      return botId;
   }else {
       return null;
   }
 
}

//modify to async
// TODO perche nn message.create???
//messageEvent.on('message.received', function(message) {
messageEvent.on('message.create', function(message) {

    winston.debug("message", message);

    if (message.sender === "system") {
        winston.debug("it s a message sent from system, exit");
        return null;
    }
    
    if (message.text.indexOf("\\agent") > -1) { //not reply to a message containing \\agent
        return 0;
    }

    // if (message.text.startsWith("\\")) { //not reply to a message containing \
    //     return null;
    // }
    
   var botId = getBotId(message);

   winston.debug("botId: " + botId);

   if (!botId) {
        return null;
    }else {
                                                //loop fix for messages sent from external bot             
        if (message.sender === 'bot_'+botId || message.sender === botId) {
            winston.debug("it s a message sent from bot, exit");
            return null;        
        }else {
            messageEvent.emit('message.received.for.bot', message);
        }

    }


    
    
    if(message.request && message.request.department && message.request.department) {
        winston.debug("message.request.department", message.request.department);

        var bot = message.request.department.bot;
    

        winston.debug("bot", bot);

        if (bot) {
            if (bot.type==="internal") {
                botEvent.emit('bot.message.received.notify.internal', message);
               
            }else {
                if (bot.url) {
                    var botNotification = {bot: bot, message: message};
                    botEvent.emit('bot.message.received.notify.external', botNotification);
                }else {
                    winston.warn("bot url is not defined", bot);
                }
            }
        } 
    }
});


module.exports = botEvent;
