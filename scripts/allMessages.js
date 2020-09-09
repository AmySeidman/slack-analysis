/**
 * fetches all message history from all the channels the bot is added in 
 * make sure to export SLACK_TOKEN in the environment before running the script - this is the bot token
 */
const { WebClient } = require('@slack/web-api')
const fs = require('fs')
const token = process.env.SLACK_TOKEN
const web = new WebClient(token)
const csvWriter = require('csv-write-stream')
const path = require('path')

async function getAllReplies (channel, ts) {
  let r, c = ''
  let result = []
  do {
    try {
      r = await web.conversations.replies({
        channel, ts
      })
    } catch (e) { throw e }
    result.push(...r.messages)
  } while (r.response_metadata.next_cursor)
  result.shift()
  return result
}
function getRequiredDetails(msg, _channel) {
  // console.log (msg)
  let block, mentioned_users = []
  if (msg.blocks) {
    block = msg.blocks
    let innerElements

    block.forEach((obj) => {
      for (element in obj.elements) {
        innerElements = obj.elements[element].elements
      }
    })

    if (innerElements) {
      let mentioned_users_filter = innerElements.filter((el) => el.type == 'user')
      for (user in mentioned_users_filter) {
        mentioned_users.push(mentioned_users_filter[user].user_id)
      }
    }
  }
  // console.log('channel:',_channel)
  // let msgLink = await web.chat.getPermalink({
  //   channel: _channel, 
  //   message_ts: msg.ts
  // })
  // if (msg.reactions) console.log ('reactions:', msg.reactions)
  let totalReactions = 0
  if (msg.reactions) {
    for (let i = 0; i < msg.reactions.length; i++) {
      totalReactions += msg.reactions[i].count
    }
  }

  return {
    id: msg.ts, // timestamp - priv key
    text: msg.text, // message text
    user: msg.user, // sent by
    timestamp: new Date(Math.ceil(msg.ts)).toUTCString(),
    mentioned_users, // elements of the message (see: https://api.slack.com/reference/block-kit/blocks)
    reactions: msg.reactions? JSON.stringify(msg.reactions) : "", // all reactions
    total_reactions: totalReactions,
    in_reply_to: msg.thread_ts,
    // permalink: msgLink.permalink
  }
}

/**
 * gets and stores all messages of a given channel
 * @param {string} _channel channel identifier
 * @param {string} name channel name
 */
async function getMessages (_channel, name) {
  let r, c = ''
  do {
    try {
      r = await web.conversations.history({
        channel: _channel,
        cursor: c
      })
    } catch (e) {
      console.log (e)
    }  
    let userMessages = r.messages.filter((message) => !(message.bot_id))
    let allMessages = []
    for (message in userMessages) {
      let msg = userMessages[message]
      let details = await getRequiredDetails(msg, _channel)
      allMessages.push(details) 
      // push replies
      if (msg.thread_ts) {
        // console.log ('fetching replies for', msg.thread_ts, 'in channel', name)
        let responses = await getAllReplies(_channel, msg.ts)
        for (response in responses) {
          let details = await getRequiredDetails(responses[response], _channel)
          allMessages.push(details) 
        }
      }
    }
    let headers =  ['id','user', 'text', 'timestamp', 'in_reply_to', 'mentioned_users', 'reactions', 'total_reactions']
    let storeAt = __dirname + `/messages/${name}.csv`
    let exists = await fs.existsSync(storeAt)
    let writer = csvWriter({ headers, sendHeaders: exists? false : true })
    let writeStream = await fs.createWriteStream(storeAt, { flags: exists? 'a' : 'w' })
    writer.pipe(writeStream)
    allMessages.forEach((m) => {
      writer.write(m)
    })
    writeStream.end()
    writer.end()
    c = r.response_metadata.next_cursor

  } while (r.response_metadata.next_cursor)
  return;
}

/**
 * gets & stores all channels public and private
 * @todo filter through the channels returned to keep only the ones where is_member = true
 */

async function getAllMessages () {
  let r
  let c = ''
  // with cursor based pagination
  do {
    try {
      // console.log ('fetching only for public channels')
      let types = 'public_channel, private_channel'
      console.log ('fetching for', types)
      r = await web.conversations.list({
        limit: 100,
        types,
        cursor: c
      })
    } catch (e) {
      console.log (e)
    }
    // filter the channels where bot is a member -- requirement to fetch message history
    let memberChannels = r.channels.filter((channel) => {
      return channel.is_member
    })
    if (memberChannels.length) {
      // @todo cater to channels that are externally shared with other users or orgs (how to handle external identities?)
      console.log ('all channels in this page:')
      for (channel in memberChannels) {
        console.log ('+ ',memberChannels[channel].name)
      }
      for (channel in memberChannels) {
        let channelName = memberChannels[channel].name
        let channelId = memberChannels[channel].id
        console.log ('fetching for channel', channelName + ',', 'id:', channelId)
        await getMessages(channelId, channelName)        
      }
    }
    c = r.response_metadata.next_cursor
  } while (r.response_metadata.next_cursor)
}

async function setup () {
  let directory = path.join(__dirname,'messages')
  let exists = await fs.existsSync(directory)

  if (exists) {
    fs.readdir(directory, (err, files) => {
      if (err) throw err;
      files.forEach((file) => {
        fs.unlink(path.join(directory, file), err => {
          if (err) throw err
        })
      })
    })
  } else {
    fs.mkdir(directory, (err) => { if (err) throw err })
  }
}

async function main () {
  await setup()
  await getAllMessages()
}

main ()
