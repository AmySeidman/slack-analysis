/**
 * 
 * fetches all message history from all the channels the bot is added in 
 * make sure to export SLACK_TOKEN in the environment before running the script - this is the bot token
 * Make sure a `fetched` directory is present in the same directory as this script
 * before re-running the script, make sure to delete any pre-existing .csv files in the `fetched` directory
 * the script does not query for replies to threads - it only stores the horizontal channel history
 * The stored messages will be in reverse-chronological order
 * 
 */
const { WebClient } = require('@slack/web-api')
const fs = require('fs')
const token = process.env.SLACK_TOKEN
const web = new WebClient(token)
const csvWriter = require('csv-write-stream')

/**
 * gets and stores all messages of a given channel
 * @param {string} _channel channel identifier
 * @param {string} name channel name
 */
async function getMessages (_channel, name) {
  let r
  let c = ''
  do {
    try {
      r = await web.conversations.history({
        limit: 500,
        channel: _channel,
        cursor: c
      })
    } catch (e) {
      console.log (e)
    }  
    // get only rich text messages
    // this filters messages sent by naive bots, but not sure how to filter out bots completely @todo
    let allMessages = r.messages
      .filter((message) => message.blocks != undefined)
      .map((message) => {
        message.blocks
          .map((e) => e.elements)[0]
          .map((e) => e.elements)[0]
          .filter((e) => e.type == 'user')
          .map((e) => e.user_id)
        return {
          // type: message.type,
          text: message.text, // message text
          user: message.user, // sent by
          ts: new Date(Math.ceil(message.ts)).toUTCString(), // timestamp - prim key
          // mentioned_users: el, // elements of the message (see: https://api.slack.com/reference/block-kit/blocks)
          // reply_users: message.reply_users, // replied by whom?
          // thread_ts: message.thread_ts, // is a thread?
          // reactions: message.reactions // all reactions,
        }
      })

      let storeAt = __dirname + `/fetched/${name}.csv`
      let exists = await fs.existsSync(storeAt)
      let writer = csvWriter({ headers: ['user', 'text', 'ts'], sendHeaders: exists? false : true })
      let writeStream = await fs.createWriteStream(storeAt, { flags: exists? 'a' : 'w' })
      writer.pipe(writeStream)
      allMessages.forEach((m) => {
        writer.write(m)
      })
      writeStream.end()
      writer.end()
    c = r.response_metadata.next_cursor
  } while (r.response_metadata.next_cursor)
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
      r = await web.conversations.list({
        limit: 100,
        types: 'public_channel,private_channel',
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
      // @todo cater to channels that are externally shared with other users or orgs (how to handle that? - do we simply skip them?)
      memberChannels.map(async (channel) => {
        console.log ('fetching for channel', channel.name + ',', 'id:', channel.id)
        await getMessages(channel.id, channel.name)
        return
      })
    }
    c = r.response_metadata.next_cursor
  } while (r.response_metadata.next_cursor)
}



async function main () {
  await getAllMessages()
}

main ()
