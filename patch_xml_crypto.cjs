const fs = require('fs')
const file = 'node_modules/xml-crypto/lib/signed-xml.js'
let content = fs.readFileSync(file, 'utf8')
content = content.replace('hash.update(c14nStr, "utf8");', 'console.log("XML-CRYPTO DIGESTING STRING:\\n" + c14nStr + "\\n---END DIGEST STRING---"); hash.update(c14nStr, "utf8");')
fs.writeFileSync(file, content)
