const { WebClient } = require('@slack/web-api')
const fs = require('fs-path')
const token = process.env.SLACK_TOKEN

const web = new WebClient(token)
const currentTime = new Date().toTimeString()

async function test () {
  try {
    await web.chat.postMessage({
      channel: '#test-2',
      text: `Reading messages :slightly_smiling_face:`
    })
  } catch (err) {
    console.log (err)
  }
  console.log ('Message posted!')
}

async function getChannels () {
  let r
  let c = ''
  do {
    try {
      r = await web.conversations.list({
        limit: 10,
        types: 'public_channel,private_channel',
        cursor: c
      })
    } catch (e) {
      console.log (e)
    }
    fs.writeFile(`fetched_data/channels/channels${c}.json`, JSON.stringify(r), 'utf8', (err, data) => {
      if (err) console.log (err)
    })
    c = r.response_metadata.next_cursor
  } while (r.response_metadata.next_cursor)
}

async function getMessages () {
  let r
  let c = ''
  do {
    try {
      r = await web.conversations.history({
        limit: 10,
        channel:'C019QCXHYJ0',
        cursor: c
      })
    } catch (e) {
      console.log (e)
    }
    fs.writeFile(`fetched_data/messages/messages${c}.json`, JSON.stringify(r), 'utf8', (err, data) => {
      if (err) console.log (err)
    })
    c = r.response_metadata.next_cursor
  } while (r.response_metadata.next_cursor)
}

async function main () {
  // await test()
  await getChannels()
  await getMessages()
}


main ()
