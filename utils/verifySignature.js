const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { PublicKey } = require('@solana/web3.js');

// Function to verify Solana wallet signature
const verifySignature = (walletAddress, message, signature) => {
    if (!walletAddress || !message || !signature) {
      console.error('Missing parameters for signature verification.');
      return false;
    }
  
    try {
      const messageBytes = new TextEncoder().encode(message);
      // Decode signature from base58 (not base64)
      const signatureBytes = bs58.decode(signature);

      // Validate signature length
      if (signatureBytes.length !== nacl.sign.signatureLength) {
        console.error('Invalid signature length.');
        return false;
      }

      const publicKey = new PublicKey(walletAddress);
      const publicKeyBytes = publicKey.toBytes();
  
      // Signature verification using tweetnacl
      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );
  
      if (!isValid) {
        console.error('Invalid signature');
      }
  
      return isValid;
    } catch (error) {
      console.error('Signature verification failed:', error.message);
      return false;
    }
};

module.exports = { verifySignature };
