const SHA256 = require('crypto-js/sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

class Transaction{
    constructor(fromAddress,toAddress, ammount){
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.ammount = ammount;
    }

    calculateHash(){
        return SHA256(this.fromAddress + this.toAddress + this.ammount).toString();
    
    }
    signTransaction(signingKey){
        if(signingKey.getPublic('hex') !== this.fromAddress){
            throw new Error('You cannot sign transactions for other wallets');
        }

        const hashTX = this.calculateHash();
        const sig = signingKey.sign(hashTX, 'base64');
        this.signature = sig.toDER('hex');
    }
    isValid(){
        if(this.fromAddress === null) return true;

        if (!this.signature || this.signature.length === 0){
            throw new Error('No signature in this transaction');
        }

        const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
        return publicKey.verify(this.calculateHash(),this.signature);

    }
}

class Block{
    constructor(timestamp,transactions, prevHash = ''){
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.prevHash = prevHash;
        this.hash = this.calculateHash();
        this.nonce= 0;
    }
    calculateHash(){
        return SHA256(this.prevHash + this.timestamp  + JSON.stringify(this.transactions)+ this.nonce).toString();
    }
    mineBlock(difficulty){
        while(this.hash.substring(0,difficulty)!== Array(difficulty+1).join("0")){
            this.nonce++;
            this.hash = this.calculateHash();
        }
        console.log("Block mined: "+this.hash);
    }

    hasValidTrans(){
        for(const tx of this.transactions){
            if (!tx.isValid()){
                return false;
            }
        }

        return true;
    }
    
}



class Blockchain{
    constructor(){
        this.chain = [this.createGenBlock()];
        this.difficulty= 2;
        this.pendingTransactions = [];
        this.miningReward = 100;
    }
    createGenBlock(){
        return new Block(Date.parse("2022-02-01"), [], "0");
    }
    getLastestBlock(){
        return this.chain[this.chain.length - 1];
    }
    
    minePendingTransactions(miningRewardAddress){
        const rewardTx = new Transaction(null, miningRewardAddress, this.miningReward);
        this.pendingTransactions.push(rewardTx);

        let block = new Block(Date.now(),this.pendingTransactions,this.getLastestBlock().hash);
        block.mineBlock(this.difficulty);

        console.log('Block mined successfully');
        this.chain.push(block);

        this.pendingTransactions = [];
        
    }

    addTransaction(transaction){
        if(!transaction.fromAddress || !transaction.toAddress){
            throw new Error('Transaction must have from and to address');
        }

        if(!transaction.isValid()){
            throw new Error('Cannot add invalid transaction into chain');
        }

        this.pendingTransactions.push(transaction);
    }

    getAddBalance(address){
        let balance = 0;
        for (const block of this.chain){
            for (const trans of block.transactions){
                if (trans.fromAddress === address){
                    balance -= trans.ammount;
                }
                if (trans.toAddress === address){
                    balance += trans.ammount;
                }
            }
        }
        return balance;
    }

    isChainValid(){
        for(let  i =  1;  i  < this.chain.length; i++){
            const currentBlock = this.chain[i];
            const prevBlock = this.chain[i-1];

            if(!currentBlock.hasValidTrans()){
                return false;
            }

            if (currentBlock.hash !== currentBlock.calculateHash()){
                return false;
            }
            if (currentBlock.prevHash !==  prevBlock.hash){
                return false;
            }
        }
        return true;
    }
}

module.exports.Blockchain = Blockchain;
module.exports.Transaction = Transaction;