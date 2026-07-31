const fs = require('fs')
const https = require('https')

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest)
    https.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => {
        file.close(resolve)
      })
    }).on('error', (err) => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

async function run() {
    fs.mkdirSync('schemas', { recursive: true })
    console.log('Downloading schemas...')
    await download('https://raw.githubusercontent.com/sii-cl/DTE/master/XSD/EnvioDTE_v10.xsd', 'schemas/EnvioDTE_v10.xsd')
    await download('https://raw.githubusercontent.com/sii-cl/DTE/master/XSD/DTE_v10.xsd', 'schemas/DTE_v10.xsd')
    await download('https://raw.githubusercontent.com/sii-cl/DTE/master/XSD/SiiTypes_v10.xsd', 'schemas/SiiTypes_v10.xsd')
    await download('https://raw.githubusercontent.com/sii-cl/DTE/master/XSD/xmldsignature_v10.xsd', 'schemas/xmldsignature_v10.xsd')
    console.log('Done.')
}

run()
