import fs from 'fs';

try {
    let envContent = fs.readFileSync('.env', 'utf8');
    const pkcs8 = fs.readFileSync('.env.private_key_pkcs8', 'utf8');
    
    const escapeMultiline = (str) => `"${str.replace(/\n/g, '\\n')}"`;
    const escapedPkcs8 = escapeMultiline(pkcs8);
    
    // Replace the existing DTE_SIGNING_PRIVATE_KEY using the s flag to match across newlines
    envContent = envContent.replace(/DTE_SIGNING_PRIVATE_KEY=".*?"/s, `DTE_SIGNING_PRIVATE_KEY=${escapedPkcs8}`);
    
    fs.writeFileSync('.env', envContent);
    console.log('Replaced DTE_SIGNING_PRIVATE_KEY in .env');
} catch(e) {
    console.error('Error:', e);
}
