const csv = require('csv-parser')
const fs = require('fs')
let allEmails = []
async function getJson() {
  await fs.createReadStream('data/users.csv')
  .pipe(csv())
  .on('data', function (row) {
    const email = row.email
    allEmails.push(email)
  })
  .on('end', function () {
      fs.writeFile(
        `./data/users.json`, 
        JSON.stringify(allEmails), 
        'utf8', 
        (err, data) => {
        if (err) console.log (err)
      })
    })
}

getJson()