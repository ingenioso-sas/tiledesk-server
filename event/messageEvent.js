const EventEmitter = require('events');
var winston = require('../config/winston');
var Request = require("../models/request");
var Message = require("../models/message");
var Faq_kb = require("../models/faq_kb");
var MessageConstants = require("../models/messageConstants");

var cacheUtil = require('../utils/cacheUtil');



class MessageEvent extends EventEmitter { 
  constructor() {
    super();
    this.queueEnabled = false;
  }
}

const messageEvent = new MessageEvent();



function emitCompleteMessage(message) {
  if (message.status === MessageConstants.CHAT_MESSAGE_STATUS.RECEIVED) {
    winston.debug("messageEvent.emit message.received", message);
    messageEvent.emit('message.received', message);
  }

  if (message.status === MessageConstants.CHAT_MESSAGE_STATUS.SENDING) {
    winston.debug("messageEvent.emit message.sending", message);
    messageEvent.emit('message.sending', message);
  }
}

messageEvent.on('message.create', emitCompleteMessage);
messageEvent.on('message.update', emitCompleteMessage);

function populateMessageCreate(message) {
  return populateMessageWithRequest(message, 'message.create');
}
function populateMessageUpdate(message) {
  return populateMessageWithRequest(message, 'message.update');
}

function populateMessage(message, eventPrefix) {


  winston.debug("Subscription.notify "+eventPrefix, message.toObject());
  
  Request.findOne({request_id:  message.recipient, id_project: message.id_project}).
  populate('lead').
  populate('department'). 
  populate('participatingBots').
  populate('participatingAgents').        
  populate({path:'requester',populate:{path:'id_user'}}).
  exec(function (err, request) {

    if (err) {
      winston.error("Error getting request on messageEvent.populateMessage",err );
      return messageEvent.emit(eventPrefix, message);
    }

    if (request) {

      // if (request.messages_count==0){
      //   messageEvent.emit('message.create.first', messageJson );
      // }


      var messageJson = message.toJSON();
      
      var requestJson = request.toJSON();
     

      // Message.find({recipient:  request.request_id, id_project: request.id_project}).sort({updatedAt: 'asc'}).exec(function(err, messages) {                        
      //   winston.debug("populateMessage messages",messages );


        // requestJson.messages = messages;


            if (request.department && request.department.id_bot) {
              // if (request.department) {
              Faq_kb.findById(request.department.id_bot, function(err, bot) {
                winston.debug('bot', bot);
                

                requestJson.department.bot = bot
                
                messageJson.request = requestJson;
                // winston.debug('messageJson', messageJson);
                winston.debug("message.emit",messageJson );
                messageEvent.emit(eventPrefix,messageJson );

                // if (messages && messages.length==1){
                if (message.text === request.first_text){
                  messageEvent.emit(eventPrefix+'.first', messageJson );
                }

              });

              
            }else {
              messageJson.request = requestJson;
              winston.debug("message.emit",messageJson );
              messageEvent.emit(eventPrefix, messageJson );   
              
              // if (messages && messages.length==1){
              if (message.text === request.first_text){
                messageEvent.emit(eventPrefix+'.first', messageJson );
              }

            }

      // });

  }
   
  });

}

function populateMessageWithLastRequestMessages(message, eventPrefix) {


  winston.debug("Subscription.notify "+eventPrefix, message.toObject());
  
  Request.findOne({request_id:  message.recipient, id_project: message.id_project}).
  populate('lead').
  populate('department').  
  populate('participatingBots').
  populate('participatingAgents').       
  populate({path:'requester',populate:{path:'id_user'}}).
  exec(function (err, request) {

    if (err) {
      winston.error("Error getting request on messageEvent.populateMessage",err );
      return messageEvent.emit(eventPrefix, message);
    }

    if (request) {

      // if (request.messages_count==0){
      //   messageEvent.emit('message.create.first', messageJson );
      // }


      var messageJson = message.toJSON();
      
      var requestJson = request.toJSON();
     


      Message.find({recipient:  request.request_id, id_project: request.id_project}).sort({createdAt: 'desc'})
        .limit(5)
        .exec(function(err, messages) {                        

        winston.debug("populateMessage messages",messages );


        requestJson.messages = messages;


            if (request.department && request.department.id_bot) {
              // if (request.department) {
              Faq_kb.findById(request.department.id_bot, function(err, bot) {
                winston.debug('bot', bot);
                

                requestJson.department.bot = bot
                
                messageJson.request = requestJson;
                // winston.debug('messageJson', messageJson);
                winston.debug("message.emit",messageJson );
                messageEvent.emit(eventPrefix,messageJson );

                // if (messages && messages.length==1){
                if (message.text === request.first_text){
                  messageEvent.emit(eventPrefix+'.first', messageJson );
                }

              });

              
            }else {
              messageJson.request = requestJson;
              winston.debug("message.emit",messageJson );
              messageEvent.emit(eventPrefix, messageJson );   
              
              // if (messages && messages.length==1){
              if (message.text === request.first_text){
                messageEvent.emit(eventPrefix+'.first', messageJson );
              }

            }

      });

  }
   
  });

}



function populateMessageWithRequest(message, eventPrefix) {

  
  winston.debug("populateMessageWithRequest "+eventPrefix, message.toObject());
  
    // cacherequest      // requestcachefarequi populaterequired cacheveryhightpriority
    
  winston.info("populateMessageWithRequest " +eventPrefix);

  Request.findOne({request_id:  message.recipient, id_project: message.id_project}).
  populate('lead').
  populate('department').  
  populate('participatingBots').
  populate('participatingAgents').       
  populate({path:'requester',populate:{path:'id_user'}}).
  lean().
  cache(cacheUtil.defaultTTL, message.id_project+":requests:request_id:"+message.recipient).
  exec(function (err, request) {

    if (err) {
      winston.error("Error getting request on messageEvent.populateMessage",err );
      return messageEvent.emit(eventPrefix, message);
    }

  if (request) {
      winston.info("request is defined in messageEvent" );

      var messageJson = message.toJSON();
      
      // var requestJson = request.toJSON();
      var requestJson = request;
    
      if (request.department && request.department.id_bot) {
        // if (request.department) {
        Faq_kb.findById(request.department.id_bot)
        .cache(cacheUtil.defaultTTL, message.id_project+":faq_kbs:id:"+request.department.id_bot)
        .exec(function(err, bot) {
          winston.debug('bot', bot);
          requestJson.department.bot = bot
          
          messageJson.request = requestJson;
          // winston.debug('messageJson', messageJson);
          winston.debug("message.emit",messageJson );
          messageEvent.emit(eventPrefix,messageJson );

          if (message.text === request.first_text){
            messageEvent.emit(eventPrefix+'.first', messageJson );
          }

          if (message.sender === request.lead._id) {
            messageEvent.emit(eventPrefix+'.from.requester', messageJson );
          }

        });

        
      }else {
        messageJson.request = requestJson;
        winston.info("message.emit",messageJson );
        messageEvent.emit(eventPrefix, messageJson );   
        
        if (message.text === request.first_text) {
          messageEvent.emit(eventPrefix+'.first', messageJson );
        }

        if (message.sender === request.lead._id) {
          winston.info("message.create.from.requester",messageJson );
          messageEvent.emit(eventPrefix+'.from.requester', messageJson );
        }


      }   
          
  } else {
    winston.error("request is undefined in messageEvent" );
  }
   
  });

}

messageEvent.on('message.create.simple', populateMessageCreate);
messageEvent.on('message.update.simple', populateMessageUpdate);


module.exports = messageEvent;