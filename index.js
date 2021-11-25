const RPC_API = {
  AVALANCHE: 'https://api.avax.network/ext/bc/C/rpc',
  FUJI: 'https://api.avax-test.network/ext/bc/C/rpc',
};

const chainId = {
  AVALANCHE: 43114,
  FUJI: 43113,
};

const LPM_ADDRESS = {
  AVALANCHE: '0x76b411c884838CbCb3A58d02E7b386EA037b6161',
  FUJI: '0x801fb5cfFD1dA77252389faf2D8C1bF5AAfCCA96',
};

async function calculateAndDistribute({ boostedLpm, web3, networkId, address, privateKey }) {
  const calculateAndDistributeTx = boostedLpm.methods.calculateAndDistribute();
  try {
    const gas = await calculateAndDistributeTx.estimateGas({ from: address });
    try {
      const gasPrice = await web3.eth.getGasPrice();
      const data = calculateAndDistributeTx.encodeABI();
      const nonce = await web3.eth.getTransactionCount(address);

      const signedTx = await web3.eth.accounts.signTransaction(
        {
          to: boostedLpm.options.address,
          data,
          gas,
          gasPrice,
          nonce,
          chainId: networkId,
        },
        privateKey
      );

      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log(receipt, ': RECEIPT');
      return;
    } catch (error) {
      console.log(error, ': ERROR SENDING');
      throw new Error('ERROR SENDING TX: CALCULATE AND DISTRIBUTE');
    }
  } catch (error) {
    console.log(error, ': ERROR ESTIMATING');
    throw new Error('ERROR ESTIMATING: CALCULATE AND DISTRIBUTE');
  }
}

async function vestAllocation({ boostedLpm, web3, networkId, address, privateKey }) {
  const vestAllocationTx = boostedLpm.methods.vestAllocation();
  try {
    const gas = await vestAllocationTx.estimateGas({ from: address });
    try {
      const gasPrice = await web3.eth.getGasPrice();
      const data = vestAllocationTx.encodeABI();
      const nonce = await web3.eth.getTransactionCount(address);
      const signedTx = await web3.eth.accounts.signTransaction(
        {
          to: boostedLpm.options.address,
          data,
          gas,
          gasPrice,
          nonce,
          chainId: networkId,
        },
        privateKey
      );

      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log(receipt, ': RECEIPT');
      return;
    } catch (error) {
      console.log(error, ': ERROR SENDING');
      throw new Error('ERROR SENDING: VEST ALLOC');
    }
  } catch (error) {
    console.log(error, ': ERROR ESTIMATING');
    throw new Error('ERROR ESTIMATING: VEST ALLOC');
  }
}

async function main() {
  require('dotenv').config();
  const address = process.env.ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  const { abi: BoostedLiquidityPoolManagerAbi } = require('./constants/BoostedLiquidityPoolManager.json');
  const Web3 = require('web3');
  const web3 = new Web3(new Web3.providers.HttpProvider(RPC_API[process.env.NETWORK]));
  const networkId = chainId[process.env.NETWORK];
  const boostedLpm = new web3.eth.Contract(BoostedLiquidityPoolManagerAbi, LPM_ADDRESS[process.env.NETWORK]);

  await vestAllocation({
    boostedLpm,
    networkId,
    web3,
    privateKey,
    address,
  });

  await calculateAndDistribute({
    boostedLpm,
    networkId,
    web3,
    privateKey,
    address,
  });
}

main();
