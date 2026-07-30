import crypto from 'crypto';
import fs from 'fs';

const certStr = fs.readFileSync('.env', 'utf8').match(/-----BEGIN CERTIFICATE-----[^-]+-----END CERTIFICATE-----/)[0].replace(/\\n/g, '\n');
const cert = new crypto.X509Certificate(certStr);
const pubKey = cert.publicKey.export({ format: 'jwk' });

console.log('Modulus base64:', pubKey.n);
console.log('Exponent base64:', pubKey.e);

// Also let's print the custom KeyInfo string to see if we can use it.
const certBody = certStr.replace(/-----BEGIN CERTIFICATE-----/g, '').replace(/-----END CERTIFICATE-----/g, '').replace(/\s+/g, '\n').trim();

const keyInfo = `<KeyInfo>
<KeyValue>
<RSAKeyValue>
<Modulus>${pubKey.n}</Modulus>
<Exponent>${pubKey.e}</Exponent>
</RSAKeyValue>
</KeyValue>
<X509Data>
<X509Certificate>
${certBody}
</X509Certificate>
</X509Data>
</KeyInfo>`;

fs.writeFileSync('keyinfo.xml', keyInfo);
