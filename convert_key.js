import crypto from 'crypto';
import fs from 'fs';

try {
    const pem = fs.readFileSync('.env.private_key', 'utf8');
    const pk = crypto.createPrivateKey(pem);
    const pkcs8 = pk.export({ type: 'pkcs8', format: 'pem' });
    fs.writeFileSync('.env.private_key_pkcs8', pkcs8);
    console.log('Successfully converted to PKCS8');
} catch(e) {
    console.error('Error converting to PKCS8:', e);
}
