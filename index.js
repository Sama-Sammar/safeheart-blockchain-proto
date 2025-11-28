// index.js
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const cors = require("cors");

class Block {
  constructor(index, timestamp, data, previousHash = "") {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data; //  ( { patientId, ecgStatus, aiResult })
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const str = this.index + this.previousHash + this.timestamp + JSON.stringify(this.data) + this.nonce;
    return crypto.createHash("sha256").update(str).digest("hex");
  }

  // Mining بسيط لإظهار مفهوم Proof-of-Work (قابل التخفيض أو الإيقاف بالـ difficulty=0)
  mineBlock(difficulty) {
    const target = "0".repeat(difficulty);
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
  }
}

class SimpleBlockchain {
  constructor(difficulty = 2) { // difficulty 2 يعني البلوك يبدأ بـ '00' — مناسب للعرض
    this.chain = [this.createGenesisBlock()];
    this.difficulty = difficulty;
  }

  createGenesisBlock() {
    return new Block(0, new Date().toISOString(), { info: "Genesis Block" }, "0");
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(newBlock) {
    newBlock.previousHash = this.getLatestBlock().hash;
    // Optional: mine block to demonstrate PoW concept
    if (this.difficulty > 0) {
      newBlock.mineBlock(this.difficulty);
    } else {
      newBlock.hash = newBlock.calculateHash();
    }
    this.chain.push(newBlock);
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (current.hash !== current.calculateHash()) {
        return { valid: false, reason: `Block ${current.index} hash mismatch` };
      }

      if (current.previousHash !== previous.hash) {
        return { valid: false, reason: `Block ${current.index} previousHash mismatch` };
      }
    }
    return { valid: true };
  }
}

/* ===== Express server setup ===== */
const app = express();
app.use(bodyParser.json());
app.use(cors());

const port = process.env.PORT || 3000;
const chain = new SimpleBlockchain(2); 

/*
Routes:
POST  /addRecord    -> body: { patientId, ecgStatus, aiResult }  => يضيف بلوك
GET   /getChain     -> يعيد السلسلة كاملة
GET   /validate     -> يرجع نتيجة التحقق من صحة السلسلة
GET   /latest       -> يعطي آخر بلوك
*/

app.get("/", (req, res) => {
  res.send({
    message: "Safe-Heart Blockchain Prototype (Node.js)",
    endpoints: {
      addRecord: "/addRecord (POST)",
      getChain: "/getChain (GET)",
      validate: "/validate (GET)",
      latest: "/latest (GET)"
    }
  });
});

// Add a new record (block) with ECG/AI data
app.post("/addRecord", (req, res) => {
  const { patientId, ecgStatus, aiResult, extra } = req.body || {};

  if (!patientId || !ecgStatus) {
    return res.status(400).json({ error: "patientId and ecgStatus are required" });
  }

  const newIndex = chain.chain.length;
  const timestamp = new Date().toISOString();
  const data = { patientId, ecgStatus, aiResult: aiResult || null, extra: extra || null };

  const block = new Block(newIndex, timestamp, data);
  chain.addBlock(block);

  res.json({
    message: "Block added successfully",
    block: {
      index: block.index,
      timestamp: block.timestamp,
      data: block.data,
      previousHash: block.previousHash,
      hash: block.hash,
      nonce: block.nonce
    }
  });
});

// Return the whole chain
app.get("/getChain", (req, res) => {
  res.json(chain.chain);
});

// Validate chain integrity
app.get("/validate", (req, res) => {
  const result = chain.isChainValid();
  res.json(result);
});

// Latest block
app.get("/latest", (req, res) => {
  res.json(chain.getLatestBlock());
});

app.listen(port, () => {
  console.log(`Blockchain prototype running at http://localhost:${port}`);
});
