const { sendError } = require('./sender');

const RPC_API = {
  AVALANCHE: 'https://api.avax.network/ext/bc/C/rpc',
  FUJI: 'https://api.avax-test.network/ext/bc/C/rpc',
};

const chainId = {
  AVALANCHE: 43114,
  FUJI: 43113,
};

const LPM_ADDRESS = {
  AVALANCHE: '0x16a449Da4B5d699aa0A8D080dE5EDa1e52Aac716',
  FUJI: '0x6B7494a1dD11C51E04613DD148bc298082557Dfe',
};

async function calculateAndDistribute({ liquidityPoolManager, web3, networkId, address, privateKey }) {
  const calculateAndDistributeTx = liquidityPoolManager.methods.calculateAndDistribute();
  try {
    const gas = await calculateAndDistributeTx.estimateGas({ from: address });
    try {
      const gasPrice = await web3.eth.getGasPrice();
      const data = calculateAndDistributeTx.encodeABI();
      const nonce = await web3.eth.getTransactionCount(address);

      const signedTx = await web3.eth.accounts.signTransaction(
        {
          to: liquidityPoolManager.options.address,
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
      await sendError(error);
      throw new Error('ERROR SENDING TX: CALCULATE AND DISTRIBUTE');
    }
  } catch (error) {
    console.log(error, ': ERROR ESTIMATING');
    // await sendError(error);
    throw new Error('ERROR ESTIMATING: CALCULATE AND DISTRIBUTE');
  }
}

async function vestAllocation({ liquidityPoolManager, web3, networkId, address, privateKey }) {
  const vestAllocationTx = liquidityPoolManager.methods.vestAllocation();
  try {
    const gas = await vestAllocationTx.estimateGas({ from: address });
    try {
      const gasPrice = await web3.eth.getGasPrice();
      const data = vestAllocationTx.encodeABI();
      const nonce = await web3.eth.getTransactionCount(address);
      const signedTx = await web3.eth.accounts.signTransaction(
        {
          to: liquidityPoolManager.options.address,
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
      await sendError(error);
      throw new Error('ERROR SENDING: VEST ALLOC');
    }
  } catch (error) {
    console.log(error, ': ERROR ESTIMATING');
    throw new Error('ERROR ESTIMATING: VEST ALLOC');
  }
}

const retryDistribute = async ({
  liquidityPoolManager,
  networkId,
  web3,
  privateKey,
  address,
}) => {
  try {
    await calculateAndDistribute({
      liquidityPoolManager,
      networkId,
      web3,
      privateKey,
      address,
    });
  } catch (error) {
    await retryDistribute({
      liquidityPoolManager,
      networkId,
      web3,
      privateKey,
      address,
    });
    console.log(error);
  }
}

const retryAll = async ({ liquidityPoolManager,
  networkId,
  web3,
  privateKey,
  address,}) => {
  try {
    await vestAllocation({
      liquidityPoolManager,
      networkId,
      web3,
      privateKey,
      address,
    });
    
    try {
      await calculateAndDistribute({
        liquidityPoolManager,
        networkId,
        web3,
        privateKey,
        address,
      });
    } catch (error) {
      await retryDistribute({
        liquidityPoolManager,
        networkId,
        web3,
        privateKey,
        address,
      });
      console.log(error);
    }
  } catch (error) {
    await retryAll({
      liquidityPoolManager,
      networkId,
      web3,
      privateKey,
      address,
    });
    console.log(error);
  }
}

async function main() {
  require('dotenv').config();
  const address = process.env.ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  const { abi: LiquidityPoolManagerAbi } = require('@rytell/liquidity-pools/artifacts/contracts/LiquidityPoolManager.sol/LiquidityPoolManager.json');
  const Web3 = require('web3');
  const web3 = new Web3(new Web3.providers.HttpProvider(RPC_API[process.env.NETWORK]));
  const networkId = chainId[process.env.NETWORK];
  const liquidityPoolManager = new web3.eth.Contract(LiquidityPoolManagerAbi, LPM_ADDRESS[process.env.NETWORK]);

  try {
    await vestAllocation({
      liquidityPoolManager,
      networkId,
      web3,
      privateKey,
      address,
    });
    
    try {
      await calculateAndDistribute({
        liquidityPoolManager,
        networkId,
        web3,
        privateKey,
        address,
      });
    } catch (error) {
      await retryDistribute({
        liquidityPoolManager,
        networkId,
        web3,
        privateKey,
        address,
      });
      console.log(error);
    }
  } catch (error) {
    await retryAll({
      liquidityPoolManager,
      networkId,
      web3,
      privateKey,
      address,
    });
    console.log(error);
  }
}

main();
