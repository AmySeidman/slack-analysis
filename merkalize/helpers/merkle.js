const { MerkleTree } = require('merkletreejs')
const SHA256 = require('crypto-js/sha256')
const users = require('../data/users.json')

let root
async function getTree (allEmails) {
  let leaves = allEmails.map(x => SHA256(x))
  let tree = new MerkleTree(leaves, SHA256)
  root = tree.getRoot().toString('hex')
  return {
    tree, root
  }
}

function verify (email, tree, root) {
  let leaf = SHA256(email)
  let proof = tree.getProof(leaf)
  return tree.verify(proof,leaf,root)
}

async function isMember (email) {
  let { tree, root } = await getTree(users)
  let v = verify(email, tree, root)
  return v
}
isMember('xyz')
module.exports = {
  isMember, root
}
