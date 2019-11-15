/* eslint-disable prefer-template */
import { decode } from 'rlp';
import BigNumber from 'bignumber.js';
import { Feedback } from '@icedesign/base';
import * as fractal from 'fractal-web3'

import * as actionTypes from './constant';
import { bytes2Hex, bytes2Number, utf8ByteToUnicodeStr, getReadableNumber, getDataFromFile } from './utils';
import { T } from './lang';


function needParsePayload(actionType) {
  return actionType !== actionTypes.TRANSFER
      && actionType !== actionTypes.CREATE_CONTRACT
      && actionType !== actionTypes.CALL_CONTRACT;
}
function getActionTypeStr(actionTypeNum) {
  let actionType = 0;
  switch (actionTypeNum) {
    case actionTypes.TRANSFER:
      actionType = '转账';
      break;
    case actionTypes.CREATE_CONTRACT:
      actionType = '创建合约';
      break;    
    case actionTypes.CALL_CONTRACT:
      actionType = '调用合约';
      break;
    case actionTypes.CREATE_NEW_ACCOUNT:
      actionType = '创建账户';
      break;
    case actionTypes.UPDATE_ACCOUNT:
      actionType = '更新账户';
      break;
    case actionTypes.UPDATE_ACCOUNT_AUTHOR:
      actionType = '更新账户权限';
      break;
    case actionTypes.INCREASE_ASSET:
      actionType = '增发资产';
      break;
    case actionTypes.ISSUE_ASSET:
      actionType = '发行资产';
      break;
    case actionTypes.DESTORY_ASSET:
      actionType = '销毁资产';
      break;
    case actionTypes.SET_ASSET_OWNER:
      actionType = '设置资产所有者';
      break;
    case actionTypes.SET_ASSET_FOUNDER:
      actionType = '设置资产创办者';
      break;
    case actionTypes.UPDATE_ASSET_CONTRACT:
      actionType = '设置协议资产合约账号';
      break;
    case actionTypes.REG_CANDIDATE:
      actionType = '注册候选者';
      break;
    case actionTypes.UPDATE_CANDIDATE:
      actionType = '更新候选者';
      break;
    case actionTypes.UNREG_CANDIDATE:
      actionType = '注销候选者';
      break;
    case actionTypes.VOTE_CANDIDATE:
      actionType = '给候选者投票';
      break;
    case actionTypes.REFUND_DEPOSIT:
      actionType = '取回抵押金';
      break;
    case actionTypes.WITHDRAW_TX_FEE:
      actionType = '提取手续费';
      break;
    default:
      console.log('error action type:' + actionTypeNum);
  }
  return T(actionType);
}

function calcAssetId(assetIdInfos) {
  const length = assetIdInfos.length;
  if (length == 0) return 0;

  if (length == 1) return assetIdInfos[0];
  
  if (length == 2) return assetIdInfos[0] * 256 + assetIdInfos[1];
}

