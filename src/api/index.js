/* eslint-disable no-restricted-syntax */
/* eslint-disable prefer-template */
import axios from 'axios';
import * as EthUtil from 'ethereumjs-util';
import * as EthCrypto from 'eth-crypto';
import cookie from 'react-cookies';
import { encode } from 'rlp';
import { Feedback } from '@icedesign/base';
import * as utils from '../utils/utils';
import * as constant from '../utils/constant';

let provider = constant.LocalRPCAddr;

async function postToNode(dataToNode) {
  return fetch(provider, {headers: { "Content-Type": "application/json" }, method: 'POST', body: dataToNode});
  // const data = await response.json();
  // if (data.data.error != null) {
  //   throw data.data.error.message;
  // }
  // return data.data.result;
}

export async function getCurrentBlock(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'ft_getCurrentBlock',
    params,
    id: 1 });
  return postToNode({
    data: dataToSrv,
  });
}

export async function getBlockByHash(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'ft_getBlockByHash',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getBlockByNum(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'ft_getBlockByNumber',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getTransactionByHash(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'ft_getTransactionByHash',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getTransactionReceipt(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'ft_getTransactionReceipt',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getTxNumByBlockHash(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'ft_getTxNumByBlockHash',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getTxNumByBlockNum(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'ft_getTxNumByBlockNum',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getTotalTxNumByBlockHash(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'ft_getTotalTxNumByBlockHash',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getTotalTxNumByBlockNum(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'ft_getTotalTxNumByBlockNum',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}


export async function getCadidates() {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'dpos_cadidates',
    params: [],
    id: 1 });
  return utils.postToNode({
    data: dataToSrv,
  });
}


export async function getDposAccountInfo(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'dpos_account',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}


export async function getDposInfo(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'dpos_info',
    params: [],
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getDposIrreversibleInfo(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'dpos_irreversible',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getAssetInfoById(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'account_getAssetInfoByID',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getAssetInfoByName(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'account_getAssetInfoByName',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getSuggestionGasPrice() {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'ft_gasPrice',
    params: [],
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getValidateEpchoInfo() {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'dpos_validateEpcho',
    params: [],
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getLatestEpchoInfo() {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'dpos_latestEpcho',
    params: [],
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getNonce(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'account_getNonce',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

function getRSV(signature, chainId) {
  const r = signature.slice(0, 66);
  const s = '0x' + signature.slice(66, 130);
  let v = '0x' + signature.slice(130, 132);
  if (chainId !== 0) {
    v = parseInt(v, 16) + 10;
    v = '0x' + v.toString(16);
  }
  return { r, s, v };
}

export async function sendRawTransaction(params, privateKey, indexes) {
  const resp = await getNonce([params.accountName]);
  const nonce = resp.data.result;
  let chainId = 1;
  const chainIdCookie = cookie.load('chainId');
  if (chainIdCookie != null && chainIdCookie != '') {
    chainId = chainIdCookie;
  }
  chainId = parseInt(chainId, 10);

  const tx = {};
  tx.gasAssetId = 1;
  tx.gasPrice = params.gasPrice === undefined ? 10 : params.gasPrice;
  tx.chainId = chainId;
  tx.actions = [];
  const action = {};
  action.accountName = params.accountName;
  action.actionType = params.actionType;
  action.nonce = nonce;
  action.assetId = params.assetId === undefined ? 1 : params.assetId;
  action.toAccountName = params.toAccountName === undefined ? '' : params.toAccountName;
  action.gasLimit = params.gasLimit === undefined ? 200000 : params.gasLimit;
  action.amount = params.value === undefined ? 0 : params.value;
  action.payload = params.data === undefined ? '' : params.data;
  tx.actions.push(action);

  const signature = await signTx(tx, privateKey);
  const rsv = getRSV(signature, chainId);
  let signInfo = rsv;
  signInfo.indexes = indexes;
  tx.action[0].signInfo = signInfo;
  //Object.assign(tx.actions[0], rsv);
  const action1 = tx.actions[0];
  let rlpData = encode([tx.gasAssetId, tx.gasPrice, [[action1.actionType, action1.nonce, action1.assetId, action1.accountName, action1.toAccountName,
    action1.gasLimit, action1.amount, action1.payload, [[action1.signInfo.v, action1.signInfo.r, action1.signInfo.s, action1.signInfo.indexes]]]]]);
  rlpData = '0x' + rlpData.toString('hex');
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'ft_sendRawTransaction',
    params: [rlpData],
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}
export async function sendTransaction(params) {
  try {
    const resp = await getPrivateKeyByAccountName(params.accountName, params.password);
    if (resp != null) {
      const privateKey = resp.data.result;
      return sendRawTransaction(params, privateKey, [0]);
    }
  } catch (error) {
    Feedback.toast.error(error.message);
    return error.message;
  }
}
async function getPrivateKeyByAccountName(accountName, password) {
  var address = '';
  var response = await getBoundInfo([]);
  if (response.data.hasOwnProperty('result') && response.data.result != undefined) {
    for (let account of response.data.result) {
      if (account.accountName == accountName) {
        console.log('account.publicKey:' + account.publicKey);
        var address = EthCrypto.publicKey.toAddress(account.publicKey.substring(2));
        var privateKey = await getPrivateKey([address, password]);
        return privateKey;
      }
    }
  }
  return null;
}

export async function signTx(tx, privateKey) {
  const actionHashs = [];
  for (const action of tx.actions) {
    const { accountName, actionType, nonce, gasLimit } = action;
    let { toAccountName, amount, payload } = action;
    if (toAccountName == null) {
      toAccountName = '';
    }
    if (amount == null) {
      amount = 0;
    }
    if (payload == null) {
      payload = '0x';
    }

    payload = utils.hex2Bytes(payload);
    const actionHash = EthUtil.rlphash([accountName, actionType, nonce, toAccountName, gasLimit, amount, payload, tx.chainId, 0, 0]);

    actionHashs.push(actionHash);
  }
  const merkleRoot = EthUtil.keccak(actionHashs[0]);

  const txHash = EthUtil.rlphash([merkleRoot, tx.gasAssetId, tx.gasPrice]).toString('hex');

  const signature = EthCrypto.sign(privateKey, txHash);
  return signature;
}

export async function getAccountInfo(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'account_getAccountByName',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}
export async function isAccountExist(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'account_accountIsExist',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getBoundInfo(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'keystore_getAccountsByPublicKeys',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export async function getPrivateKey(params) {
  const dataToSrv = JSON.stringify({ jsonrpc: '2.0',
    method: 'keystore_exportRawKey',
    params,
    id: 1 });
  return axios({
    method: 'post',
    data: dataToSrv,
  });
}

export default {
  getCurrentBlock,
  getBlockByHash,
  getBlockByNum,
  getTransactionByHash,
  getTransactionReceipt,
  getTxNumByBlockHash,
  getTxNumByBlockNum,
  getTotalTxNumByBlockHash,
  getTotalTxNumByBlockNum,
  getCadidates,
  getDposAccountInfo,
  getDposIrreversibleInfo,
  getDposInfo,
  sendTransaction,
  getValidateEpchoInfo,
  getAccountInfo,
  getBoundInfo,
};
