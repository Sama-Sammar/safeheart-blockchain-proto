const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const cors = require("cors");
const fs = require("fs");

/* ------------ Helper Functions for Saving/Loading the Chain ----------- */
const CHAIN_FILE = "chain.json";

function saveChain(chain) {
  fs.writeFileSync(CHAIN_FILE, JSON.stringify(chain, null, 2));
}

function loadChain() {
  if (!fs.existsSync(CHAIN_FILE)) return null;
  try {
    const data = fs.readFileSync(CHAIN_FILE);
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/* ------------------------------ BLOCK CLASS ------------------------------ */
class Block {
  constructor(index, timestamp, data, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const str =
      this.index +
      this.previousHash +
      this.timestamp +
      JSON.stringify(this.data) +
      this.nonce;

    return crypto.createHash("sha256").update(str).digest("hex");
  }

  mineBlock(difficulty) {
    const target = "0".repeat(difficulty);
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }
}

/* ------------------------------ BLOCKCHAIN CLASS ------------------------------ */
class SimpleBlockchain {
  constructor(difficulty = 2) {
    this.chain = this.loadOrCreateChain();
    this.difficulty = difficulty;
  }

  loadOrCreateChain() {
    const saved = loadChain();
    if (saved && Array.isArray(saved)) {
      console.log("Loaded blockchain from chain.json");
      return saved;
    }
    console.log("Creating new blockchain with Genesis Block...");
    const genesis = [this.createGenesisBlock()];
    saveChain(genesis);
    return genesis;
  }

  createGenesisBlock() {
    return new Block(0, new Date().toISOString(), { info: "Genesis Block" }, "0");
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(newBlock) {
    newBlock.previousHash = this.getLatestBlock().hash;

    if (this.difficulty > 0) newBlock.mineBlock(this.difficulty);
    else newBlock.hash = newBlock.calculateHash();

    this.chain.push(newBlock);

    // SAVE AFTER EACH ADD
    saveChain(this.chain);
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (current.hash !== current.calculateHash()) {
        return { valid: false, reason: `Hash mismatch at block ${current.index}` };
      }

      if (current.previousHash !== previous.hash) {
        return {
          valid: false,
          reason: `previousHash mismatch at block ${current.index}`,
        };
      }
    }

    return { valid: true };
  }
}

/* ------------------------------ EXPRESS SERVER ------------------------------ */
const app = express();
app.use(bodyParser.json());
app.use(cors());

const chain = new SimpleBlockchain(2);
const port = 3000;

app.get("/", (req, res) => {
  res.json({
    message: "Safe-Heart Blockchain Prototype",
    endpoints: {
      addRecord: "/addRecord (POST)",
      getChain: "/getChain (GET)",
      validate: "/validate (GET)",
      latest: "/latest (GET)",
    },
  });
});

/* ------------------------------ ROUTES ------------------------------ */

// Add new ECG/AI record
app.post("/addRecord", (req, res) => {
  const { patientId, ecgStatus, aiResult, extra } = req.body;

  if (!patientId || !ecgStatus) {
    return res.status(400).json({
      error: "patientId and ecgStatus are required",
    });
  }

  const newIndex = chain.chain.length;
  const timestamp = new Date().toISOString();

  const data = {
    patientId,
    ecgStatus,
    aiResult: aiResult || null,
    extra: extra || null,
  };

  const block = new Block(newIndex, timestamp, data);
  chain.addBlock(block);

  res.json({
    message: "Block added successfully",
    block,
  });
});

// Get full chain
app.get("/getChain", (req, res) => {
  res.json(chain.chain);
});

// Validate chain
app.get("/validate", (req, res) => {
  res.json(chain.isChainValid());
});

// Latest block
app.get("/latest", (req, res) => {
  res.json(chain.getLatestBlock());
});

app.listen(port, () => {
  console.log(`Blockchain running at http://localhost:${port}`);
});
