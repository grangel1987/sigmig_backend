const fs = require('fs')

const xml = fs.readFileSync('DTE/EnvioDTE_TestSet.xml', 'latin1')
const start = xml.indexOf('<DTE ')
const end = xml.indexOf('</DTE>') + 6
const dte1 = xml.substring(start, end)

fs.writeFileSync('DTE/Factura33_Folio1.xml', '<?xml version="1.0" encoding="ISO-8859-1"?>\n' + dte1, 'latin1')
console.log('Saved DTE/Factura33_Folio1.xml')