function parseAction(actionInfo, assetInfo, allAssetInfos, dposInfo) {
  try {
    const actionParseInfo = { ...actionInfo };
    const actionType = actionInfo.type != null ? actionInfo.type : actionInfo.actionType;
    const fromAccount = actionInfo.accountName != null ? actionInfo.accountName : actionInfo.from;
    const toAccount = actionInfo.toAccountName != null ? actionInfo.toAccountName : actionInfo.to;
    const amount = actionInfo.amount != null ? actionInfo.amount : actionInfo.value;
    let payloadInfo = actionInfo.payload;
    if (actionInfo.payload.length > 2 && needParsePayload(actionType)) {
      //console.log(actionInfo.payload);
      payloadInfo = decode(actionInfo.payload);
    }
    let readableNum = 0;
    if (assetInfo != null) {
      readableNum = getReadableNumber(amount, assetInfo.decimals);
    }
    switch (actionType) {
      case actionTypes.TRANSFER:
        actionParseInfo.actionType = '转账';
        actionParseInfo.detailInfo = `${fromAccount}->${toAccount}` + T('转账') + `${readableNum}${assetInfo.symbol}`;
        actionParseInfo.detailObj = { accountName: fromAccount, toAccountName: toAccount, amount: readableNum, symbol: assetInfo.symbol };
        break;
      case actionTypes.CREATE_CONTRACT:
        actionParseInfo.actionType = '创建合约';
        actionParseInfo.detailInfo = T('创建者') + ':' + fromAccount;
        actionParseInfo.detailObj = { accountName: fromAccount };
        break;
      case actionTypes.CALL_CONTRACT:
        actionParseInfo.actionType = T('调用合约');
        const abiInfo = getDataFromFile(actionTypes.ContractABIFile);
        if (abiInfo != null && abiInfo[toAccount] != null) {
          const callFuncInfo = fractal.utils.parseContractTxPayload(abiInfo[toAccount], payloadInfo);
          if (callFuncInfo != null) {
            payloadInfo = T('调用方法') + ':' + callFuncInfo.funcName + ',' + T('参数信息');
            callFuncInfo.parameterInfos.map(parameterInfo => {
              payloadInfo += parameterInfo.name + '[' + parameterInfo.type + ']=' + parameterInfo.value + ',';
            })
          }
        }

        actionParseInfo.detailInfo = payloadInfo; // 无
        actionParseInfo.detailObj = {};
        break;
      case actionTypes.CREATE_NEW_ACCOUNT:
        actionParseInfo.actionType = '创建账户';
        if (payloadInfo.length >= 4) {
          const newAccount = String.fromCharCode.apply(null, payloadInfo[0]);
          const founder = String.fromCharCode.apply(null, payloadInfo[1]);
          //const chargeRatio = payloadInfo[2].length === 0 ? 0 : payloadInfo[2][0];
          const publicKey = bytes2Hex(payloadInfo[2]);
          const accountDesc = utf8ByteToUnicodeStr(payloadInfo[3]);
          actionParseInfo.detailInfo = T('新账号') + `:${newAccount}, ` + T('创建者') + `:${founder}, ` + T('公钥') + `:${publicKey}, ` + T('描述')+ `:${accountDesc}`;
          actionParseInfo.detailObj = { newAccount, founder, publicKey, accountDesc };
        } else {
          actionParseInfo.detailInfo = T('payload信息不足，无法解析');
        }
        break;
      case actionTypes.UPDATE_ACCOUNT:
        actionParseInfo.actionType = T('更新账户');
        if (payloadInfo.length >= 1) {
          const founder = String.fromCharCode.apply(null, payloadInfo[0]);
          actionParseInfo.detailInfo = T('创建者') + `：${founder}`;
          actionParseInfo.detailObj = { founder };
        } else {
          actionParseInfo.detailInfo = T('payload信息不足，无法解析');
        }
        break;
      case actionTypes.UPDATE_ACCOUNT_AUTHOR:
        actionParseInfo.actionType = '账户权限操作';
        if (payloadInfo.length >= 3) {  // const payload = '0x' + encode([threshold, updateAuthorThreshold, [UpdateAuthorType.Delete, [Owner, weight]]]).toString('hex');
          const threshold = bytes2Number(payloadInfo[0]).toNumber();
          const updateAuthorThreshold = bytes2Number(payloadInfo[1]).toNumber();
          let updateAuthorType = null;
          let authorType = 0;
          let owner = '';
          let weight = 0;
          if (!Array.isArray(payloadInfo[2][0])) {
            actionParseInfo.detailInfo = T('解析异常');
            return actionParseInfo;
          }
          let detailInfo = '';
          if (threshold != 0) {
            detailInfo += T('普通交易阈值') + ':' + threshold + ',';
          }
          if (updateAuthorThreshold != 0) {
            detailInfo += T('权限交易阈值') + ':' + updateAuthorThreshold + ',';
          }

          const updateNum = payloadInfo[2].length;
          for (let i = 0; i < updateNum; i++) {
            let updateAuthorTypeBytes = payloadInfo[2][i][0];
            let authorTypeBytes = payloadInfo[2][i][1][0];
            let ownerBytes = payloadInfo[2][i][1][1];
            let weightBytes = payloadInfo[2][i][1][2];
            if (payloadInfo[2][i] == null) {
              updateAuthorTypeBytes = payloadInfo[2][i];
              authorTypeBytes = payloadInfo[2][i+1][0];
              ownerBytes = payloadInfo[2][i+1][1];
              weightBytes = payloadInfo[2][i+1][2];
            }
            updateAuthorType = bytes2Number(updateAuthorTypeBytes).toNumber();
            authorType = bytes2Number(authorTypeBytes).toNumber();
            if (ownerBytes.length > 60 || ownerBytes.length == 40) {
              owner = bytes2Hex(ownerBytes);
            } else {
              owner = String.fromCharCode.apply(null, ownerBytes);
            }
            weight = bytes2Number(weightBytes).toNumber();
                      
            switch(updateAuthorType) {
              case 0:  // ADD
                detailInfo += '[' + T('增加账户权限:权限所有者') + owner + ',' + T('权重') + weight + ']';
                break;
              case 1:  // update
                detailInfo += '[' + T('更新账户权限:将权限拥有者') + owner + T('的权重更新为') + ':' + weight + ']';
                break;
              case 2:  // del
                detailInfo += '[' + T('删除账户权限:权限拥有者') + owner + ',' + T('权重') + weight + ']';
                break;
            }
          }
          
          actionParseInfo.detailInfo = detailInfo;
          actionParseInfo.detailObj = { threshold, updateAuthorThreshold, updateAuthorType, owner, weight };
        } else {
          actionParseInfo.detailInfo = T('payload信息不足，无法解析');
        }
        break;
      case actionTypes.INCREASE_ASSET: 
        actionParseInfo.actionType = '增发资产';
        if (payloadInfo.length >= 3) {
          const assetId = calcAssetId(payloadInfo[0]);
          let amount = bytes2Number(payloadInfo[1]).toNumber();
          const addedAssetInfo = allAssetInfos[assetId];
          if (addedAssetInfo != null) {
            amount = getReadableNumber(amount, addedAssetInfo.decimals);
          } else {
            fractal.account.getAssetInfoById(assetId).then(asset => {
              allAssetInfos[assetId] = asset;
            });
          }
          const toAccount = String.fromCharCode.apply(null, payloadInfo[2]);
          if (addedAssetInfo != null) {
            actionParseInfo.detailInfo = T('向') + toAccount + T('增发资产:资产ID') + '=' + assetId + ',' + T('资产名称') + addedAssetInfo.assetName + T('增发数量') + amount + addedAssetInfo.symbol;
          } else {
            actionParseInfo.detailInfo = T('向') + toAccount + T('增发资产:资产ID') + '=' + assetId + ',' + T('增发数量') + '=' + amount;
          }
          actionParseInfo.detailObj = { assetId, assetName: assetInfo.assetname, amount, toAccount };
        } else {
          actionParseInfo.detailInfo = T('payload信息不足，无法解析');
        }
        break;
      case actionTypes.ISSUE_ASSET: {
        actionParseInfo.actionType = '发行资产';
        if (payloadInfo.length >= 9) {
          const assetName = String.fromCharCode.apply(null, payloadInfo[0]);
          const symbol = String.fromCharCode.apply(null, payloadInfo[1]);
          let amount = bytes2Number(payloadInfo[2]).toNumber();
          const decimals = payloadInfo[3][0] === undefined ? 0 : payloadInfo[3][0];
          const founder = String.fromCharCode.apply(null, payloadInfo[4]);
          const owner = String.fromCharCode.apply(null, payloadInfo[5]);
          let upperLimit = bytes2Number(payloadInfo[6]).toNumber();
          const contract = String.fromCharCode.apply(null, payloadInfo[7]);
          const desc = String.fromCharCode.apply(null, payloadInfo[8]);
  
          actionParseInfo.detailObj = { assetName, symbol, amount, decimals, founder, owner, upperLimit };
  
          amount = getReadableNumber(amount, decimals);
          upperLimit = getReadableNumber(upperLimit, decimals);
          actionParseInfo.detailInfo = T('资产名') + `:${assetName},` + T('符号') + `:${symbol},` + T('初始发行金额') + `:${amount}${symbol},` + T('发行上限') 
                                    + `:${upperLimit}${symbol},` + T('精度') + `:${decimals},` + T('创办者账号') + `:${founder},` + T('管理者账号') 
                                    + `:${owner},` + T('合约账号') + `:${contract},` + T('资产描述') + `:${desc}`;
        } else {
          actionParseInfo.detailInfo = T('payload信息不足，无法解析');
        }
        
        break;
      }
      case actionTypes.DESTORY_ASSET:
        actionParseInfo.actionType = '销毁资产';
        actionParseInfo.detailInfo = T('资产ID') + `:${actionInfo.assetId},` + T('数量') + `:${readableNum}`;
        actionParseInfo.detailObj = { accountName: fromAccount, amount: readableNum, assetId: actionInfo.assetId };
        break;
      case actionTypes.SET_ASSET_OWNER: 
        actionParseInfo.actionType = '设置资产所有者';
        if (payloadInfo.length >= 2) {
          const assetId = calcAssetId(payloadInfo[0]);
          const owner = String.fromCharCode.apply(null, payloadInfo[1]);
          actionParseInfo.detailInfo = T('资产ID') + ':' + assetId + ',' + T('新的管理者') + ':' + owner;
          actionParseInfo.detailObj = {};
        } else {
          actionParseInfo.detailInfo = T('payload信息不足，无法解析');
        }
        break;
      case actionTypes.SET_ASSET_FOUNDER: 
        actionParseInfo.actionType = '设置资产创办者';
        if (payloadInfo.length >= 2) {
          const assetId = calcAssetId(payloadInfo[0]);
          const founder = String.fromCharCode.apply(null, payloadInfo[1]);
          actionParseInfo.detailInfo = T('资产ID') + ':' + assetId + ',' + T('新的创办者') + ':' + founder;
          actionParseInfo.detailObj = {};
        } else {
          actionParseInfo.detailInfo = T('payload信息不足，无法解析');
        }
        break;
      case actionTypes.UPDATE_ASSET_CONTRACT: 
        actionParseInfo.actionType = '设置协议资产合约账号';
        if (payloadInfo.length >= 2) {
          const assetId = calcAssetId(payloadInfo[0]);
          const contract = String.fromCharCode.apply(null, payloadInfo[1]);
          actionParseInfo.detailInfo = T('资产ID') + ':' + assetId + ',' + T('合约账号') + ':' + contract;
          actionParseInfo.detailObj = {};
        } else {
          actionParseInfo.detailInfo = T('payload信息不足，无法解析');
        }
        break;
      case actionTypes.REG_CANDIDATE:
        actionParseInfo.actionType = '注册候选者';
        if (payloadInfo.length >= 1) {
          if (Array.isArray(payloadInfo)) {
            const url = String.fromCharCode.apply(null, payloadInfo[0]);
            actionParseInfo.detailInfo = 'URL:' + url;
          } else {
            actionParseInfo.detailInfo = T('URL为空');
          }
          const stake = getReadableNumber(amount, assetInfo.decimals);
          actionParseInfo.detailInfo += ',' + T('抵押票数') + ':' + new BigNumber(stake).dividedBy(dposInfo.unitStake).toFixed(0);
          actionParseInfo.detailObj = {};
        } else {
          actionParseInfo.detailInfo = T('payload信息不足，无法解析');
        }
        break;
      case actionTypes.UPDATE_CANDIDATE:
        actionParseInfo.actionType = '更新候选者';
        if (payloadInfo.length >= 1) {
          if (Array.isArray(payloadInfo)) {
            const url = String.fromCharCode.apply(null, payloadInfo[0]);
            actionParseInfo.detailInfo = T('URL更新为') + ':' + url;
          } else {
            actionParseInfo.detailInfo = T('URL更新为空');
          }
  
          const stake = getReadableNumber(amount, assetInfo.decimals);
          actionParseInfo.detailInfo += ',' + T('增加抵押票数') + ':' + new BigNumber(stake).dividedBy(dposInfo.unitStake).toFixed(0);
          actionParseInfo.detailObj = {};
        } else {
          actionParseInfo.detailInfo = T('URL为空');
        }
        break;
      case actionTypes.UNREG_CANDIDATE:
        actionParseInfo.actionType = '注销候选者';
        actionParseInfo.detailInfo = T('候选者') + ':' + fromAccount;
        actionParseInfo.detailObj = {};
        break;
      case actionTypes.VOTE_CANDIDATE: 
        actionParseInfo.actionType = '给候选者投票';
        if (payloadInfo.length >= 1) {
          const producerName = String.fromCharCode.apply(null, payloadInfo[0]);
          let stake = bytes2Number(payloadInfo[1]).dividedBy(new BigNumber(dposInfo.unitStake)).toNumber();
          stake = getReadableNumber(stake, actionTypes.FT_DECIMALS);
          actionParseInfo.detailInfo = T('候选者') + ':' + producerName + ',' + T('投票数') + ':' + stake;
          actionParseInfo.detailObj = {};
        } else {
          actionParseInfo.detailInfo = 'URL为空';
        }
        break;
      case actionTypes.REFUND_DEPOSIT:
        actionParseInfo.actionType = '取回抵押金';
        actionParseInfo.detailInfo = T('候选者') + ':' + fromAccount;
        actionParseInfo.detailObj = {};
        break;
      default:
        actionParseInfo.actionType = T('未知类型') + ':' + actionType;
        console.log('error action type:' + actionInfo.actionType);
    }
    if (amount > 0 && actionInfo.actionType !== actionTypes.TRANSFER 
     && actionInfo.actionType !== actionTypes.DESTORY_ASSET 
     && actionInfo.actionType !== actionTypes.REG_CANDIDATE 
     && actionInfo.actionType !== actionTypes.UPDATE_CANDIDATE) {
      actionParseInfo.detailInfo += ',' + T('新账号收到转账') + ':' + readableNum + assetInfo.symbol;
    }
    actionParseInfo.actionType = T(actionParseInfo.actionType);
    return actionParseInfo;
  } catch (error) {
    Feedback.toast.error(error.message);
    console.log(error.message);
  }
}

export { parseAction, getActionTypeStr };
