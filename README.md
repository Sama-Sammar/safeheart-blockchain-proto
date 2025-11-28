# SafeHeart Blockchain Prototype

This is a private blockchain prototype built using Node.js.

Here are the Blockchain endpoints you can integrate with your backend:

1) Add a new ECG/AI record (create a new block)
u can use Thunder Client Extensions in vs code

POST http://localhost:3000/addRecord
JSON Body:
{
  "patientId": "12345",
  "ecgStatus": "normal or abnormal",
  "aiResult": "optional AI diagnosis"
}

2) Get the entire blockchain
GET http://localhost:3000/getChain

3) Get the most recent block
GET http://localhost:3000/latest

4) Validate the blockchain
GET http://localhost:3000/validate

Run using:
node server.js