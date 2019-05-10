/* eslint-disable prefer-template */
import { decode } from 'rlp';
import BigNumber from 'bignumber.js';

import * as actionTypes from './constant';
import { bytes2Hex, bytes2Number, utf8ByteToUnicodeStr, getReadableNumber } from './utils';
import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants';


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
      actionType = '设置资产创建者';
      break;
    case actionTypes.REG_CADIDATE:
      actionType = '注册生产者';
      break;
    case actionTypes.UPDATE_CADIDATE:
      actionType = '更新生产者';
      break;
    case actionTypes.UNREG_CADIDATE:
      actionType = '注销生产者';
      break;
    case actionTypes.REMOVE_VOTER:
      actionType = '移除投票者';
      break;
    case actionTypes.VOTE_CADIDATE:
      actionType = '给生产者投票';
      break;
    case actionTypes.CHANGE_CADIDATE:
      actionType = '改投生产者';
      break;
    case actionTypes.UNVOTE_CADIDATE:
      actionType = '收回投票';
      break;
    case actionTypes.CALL_CONTRACT:
      actionType = '调用合约';
      break;
    default:
      console.log('error action type:' + actionInfo.type);
  }
  return actionType;
}

function parseAction(actionInfo, assetInfo, allAssetInfos, dposInfo) {
  const actionParseInfo = { ...actionInfo };
  let payloadInfo = actionInfo.payload;
  if (actionInfo.payload.length > 2 && needParsePayload(actionInfo.type)) {
    //console.log(actionInfo.payload);
    payloadInfo = decode(actionInfo.payload);
  }
  let readableNum = 0;
  if (assetInfo != null) {
    readableNum = getReadableNumber(actionInfo.value, assetInfo.decimals);
  }
  switch (actionInfo.type) {
    case actionTypes.TRANSFER:
      actionParseInfo.actionType = '转账';
      actionParseInfo.detailInfo = `${actionInfo.from}向${actionInfo.to}转账${readableNum}${assetInfo.symbol}`;
      actionParseInfo.detailObj = { from: actionInfo.from, to: actionInfo.to, value: readableNum, symbol: assetInfo.symbol };
      break;
    case actionTypes.CREATE_CONTRACT:
      actionParseInfo.actionType = '创建合约';
      actionParseInfo.detailInfo = '创建者:' + actionInfo.from;
      actionParseInfo.detailObj = { from: actionInfo.from };
      break;
    case actionTypes.CREATE_NEW_ACCOUNT:
      actionParseInfo.actionType = '创建账户';
      if (payloadInfo.length >= 4) {
        const newAccount = String.fromCharCode.apply(null, payloadInfo[0]);
        const founder = String.fromCharCode.apply(null, payloadInfo[1]);
        //const chargeRatio = payloadInfo[2].length === 0 ? 0 : payloadInfo[2][0];
        const publicKey = bytes2Hex(payloadInfo[2]);
        const accountDesc = utf8ByteToUnicodeStr(payloadInfo[3]);
        actionParseInfo.detailInfo = `新账号:${newAccount}, 创建者:${founder}, 公钥:${publicKey}, 描述:${accountDesc}`;
        actionParseInfo.detailObj = { newAccount, founder, publicKey, accountDesc };
      } else {
        actionParseInfo.detailInfo = '未知错误';
      }
      //actionParseInfo.detailObj = { from: actionInfo.from, to: actionInfo.to, value: readableNum, symbol: assetInfo != null ? assetInfo.symbol : '' };
      break;
    case actionTypes.UPDATE_ACCOUNT:
      actionParseInfo.actionType = '更新账户';
      if (payloadInfo.length >= 4) {
        const founder = String.fromCharCode.apply(null, payloadInfo[1]);
        const chargeRatio = payloadInfo[2].length === 0 ? 0 : payloadInfo[2][0];
        const publicKey = bytes2Hex(payloadInfo[3]);
        actionParseInfo.detailInfo = `创建者：${founder}, 手续费收取比例:${chargeRatio}%, 公钥:${publicKey}`;
        actionParseInfo.detailObj = { founder, chargeRatio, publicKey };
      } else {
        actionParseInfo.detailInfo = '未知错误';
      }
      break;
    case actionTypes.UPDATE_ACCOUNT_AUTHOR:
      if (payloadInfo.length >= 3) {  // const payload = '0x' + encode([threshold, updateAuthorThreshold, [UpdateAuthorType.Delete, [Owner, weight]]]).toString('hex');
        const threshold = bytes2Number(payloadInfo[0]).toNumber();
        const updateAuthorThreshold = bytes2Number(payloadInfo[1]).toNumber();
        let updateAuthorType = null;
        let authorType = 0;
        let owner = '';
        let weight = 0;
        let updateAuthorTypeBytes = payloadInfo[2][0][0];
        let authorTypeBytes = payloadInfo[2][0][1][0];
        let ownerBytes = payloadInfo[2][0][1][1];
        let weightBytes = payloadInfo[2][0][1][2];
        if (payloadInfo[2][0] == null) {
          updateAuthorTypeBytes = payloadInfo[2][0];
          authorTypeBytes = payloadInfo[2][1][0];
          ownerBytes = payloadInfo[2][1][1];
          weightBytes = payloadInfo[2][1][2];
        }
        updateAuthorType = bytes2Number(updateAuthorTypeBytes).toNumber();
        authorType = bytes2Number(authorTypeBytes).toNumber();
        if (ownerBytes.length > 60 || ownerBytes.length == 40) {
          owner = bytes2Hex(ownerBytes);
        } else {
          owner = String.fromCharCode.apply(null, ownerBytes);
        }
        weight = bytes2Number(weightBytes).toNumber();
        
        let detailInfo = '';
        if (threshold != 0) {
          detailInfo += '普通交易阈值:' + threshold + ',';
        }
        if (updateAuthorThreshold != 0) {
          detailInfo += '权限交易阈值:' + updateAuthorThreshold + ',';
        }
        switch(updateAuthorType) {
          case 0:  // ADD
            detailInfo += '权限所有者' + owner + ',权重' + weight;
            actionParseInfo.actionType = '增加账户权限';
            break;
          case 1:  // update
            detailInfo += '将权限拥有者' + owner + '的权重更新为:' + weight;
            actionParseInfo.actionType = '更新账户权限';
            break;
          case 2:  // del
            detailInfo += '权限拥有者' + owner + ',权重' + weight;
            actionParseInfo.actionType = '删除账户权限';
            break;
        }
        actionParseInfo.detailInfo = detailInfo;
        actionParseInfo.detailObj = { threshold, updateAuthorThreshold, updateAuthorType, owner, weight };
      } else {
        actionParseInfo.detailInfo = '未知错误';
      }
      break;
    case actionTypes.INCREASE_ASSET: {
      actionParseInfo.actionType = '增发资产';
      const assetId = payloadInfo[0][0];
      let amount = bytes2Number(payloadInfo[1]).toNumber();
      const addedAssetInfo = allAssetInfos[assetId];
      amount = getReadableNumber(amount, addedAssetInfo.decimals);
      const toAccount = String.fromCharCode.apply(null, payloadInfo[2]);
      actionParseInfo.detailInfo = `向${toAccount}增发资产:资产ID=${assetId},资产名称:${addedAssetInfo.assetName}, 增发数量=${amount}${addedAssetInfo.symbol}`;
      actionParseInfo.detailObj = { assetId, assetName: assetInfo.assetname, amount, toAccount };
      break;
    }
    case actionTypes.ISSUE_ASSET: {
      actionParseInfo.actionType = '发行资产';
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

      actionParseInfo.detailInfo = `资产名:${assetName},符号:${symbol},初始发行金额:${amount}${symbol},发行上限:${upperLimit}${symbol},精度:${decimals}位,创办者账号:${founder},管理者账号:${owner},合约账号:${contract},资产描述:${desc}`;
      break;
    }
    case actionTypes.DESTORY_ASSET:
      actionParseInfo.actionType = '销毁资产';
      actionParseInfo.detailInfo = `资产ID:${actionInfo.assetID},数量:${readableNum}`;
      actionParseInfo.detailObj = { from: actionInfo.from, value: readableNum, assetId: actionInfo.assetId };
      break;
    case actionTypes.SET_ASSET_OWNER: {
      actionParseInfo.actionType = '设置资产所有者';
      const assetId = payloadInfo[0][0];
      const owner = String.fromCharCode.apply(null, payloadInfo[1]);
      actionParseInfo.detailInfo = '资产ID:' + assetId + ', 新的管理者:' + owner;
      actionParseInfo.detailObj = {};
      break;
    }
    case actionTypes.UPDATE_ASSET: {
      actionParseInfo.actionType = '设置资产创办者';
      const assetId = payloadInfo[0][0];
      const founder = String.fromCharCode.apply(null, payloadInfo[1]);
      actionParseInfo.detailInfo = '资产ID:' + assetId + ', 新的创办者:' + founder;
      actionParseInfo.detailObj = {};
      break;
    }
    case actionTypes.REG_CADIDATE: {
      actionParseInfo.actionType = '注册生产者';
      const url = String.fromCharCode.apply(null, payloadInfo[0]);
      let stake = bytes2Number(payloadInfo[1]).toNumber();
      stake = getReadableNumber(stake, actionTypes.FT_DECIMALS);
      actionParseInfo.detailInfo = 'URL:' + url + ', 投票数:' + stake;
      actionParseInfo.detailObj = {};
      break;
    }
    case actionTypes.UPDATE_CADIDATE: {
      actionParseInfo.actionType = '更新生产者';
      const url = String.fromCharCode.apply(null, payloadInfo[0]);
      let stake = bytes2Number(payloadInfo[1]).toNumber();
      stake = getReadableNumber(stake, actionTypes.FT_DECIMALS);
      actionParseInfo.detailInfo = 'URL:' + url + ', 投票数:' + stake;
      actionParseInfo.detailObj = {};
      break;
    }
    case actionTypes.UNREG_CADIDATE:
      actionParseInfo.actionType = '注销生产者';
      actionParseInfo.detailInfo = payloadInfo; // 无
      actionParseInfo.detailObj = {};
      break;
    case actionTypes.REMOVE_VOTER: {
      actionParseInfo.actionType = '移除投票者';
      // var payload = encode([this.state.voterAccountName]);
      const removedVoter = String.fromCharCode.apply(null, payloadInfo[0]);
      actionParseInfo.detailInfo = '被移除的投票者:' + removedVoter;
      actionParseInfo.detailObj = {};
      break;
    }
    case actionTypes.VOTE_CADIDATE: {
      actionParseInfo.actionType = '给生产者投票';
      const producerName = String.fromCharCode.apply(null, payloadInfo[0]);
      let stake = bytes2Number(payloadInfo[1]).dividedBy(new BigNumber(dposInfo.unitStake)).toNumber();
      stake = getReadableNumber(stake, actionTypes.FT_DECIMALS);
      actionParseInfo.detailInfo = '生产者:' + producerName + ', 投票数:' + stake;
      actionParseInfo.detailObj = {};
      break;
    }
    case actionTypes.CHANGE_CADIDATE:
      actionParseInfo.actionType = '改投生产者';
      try {
        const newProducer = String.fromCharCode.apply(null, payloadInfo[0]);
        actionParseInfo.detailInfo = `获得投票的生产者:${newProducer}`; //
      } catch (error) {
        actionParseInfo.detailInfo = '发生错误';
      }
      actionParseInfo.detailObj = {};
      break;
    case actionTypes.UNVOTE_CADIDATE:
      actionParseInfo.actionType = '收回投票';
      actionParseInfo.detailInfo = payloadInfo; // 无
      actionParseInfo.detailObj = {};
      break;
    case actionTypes.CALL_CONTRACT:
      actionParseInfo.actionType = '调用合约';
      actionParseInfo.detailInfo = payloadInfo; // 无
      actionParseInfo.detailObj = {};
      break;
    default:
      console.log('error action type:' + actionInfo.type);
  }
  if (actionInfo.value > 0 && actionInfo.type !== actionTypes.TRANSFER && actionInfo.type !== actionTypes.DESTORY_ASSET) {
    actionParseInfo.detailInfo += ',新账号收到转账:' + readableNum + assetInfo.symbol;
  }
  return actionParseInfo;
}

export { parseAction, getActionTypeStr };
