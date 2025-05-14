const anchor = require("@coral-xyz/anchor");
const { LAMPORTS_PER_SOL } = require("@solana/web3.js");

const connection = new anchor.web3.Connection("https://api.devnet.solana.com"); // or your cluster

// Your account sizes from the Anchor code
const accountSizes = {
  Issuer: 170,
  BadgeTemplate: 233,
  Badge: 122,
  Endorsement: 73,
};

(async () => {
  for (const [name, size] of Object.entries(accountSizes)) {
    const lamports = await connection.getMinimumBalanceForRentExemption(size);
    console.log(
      `${name} (${size} bytes): ${lamports} lamports (${lamports / LAMPORTS_PER_SOL} SOL)`
    );
  }
})();
