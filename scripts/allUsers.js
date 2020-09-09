/**
 * Fetch all users from Slack org and store in a csv (name, email)
 * @todo need a better way to use `fs` (instead of fs-path) to create a new file and write data into it
 */

const { WebClient } = require('@slack/web-api')
const fs = require('fs')
const token = process.env.SLACK_TOKEN
const web = new WebClient(token)
const csvWriter = require('csv-write-stream')
const path = require('path')

async function getUsers () {
  let r
  let c = ''
  // with cursor based pagination
  do {
    try {
      r = await web.users.list({
        limit: 100,
        include_locale: true,
        cursor: c
      })
    } catch (e) {
      console.log (e)
    }
    let onlyHumans = r.members.filter((member) => {
      return member.is_bot != true && member.profile.real_name_normalized != 'Slackbot'
    })

    let reqDetails = onlyHumans.map((human) => {
      return {
        user_id: human.id,
        name: human.profile.real_name_normalized,
        email: human.profile.email
      }
    })

    let storeAt = __dirname + `/users/users.csv`
    let exists = await fs.existsSync(storeAt)
    let writer = csvWriter({ headers: ['user_id', 'name', 'email'], sendHeaders: exists? false : true })
    let writeStream = await fs.createWriteStream(storeAt, { flags: exists? 'a' : 'w' })
    writer.pipe(writeStream)
    reqDetails.forEach((m) => {
      writer.write(m)
    })
    writeStream.end()
    writer.end()
    c = r.response_metadata.next_cursor
  } while (r.response_metadata.next_cursor)
}

async function setup () {
  let directory = path.join(__dirname,'users')
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
  await getUsers()
}

main ()
