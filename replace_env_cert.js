import fs from 'fs';

try {
    let envContent = fs.readFileSync('.env', 'utf8');
    const cert = fs.readFileSync('.env.certificate', 'utf8');
    
    const escapeMultiline = (str) => `"${str.replace(/\n/g, '\\n')}"`;
    const escapedCert = escapeMultiline(cert);
    
    envContent = envContent.replace(/DTE_SIGNING_CERTIFICATE=".*?"/s, `DTE_SIGNING_CERTIFICATE=${escapedCert}`);
    
    fs.writeFileSync('.env', envContent);
    console.log('Replaced DTE_SIGNING_CERTIFICATE in .env');
} catch(e) {
    console.error('Error:', e);
}
