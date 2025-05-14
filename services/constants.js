const { PublicKey } = require("@solana/web3.js");

const PROGRAM_ID = new PublicKey("56ho3dzL4ofGsvXwnTX53DMqYxT9K611NA3NJEasDwap");
const NETWORK = "devnet";
const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

module.exports = {
  PROGRAM_ID,
  NETWORK,
  TOKEN_METADATA_PROGRAM_ID,
};
