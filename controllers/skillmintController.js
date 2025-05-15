const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();

const supabase = require("../services/supabaseClient");
const {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  Connection,
} = require("@solana/web3.js");

// You need to provide these utility functions:
const {
  serializeCreateBadgeTemplateArgs,
} = require("../services/serialization");
const { findIssuerPDA, findTemplatePDA } = require("../services/pdas");

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID);
const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
const KEYPAIR_PATH =
  process.env.MINT_AUTHORITY_KEYPAIR || "./authority-keypair.json";

// --- Helper: Load Keypair ---
function loadKeypairFromFile(filePath) {
  const secret = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

// --- Upload File to Pinata ---
async function uploadFileToPinata(filePath, mimetype) {
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath), {
      filename: path.basename(filePath),
      contentType: mimetype,
    });

    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        maxBodyLength: Infinity,
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      }
    );

    return {
      url: `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`,
      mimetype,
    };
  } catch (e) {
    if (e.response) {
      // The request was made and the server responded with a status code outside 2xx
      console.error(
        "Pinata file upload error (response):",
        e.response.status,
        e.response.data
      );
    } else if (e.request) {
      // The request was made but no response was received
      console.error("Pinata file upload error (no response):", e.request);
    } else if (e.message) {
      // Something happened in setting up the request
      console.error("Pinata file upload error (message):", e.message);
    } else {
      // Unknown error
      console.error("Pinata file upload error (unknown):", e);
    }
    throw new Error(
      "Failed to upload file to Pinata: " + (e.message || "Unknown error")
    );
  }
}

// --- Upload JSON to Pinata ---
async function uploadJSONToPinata(json) {
  try {
    const res = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      json,
      {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      }
    );
    return `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
  } catch (e) {
    if (e.response) {
      console.error(
        "Pinata JSON upload error:",
        e.response.status,
        e.response.data
      );
    } else {
      console.error("Pinata JSON upload error:", e.message);
    }
    throw new Error("Failed to upload image/metadata");
  }
}

// --- Controller: Upload image & metadata to Pinata ---
exports.uploadTemplateMetadata = async (req, res) => {
  try {
    console.log("debug-top");
    const { templateName, description } = req.body;
    const imagePath = req.file.path;
    const mimetype = req.file.mimetype;

    // 1. Upload image to Pinata
    const { url: imageUrl, mimetype: imageType } = await uploadFileToPinata(
      imagePath,
      mimetype
    );

    // 2. Upload metadata to Pinata
    const metadata = {
      name: templateName,
      symbol: "SKILL",
      description,
      image: imageUrl,
      attributes: [],
      properties: {
        files: [{ uri: imageUrl, type: imageType }],
        category: "image",
      },
    };
    console.log("debug-2");
    const pinataPayload = {
      pinataContent: metadata,
      pinataMetadata: { name: `${templateName}.json` },
    };
    const metadataUri = await uploadJSONToPinata(pinataPayload);
    console.log("debug-1");
    // Remove local image file
    fs.unlinkSync(imagePath);
    console.log("debug");
    res.json({ metadataUri, imageUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Controller: Store Template in Supabase ---
exports.storeTemplate = async (req, res) => {
  try {
    const { templateName, description, metadataUri, imageUrl, txSignature } =
      req.body;
    console.log("storeTemplate called with:", {
      templateName,
      description,
      metadataUri,
      imageUrl,
      txSignature,
    });

    if (
      !templateName ||
      !description ||
      !metadataUri ||
      !imageUrl ||
      !txSignature
    ) {
      console.error("Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    const { data, error } = await supabase
      .from("badge_templates")
      .insert([
        {
          template_name: templateName,
          description,
          image_url: imageUrl,
          metadata_uri: metadataUri,
          tx_signature: txSignature,
          on_chain: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    console.log("Insert success:", data);
    res.json({ template: data });
  } catch (err) {
    console.error("storeTemplate error:", err);
    res.status(500).json({ error: err.message });
  }
};

// --- Controller: Get Templates ---
exports.getTemplates = async (req, res) => {
  const { data, error } = await supabase
    .from("badge_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const templates = data.map((t) => ({
    templateName: t.template_name,
    description: t.description,
    imageUrl: t.image_url,
    metadataUri: t.metadata_uri,
    createdAt: t.created_at,
    id: t.id,
  }));

  res.json(templates);
};

// --- Controller: Get Badges By Github ---
exports.getBadgesByGithub = async (req, res) => {
  const { github } = req.query;
  const { data, error } = await supabase
    .from("badges")
    .select("*, badge_templates(template_name, image_url, metadata_uri)")
    .eq("receiver_github", github)
    .order("minted_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ badges: data });
};

// --- Controller: Get Wallet By Github ---
exports.getWalletByGithub = async (req, res) => {
  const { github } = req.query;
  const { data, error } = await supabase
    .from("users")
    .select("wallet_address")
    .eq("github_username", github)
    .single();
  if (error || !data) return res.status(404).json({ error: "Not found" });
  res.json({ walletAddress: data.wallet_address });
};

exports.uploadCVtoPianata = async (req, res) => {
  try {
    console.log("[uploadCVtoPianata] Request received");

    const cvData = req.body;
    if (!cvData || typeof cvData !== "object" || Array.isArray(cvData)) {
      console.error("[uploadCVtoPianata] Invalid CV data:", cvData);
      return res.status(400).json({ error: "Invalid CV data" });
    }

    const jsonSize = Buffer.byteLength(JSON.stringify(cvData), "utf8");
    if (jsonSize > 10 * 1024 * 1024) {
      console.error(
        "[uploadCVtoPianata] CV data too large:",
        jsonSize,
        "bytes"
      );
      return res
        .status(400)
        .json({ error: "CV data too large for Pinata (max 10MB)" });
    }

    // Build the correct payload for Pinata
    const pinataPayload = {
      pinataContent: cvData,
      pinataMetadata: {
        name: `SkillMint CV - ${cvData.githubUsername || "user"}`,
      },
    };

    // Use your axios-based helper:
    const cid = await uploadJSONToPinata(pinataPayload);

    console.log("[uploadCVtoPianata] Success! CID:", cid);
    res.json({ cid });
  } catch (err) {
    console.error("[uploadCVtoPianata] Error:", err);
    res
      .status(500)
      .json({ error: "Pinata upload failed", details: err.message });
  }
};

exports.publicCV = async (req, res) => {
  const { cid } = req.query;
  if (!cid) return res.status(400).json({ error: "Missing CID" });
  try {
    const ipfsRes = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
    res.json(ipfsRes.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch CV from IPFS" });
  }
};
