const { sha256 } = require('@noble/hashes/sha2');
const { TextEncoder } = require('util'); // Node.js TextEncoder

function encodeI64(num) {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(num), 0);
  return buf;
}

function encodeFixedString(str, length) {
  const buf = Buffer.alloc(length);
  Buffer.from(str, "utf8").copy(buf);
  return buf;
}

function encodeString(str) {
  if (typeof str !== "string") {
    throw new Error(`encodeString expected a string but got: ${str}`);
  }
  const buf = Buffer.from(str, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(buf.length, 0);
  return Buffer.concat([len, buf]);
}

function getDiscriminator(ixName) {
  const preimage = `global:${ixName}`;
  const hash = sha256(new TextEncoder().encode(preimage));
  return Buffer.from(hash).subarray(0, 8);
}

// Serialization functions for instruction arguments
function serializeMintBadgeArgs(timestamp, uniqueSeed, badgeName, metadataUri) {
  return Buffer.concat([
    getDiscriminator("mint_badge"),
    encodeI64(timestamp),
    encodeI64(uniqueSeed),
    encodeString(badgeName),  // FIXED: Should use encodeString not encodeFixedString
    encodeString(metadataUri),
  ]);
}

function serializeInitializeIssuerArgs(issuerName, website) {
  return Buffer.concat([
    getDiscriminator("initialize_issuer"),
    encodeString(issuerName),
    encodeString(website),
  ]);
}

function serializeCreateBadgeTemplateArgs(templateName, description, metadataUri) {
  return Buffer.concat([
    getDiscriminator("create_badge_template"),
    encodeString(templateName),
    encodeString(description),
    encodeString(metadataUri),
  ]);
}

// Example function for creating a mint badge transaction
async function createMintBadgeTransaction(
  connection,
  wallet,
  receiverAddress,
  templateName,
  badgeName,
  metadataUri
) {
  const uniqueSeed = Date.now();
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Find all necessary PDAs
  const issuerPDA = findIssuerPDA(wallet.publicKey);
  const templatePDA = findTemplatePDA(issuerPDA[0], templateName);
  const badgePDA = findBadgePDA(new PublicKey(receiverAddress), templatePDA[0], uniqueSeed);
  
  // Create a transaction
  const transaction = new Transaction();
  
  // IMPORTANT: Add compute budget instruction first
  // This is crucial for NFT minting operations which require more compute units
  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({ 
    units: 1000000 // Increased from default (200k) to handle metadata operations
  });
  
  transaction.add(modifyComputeUnits);
  
  // Add prioritization fee if needed (helpful in congested networks)
  const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({ 
    microLamports: 1_000_000 // Adjust based on network conditions
  });
  
  transaction.add(addPriorityFee);
  
  // Then add your mint badge instruction
  // The rest of your transaction building code...
  
  return transaction;
}

module.exports = {
  encodeI64,
  encodeFixedString,
  encodeString,
  getDiscriminator,
  serializeMintBadgeArgs,
  serializeInitializeIssuerArgs,
  serializeCreateBadgeTemplateArgs,
  createMintBadgeTransaction // New helper function
};