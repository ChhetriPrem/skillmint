
const { PROGRAM_ID, TOKEN_METADATA_PROGRAM_ID } = require("./constants");
const { PublicKey, ComputeBudgetProgram } = require("@solana/web3.js");
const { sha256 } = require('@noble/hashes/sha2');
const { TextEncoder } = require('util'); // Node.js TextEncoder

// Helper: encode a JS number as 8-byte little-endian buffer (for i64 seeds)
function encodeI64(num) {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(num));
  return buf;
}
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


// PDA finders
function findIssuerPDA(walletPubkey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("issuer"), walletPubkey.toBuffer()],
    PROGRAM_ID
  );
}

function findTemplatePDA(issuerPda, templateName) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("template"), issuerPda.toBuffer(), Buffer.from(templateName, "utf8")],
    PROGRAM_ID
  );
}

function findBadgePDA(receiverPk, templatePda, uniqueSeed) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("badge"),
      receiverPk.toBuffer(),
      templatePda.toBuffer(),
      encodeI64(uniqueSeed)
    ],
    PROGRAM_ID
  );
}

function findMetadataPDA(mintPk) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintPk.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
}

function findMasterEditionPDA(mintPk) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintPk.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
}
module.exports = {
  findIssuerPDA,
  findTemplatePDA,
  findBadgePDA,
  findMetadataPDA,
  findMasterEditionPDA,
  encodeI64, // export for use elsewhere
};
