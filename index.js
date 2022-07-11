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

const TREASURY_VESTER = {
  AVALANCHE: '0x71FDf7e9be82896BeCddd3485ECEb41A69509A16',
  FUJI: '0xe3f486d0401fC946aEB95539fACedf0016A342BB'
}

const RADI = {
  AVALANCHE: '0x9c5bBb5169B66773167d86818b3e149A4c7e1d1A',
  FUJI: '0xCcA36c23E977d6c2382dF43e930BC8dE9daC897E'
}

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

async function sendTokens({ radiTokenContract, web3, networkId }) {

  const proxyWalletAddress = process.env.PROXY_WALLET;
  const proxyWalletPrivateKey = process.env.PROXY_WALLET_KEY;

  const sendTokensTx = radiTokenContract.methods.transfer(TREASURY_VESTER[process.env.NETWORK], '25000000000000000000000');
  try {
    const gas = await sendTokensTx.estimateGas({ from: proxyWalletAddress });
    try {
      const gasPrice = await web3.eth.getGasPrice();
      const data = sendTokensTx.encodeABI();
      const nonce = await web3.eth.getTransactionCount(proxyWalletAddress);
      const signedTx = await web3.eth.accounts.signTransaction(
        {
          to: radiTokenContract.options.address,
          data,
          gas,
          gasPrice,
          nonce,
          chainId: networkId,
        },
        proxyWalletPrivateKey
      );

      const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
      console.log(receipt, ': RECEIPT');
      return;
    } catch (error) {
      console.log(error, ': ERROR SENDING');
      await sendError(error);
      throw new Error('ERROR SENDING: SEND TOKENS TO TREASURY VIA PROXY');
    }
  } catch (error) {
    console.log(error, ': ERROR ESTIMATING');
    throw new Error('ERROR ESTIMATING: SEND TOKENS TO TREASURY VIA PROXY');
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
  address,
  radiTokenContract
}) => {
  try {
    await sendTokens({radiTokenContract, networkId, web3, privateKey, address});

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
  const { abi: radiTokenContractAbi } = require('@rytell/tokens/artifacts/contracts/Radi.sol/Radi.json')
  const Web3 = require('web3');
  const web3 = new Web3(new Web3.providers.HttpProvider(RPC_API[process.env.NETWORK]));
  const networkId = chainId[process.env.NETWORK];
  const liquidityPoolManager = new web3.eth.Contract(LiquidityPoolManagerAbi, LPM_ADDRESS[process.env.NETWORK]);
  const radiTokenContract = new web3.eth.Contract(radiTokenContractAbi, RADI[process.env.NETWORK]);

  try {

    await sendTokens({radiTokenContract, networkId, web3, privateKey, address});

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
      radiTokenContract
    });
    console.log(error);
  }
}

main();
