var express = require('express');
var router = express.Router();
var KBSettings = require('../models/kb_setting');
var openaiService = require('../services/openaiService');
var winston = require('../config/winston');

router.post('/', async (req, res) => {

    let project_id = req.projectid;
    let body = req.body;

    console.log("### --> body: ", body);

    KBSettings.findOne({ id_project: project_id }, (err, kbSettings) => {
        console.log("kbSettings: ", kbSettings);

        if (!kbSettings) {
            return res.status(400).send({ success: false, message: "Missing gptkey parameter (settings not exist)" })
        }

        let gptkey = kbSettings.gptkey;

        if (!gptkey) {
            return res.status(400).send({ success: false, message: "Missing gptkey parameter" })
        }

        // attua modifiche
        let json = {
            "model": body.model,
            "messages": [
                {
                    "role": "user",
                    "content": body.question
                }
            ],
            "max_tokens": body.max_tokens,
            "temperature": body.temperature
        }

        let message = { role: "", content: "" };
        if (body.context) {
            message.role = "system";
            message.content = body.context;
            json.messages.unshift(message);
        }
        console.log("openai preview --> json: ", json);

        openaiService.completions(json, gptkey).then((response) => {
            // winston.debug("completions response: ", response);
            res.status(200).send(response.data);
        }).catch((err) => {
            console.log("err: ", err);
            // winston.error("completions error: ", err);
            res.status(500).send(err)
        })

    })
})

// router.get('/', async (req, res) => {

//     let project_id = req.projectid;

//     OpenaiKbs.find({ id_project: project_id }, (err, kbs) => {
//         if (err) {
//             console.error("find all kbs error: ", err);
//             return res.status(500).send({ success: false, error: err });
//         } else {
//             return res.status(200).send(kbs);
//         }
//     })
// })

// router.post('/', async (req, res) => {

//     let body = req.body;

//     let new_kbs = new OpenaiKbs({
//         name: body.name,
//         url: body.url,
//         id_project: req.projectid,
//         gptkey: req.body.gptkey
//     })

//     new_kbs.save(function (err, savedKbs) {
//         if (err) {
//             console.error("save new kbs error: ", err);
//             return res.status(500).send({ success: false, error: err});
//         } else {
//             return res.status(200).send(savedKbs);
//         }
//     })
// })

// router.put('/', async (req, res) => {
//     // to be implemented
// })

// router.delete('/:kbs_id', async (req, res) => {
//     let kbs_id = req.params.kbs_id;

//     OpenaiKbs.findOneAndDelete( { _id: kbs_id }, (err, kbDeleted) => {
//         if (err) {
//             console.error("find one and delete kbs error: ", err);
//             return res.status(500).send({ success: false, error: err});
//         } else {
//             return res.status(200).send({ success: true, message: 'Knowledge Base deleted successfully', openai_kb: kbDeleted });
//         }
//     })
// })

module.exports = router;