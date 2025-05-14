const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { SendTransactionError,ComputeBudgetProgram  } = require('@solana/web3.js');

dotenv.config();

const supabase = require('../services/supabaseClient');
const {

  serializeMintBadgeArgs,
  serializeInitializeTemplateArgs,
} = require('../services/serialization');

const {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  Connection,
} = require('@solana/web3.js');
const {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  MINT_SIZE,
  createAssociatedTokenAccountInstruction,
} = require('@solana/spl-token');

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;
const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID);
const KEYPAIR_PATH = process.env.MINT_AUTHORITY_KEYPAIR || "./authority-keypair.json";
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
const {
  findIssuerPDA,
  findTemplatePDA,
  findBadgePDA,
  findMetadataPDA,
  findMasterEditionPDA,
  encodeI64,
} = require('../services/pdas');


// --- Helper Functions --- //
function loadKeypairFromFile(filePath) {
  const resolvedPath = path.resolve(filePath);
  const secret = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function uploadJSONToPinata(json) {
  try {
    const res = await axios.post("https://api.pinata.cloud/pinning/pinJSONToIPFS", json, {
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });
    return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
  } catch (e) {
    if (e.response) {
      console.error("Pinata error:", e.response.status, e.response.data);
    } else {
      console.error("Pinata upload error:", e.message);
    }
    throw new Error("Failed to upload image/metadata");
  }
}


// --- Mint Badge --- why not on chain cause i have to do delegation and i have exams lol why delegation? extension cannot mint a badge
// ON CHAIN
// exports.mintBadge = async (req, res) => {
//   try {
//     const { badgeName, templateName, receiver, receiverGithub, reviewer, prLink, level, uniqueSeed, requestedBy } = req.body;
// console.log(uniqueSeed)
//     if (!receiver || !templateName || !badgeName) {
//       return res.status(400).json({ error: "receiver, templateName, and badgeName required" });
//     }
//     if (!uniqueSeed) return res.status(400).json({ error: "uniqueSeed required" });

//     // 1. Load authority keypair and connect
//     const authority = loadKeypairFromFile(KEYPAIR_PATH);
//     const connection = new Connection(SOLANA_RPC, "confirmed");
//     const receiverPk = new PublicKey(receiver);

//     // 2. Find template in DB
//     const { data: template, error: templateError } = await supabase
//       .from('badge_templates')
//       .select('*')
//       .eq('template_name', templateName)
//       .single();
//     if (templateError || !template) return res.status(400).json({ error: "Template not found" });

//     // 3. Build badge metadata
//     const badgeMetadata = {
//       name: badgeName,
//       symbol: "SKILL",
//       description: `Awarded to ${receiverGithub || "unknown"} for PR ${prLink || "unknown"}!`,
//       image: template.image_url,
//       attributes: [
//         { trait_type: "Level", value: level || "Gold" },
//         { trait_type: "Reviewer", value: reviewer || "unknown" },
//         { trait_type: "GitHub Username", value: receiverGithub || "unknown" },
//         { trait_type: "PR Link", value: prLink || "unknown" },
//       ],
//       external_url: prLink,
//       properties: {
//         files: [{ uri: template.image_url, type: "image/png" }],
//         category: "image",
//       },
//     };
    

//     // 4. Upload badge metadata to Pinata
//     const badgeMetadataUri = await uploadJSONToPinata({
//       pinataContent: badgeMetadata,
//       pinataMetadata: { name: `${badgeName}.json` }
//     });
//     console.log("badgeMetadataUri length:", badgeMetadataUri.length);

// console.log("Badge MetaData: ", badgeMetadataUri)
//     // 5. Find PDAs for Solana mint
//     const [issuerPda] = await findIssuerPDA(authority.publicKey);
//     const [templatePda] = await findTemplatePDA(issuerPda, templateName);
//     const [badgePda] = await findBadgePDA(receiverPk, templatePda, uniqueSeed);

//     // 6. Prepare mint
//     const mintKeypair = Keypair.generate();
//     const mintPk = mintKeypair.publicKey;
//     const [metadataPda] = await PublicKey.findProgramAddress(
//       [
//         Buffer.from('metadata'),
//         TOKEN_METADATA_PROGRAM_ID.toBuffer(),
//         mintPk.toBuffer(),
//       ],
//       TOKEN_METADATA_PROGRAM_ID
//     );
//     const [masterEditionPda] = await PublicKey.findProgramAddress(
//       [
//         Buffer.from('metadata'),
//         TOKEN_METADATA_PROGRAM_ID.toBuffer(),
//         mintPk.toBuffer(),
//         Buffer.from('edition'),
//       ],
//       TOKEN_METADATA_PROGRAM_ID
//     );
//     const tokenAccountPk = await getAssociatedTokenAddress(
//       mintPk, receiverPk, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
//     );
// const accountInfo = await connection.getAccountInfo(badgePda);
// if (!accountInfo) {
//   console.log("Account not initialized!");
// }

//     // 7. Serialize instruction data (use badgeMetadataUri)
//     const data = serializeMintBadgeArgs(
//       Date.now(),
//       uniqueSeed,
//       badgeName,
//       // templateName,
//       badgeMetadataUri
//     );

//     // 8. Build transaction
//     const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
//     const createMintIx = SystemProgram.createAccount({
//       fromPubkey: authority.publicKey,
//       newAccountPubkey: mintPk,
//       space: MINT_SIZE,
//       lamports,
//       programId: TOKEN_PROGRAM_ID,
//     });
//     const initMintIx = createInitializeMintInstruction(
//       mintPk, 0, authority.publicKey, authority.publicKey
//     );
//     const createATAIx = createAssociatedTokenAccountInstruction(
//       authority.publicKey, tokenAccountPk, receiverPk, mintPk,
//       TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
//     );

//     const keys = [
//       { pubkey: issuerPda, isSigner: false, isWritable: true },
//       { pubkey: templatePda, isSigner: false, isWritable: false },
//       { pubkey: badgePda, isSigner: false, isWritable: true },
//       { pubkey: authority.publicKey, isSigner: true, isWritable: true },
//       { pubkey: receiverPk, isSigner: false, isWritable: false },
//       { pubkey: mintPk, isSigner: true, isWritable: true },
//       { pubkey: tokenAccountPk, isSigner: false, isWritable: true },
//       { pubkey: metadataPda, isSigner: false, isWritable: true },
//       { pubkey: masterEditionPda, isSigner: false, isWritable: true },
//       { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
//       { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
//       { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
//       { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
//       { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
//     ];

//     const ix = new TransactionInstruction({
//       programId: PROGRAM_ID,
//       keys,
//       data,
//     });
// const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({ 
//   units: 1000000 // Increased from default (200k) to handle NFT minting
// });

// // Optional: Add prioritization fee (helpful during network congestion)
// const addPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({ 
//   microLamports: 1_000_000 // Adjust based on network conditions
// });
// const tx = new Transaction()
//   .add(modifyComputeUnits)  // Add this first
//   .add(addPriorityFee)      // Add this second (optional)
//   .add(createMintIx)
//   .add(initMintIx)
//   .add(createATAIx)
//   .add(ix);

//     // Set fee payer and blockhash
//     const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
//     tx.feePayer = authority.publicKey;
//     tx.recentBlockhash = blockhash;

//     // Sign the transaction
//     tx.partialSign(mintKeypair, authority);

//     // Send transaction
//     const rawTx = tx.serialize();
//     const sig = await connection.sendRawTransaction(rawTx);
//     await connection.confirmTransaction(
//       { signature: sig, blockhash, lastValidBlockHeight },
//       "confirmed"
//     );

//     // 10. Store badge in DB (including who requested it)
//     const { data: badge, error: badgeError } = await supabase
//       .from('badges')
//       .insert([{
//         badge_name: badgeName,
//         template_id: template.id,
//         receiver_github: receiverGithub,
//         reviewer,
//         pr_link: prLink,
//         level,
//         badge_metadata_uri: badgeMetadataUri,
//         minted_at: new Date().toISOString(),
//         tx_signature: sig,
//         requested_by: requestedBy // <-- Save who requested the mint
//       }])
//       .select()
//       .single();
//     if (badgeError) throw badgeError;

//     // 11. Return everything the frontend needs
//     res.json({ txSignature: sig, badgeMetadataUri, badge });
//  } catch (e) {

//     if (e instanceof SendTransactionError && e.logs) {
//     console.error("Transaction Logs:");
//     console.error(e.logs.join('\n'));
//   }
//     // Try to extract Anchor error message from logs
//     let anchorErrorMessage;
//     const logs = e.logs || e.transactionLogs;
//     if (logs && Array.isArray(logs)) {
//       const anchorErrMsg = logs.find(l => l.includes("Program log: AnchorError"));
//       if (anchorErrMsg) {
//         const msgMatch = anchorErrMsg.match(/Error Message: (.*)/);
//         if (msgMatch && msgMatch[1]) {
//           anchorErrorMessage = msgMatch[1].trim();
//         }
//       }
//     }

//     // Log just the main error and the anchor error message (if any)
//     console.error("MintBadge error:", anchorErrorMessage || e.message || e.toString());

//     // Respond to client
//     res.status(500).json({
//       error: anchorErrorMessage || e.message || e.toString()
//     });
//   }
// };


// mint badge off chain 
exports.mintBadge = async (req, res) => {
  try {
    const { badgeName, templateName, receiver, receiverGithub, reviewer, prLink, level, uniqueSeed, requestedBy } = req.body;

    if (!receiver || !templateName || !badgeName) {
      return res.status(400).json({ error: "receiver, templateName, and badgeName required" });
    }
    if (!uniqueSeed) return res.status(400).json({ error: "uniqueSeed required" });

    // 1. Find template in DB
    const { data: template, error: templateError } = await supabase
      .from('badge_templates')
      .select('*')
      .eq('template_name', templateName)
      .single();
    if (templateError || !template) return res.status(400).json({ error: "Template not found" });

    // 2. Build badge metadata (optional: upload to Pinata)
    const badgeMetadata = {
      name: badgeName,
      symbol: "SKILL",
      description: `Awarded to ${receiverGithub || "unknown"} for PR ${prLink || "unknown"}!`,
      image: template.image_url,
      attributes: [
        { trait_type: "Level", value: level || "Gold" },
        { trait_type: "Reviewer", value: reviewer || "unknown" },
        { trait_type: "GitHub Username", value: receiverGithub || "unknown" },
        { trait_type: "PR Link", value: prLink || "unknown" },
      ],
      external_url: prLink,
      properties: {
        files: [{ uri: template.image_url, type: "image/png" }],
        category: "image",
      },
    };

    // Optional: Upload to Pinata, or just use the badgeMetadata object directly
    let badgeMetadataUri = null;
    try {
      badgeMetadataUri = await uploadJSONToPinata({
        pinataContent: badgeMetadata,
        pinataMetadata: { name: `${badgeName}.json` }
      });
    } catch (e) {
      // If Pinata upload fails, you can fallback to storing the metadata as JSON in your DB
      badgeMetadataUri = null;
    }

    // 3. Store badge in Supabase
    const { data: badge, error: badgeError } = await supabase
      .from('badges')
      .insert([{
        badge_name: badgeName,
        template_id: template.id,
        receiver_github: receiverGithub,
        reviewer,
        pr_link: prLink,
        level,
        badge_metadata_uri: badgeMetadataUri || JSON.stringify(badgeMetadata),
        minted_at: new Date().toISOString(),
        // requested_by: requestedBy || "user"
      }])
      .select()
      .single();
    if (badgeError) throw badgeError;

    // 4. Return badge info to frontend
    res.json({ badge, badgeMetadataUri });
  } catch (e) {
    console.error("MintBadge error:", e.message || e.toString());
    res.status(500).json({
      error: e.message || e.toString()
    });
  }
};


exports.getBadgesForWallet = async (req, res) => {
  try {
    const { wallet } = req.query;
    if (!wallet) return res.status(400).json({ error: "wallet required" });

    // 1. Get GitHub username for this wallet
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('github_username')
      .eq('wallet_address', wallet)
      .single();
    if (userError || !user) return res.status(404).json({ error: "User not found" });

    // 2. Get all badges for this GitHub username
    const { data: badges, error: badgeError } = await supabase
      .from('badges')
      .select('*')
      .eq('receiver_github', user.github_username);
    if (badgeError) return res.status(500).json({ error: badgeError.message });

    res.json({ githubUsername: user.github_username, badges });
  } catch (e) {
    res.status(500).json({ error: e.message || e.toString() });
  }
};
