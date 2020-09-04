/**
 * Fetch all users from Slack org and store in a csv (name, email)
 * @todo need a better way to use `fs` (instead of fs-path) to create a new file and write data into it
 */

const { WebClient } = require('@slack/web-api')
const fs = require('fs-path')
const _fs = require('fs')
const token = process.env.SLACK_TOKEN
const web = new WebClient(token)
const csvWriter = require('csv-write-stream')


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
        name: human.profile.real_name_normalized,
        email: human.profile.email
      }
    })

    fs.writeFile(
      `fetched_data/users/members${c}.json`, 
      JSON.stringify(reqDetails), 
      'utf8', 
        (err, data) => {
        if (err) console.log (err)
      })
    c = r.response_metadata.next_cursor
  } while (r.response_metadata.next_cursor)
}

async function getCsv() {
  let dirname = `./fetched_data/users/`
  _fs.readdir(dirname, function(err, filenames) {
    if (err) {
      console.log (err)
      return
    }
    let writer = null
    filenames.forEach(function(filename) {
      let storeAt = './merkalize/data/users.csv'
      _fs.readFile(dirname + filename, 'utf-8', async function(err, content) {
        if (err) {
          console.log (err)
          return
        }
        try {
          try {
            let dataToWrite = JSON.parse(content)
            if (writer == null) {
                writer = csvWriter(
                {
                  headers: ["name", "email"],
                  sendHeaders: true
                }
              )
            }
            writer.pipe(
              _fs.createWriteStream(
                storeAt, {flags: 'a'}
              )
            )
            dataToWrite.forEach((person) => {
              writer.write(person)
            })
            writer.end()
            writer = csvWriter(
              {
                headers: ["name", "email"],
                sendHeaders: false
              }
            )
          } catch (err) {
            console.error (err)
          }
        } catch (err) {
          console.error(err);
        }
      })
    })
  })
}

async function main () {
  await getUsers()
  await getCsv()
}

main ()
