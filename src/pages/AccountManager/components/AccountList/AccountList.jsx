import React, { Component } from 'react';
import IceContainer from '@icedesign/container';
import { Table, Button, Select, Input, Dialog, Feedback, NumberPicker } from '@icedesign/base';
import { Tag, Balloon } from '@alifd/next';

import BigNumber from 'bignumber.js';
import * as fractal from 'fractal-web3';
import * as ethUtil from 'ethereumjs-util';
import { ethers } from 'ethers';
import copy from 'copy-to-clipboard';

import { encode } from 'rlp';
import './AccountList.scss';

import * as txParser from '../../../../utils/transactionParser';
import * as utils from '../../../../utils/utils';  //{ utils.hex2Bytes, utils.isEmptyObj, utils.getPublicKeyWithPrefix }
import * as constant from '../../../../utils/constant';

/* 交易状态：
* 1: 发送失败：无需更新
* 2：发送成功，但尚未执行：需更新
* 3：发送成功，执行成功：需检查是否被回滚
* 4：发送成功，执行失败：需检查是否被回滚
* 5：内部交易成功：需检查是否被回滚
* 6：内部交易失败：需检查是否被回滚
*/
const TxStatus = { SendError:1, NotExecute:2, ExecuteSuccess:3, ExecuteFail:4, InnerSuccess:5, InnerFail:6 };

/* 区块状态：
    * 1: 可逆：   1   //初始默认的状态值
    * 2：不可逆   0
    * 3：被回滚  -1
*/
const BlockStatus = { Rollbacked: -1, Irreversible: 0, Reversible: 1, Unknown: 2 };

const UpdateAuthorType = { Add: 0, Update: 1, Delete: 2};
const AuthorOwnerType = { Error: -1, AccountName: 0, PublicKey: 1, Address: 2 };

export default class AccountList extends Component {
  static displayName = 'AccountList';

  static propTypes = {};

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.state = {
      dataSource: [],
      creator: '',
      fractalAccount: '',
      selfAccount: '',
      accountReg: new RegExp('^[a-z0-9]{7,16}(\\.[a-z0-9]{1,8}){0,1}$'),
      numberReg: new RegExp('^[1-9][0-9]*(\\.[0-9]*){0,1}$'),
      gasReg: new RegExp('^[1-9][0-9]*'),
      fractalPublicKey: '',
      selfPublicKey: '',
      otherPublicKey: '',
      email: '',
      emailReg: new RegExp('^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$'),
      password: '',
      balanceInfos: [],
      assetInfos: {},
      importAccountName: '',
      assetVisible: false,
      curBalance: {},
      curTransferAsset: {},
      curAccount: '',
      curAccountFTBalance: '',
      transferToAccount: '',
      transferValue: 0,
      transferAssetSymbol: '',
      suggestionPrice: 10,
      gasPrice: 0,
      gasLimit: 0,
      payload: '',
      txVisible: false,
      txInfos: [],
      inputOtherPK: false,
      inputOtherPKStr: '输入其它公钥',
      dposInfo: {},
      chainConfig: {},
      irreversibleInfo: {},
      maxRollbackBlockNum: 0,
      maxRollbackTime: 0,  // ms
      importAccountVisible: false,
      authorListVisible: false,
      selfCreateAccountVisible: false,
      bindNewAuthorVisible: false,
      updateWeightVisible: false,
      transferVisible: false,
      txConfirmVisible: false,
      innerTxVisible: false,
      withdrawTxFeeVisible: false,
      accountInfos: [],
      authorList: [],
      accountNames: [],
      keystoreList: [],
      blockRollbackCache: {},
      curBlock: null,
      syncTxInterval: 60000,
      syncTxTimeoutId: 0,
      innerTxInfos: [],
      txFeeTypes: [{value:0, label:'资产'}, {value:1, label:'合约'}, {value:2, label:'挖矿'}],
      withdrawFooter: (<view>
                        <Button type='primary' onClick={() => {this.onWithdrawTxFeeOK.bind(this)}}>提取</Button>
                        <Button type='normal' onClick={this.getTxFee.bind(this)}>查询</Button>
                       </view>),
      authorListFooter: (<view>
                        <Button type='primary' onClick={this.bindNewAuthor.bind(this)}>绑定新权限</Button>
                      </view>),
      txFeeInfo: '',
    };
  }

  componentDidMount = async () => {
    this.state.dposInfo = await fractal.dpos.getDposInfo();
    this.state.chainConfig = await fractal.ft.getChainConfig();
    this.state.chainConfig.sysTokenID = 0;
    this.state.maxRollbackBlockNum = this.state.dposInfo.blockFrequency * this.state.dposInfo.candidateScheduleSize * 2;
    this.state.maxRollbackTime = this.state.maxRollbackBlockNum * this.state.dposInfo.blockInterval;
    this.state.irreversibleInfo = await fractal.dpos.getDposIrreversibleInfo();
    this.loadAccountsFromLS();
    this.loadKeystoreFromLS();
    this.syncTxFromNode();
  }
  loadKeystoreFromLS = () => {
    const keystoreInfoObj = utils.getDataFromFile(constant.KeyStoreFile);
    if (keystoreInfoObj != null) {
      this.state.keystoreList = keystoreInfoObj.keyList;
    }
  }
  loadAccountsFromLS = async () => {
    const accounts = utils.getDataFromFile(constant.AccountFile);
    if (accounts != null) {
      for (const account of accounts) {
        const accountObj = await fractal.account.getAccountByName(account);
        if (accountObj != null) {
          this.state.accountInfos.push(accountObj);
        } 
      }

      this.setState({accountInfos: this.state.accountInfos});
    }
  }
  // 返回true表示区块被回滚
  checkBlockRollback = async (blockHash, blockNum) => {
    const blockInfo = fractal.ft.getBlockByNum(blockNum);
    return blockInfo.hash !== blockHash;
  }
  saveAccountsToLS = () => {
    let accounts = [];
    this.state.accountInfos.map(item => accounts.push(item.accountName));
    utils.storeDataToFile(constant.AccountFile, accounts);
  }

  onImportAccount = () => {
    this.setState({ importAccountVisible: true });
  }

  onImportAccountOK = async () => {
    if (this.state.importAccountName == '') {
      Feedback.toast.error('请输入账号');
      return;
    }
    if (!this.state.accountReg.test(this.state.importAccountName)) {
      Feedback.toast.error('账号格式错误');
      return;
    }
    for (const account of this.state.accountInfos) {
      if (account.accountName == this.state.importAccountName) {
        Feedback.toast.error('账号已存在，不可重复导入!');
        return;
      }
    }
    try {
      const self = this;
      fractal.account.getAccountByName(this.state.importAccountName).then(account => {
        if (account != null) {
          const accountInfos = [...self.state.accountInfos, account];
          self.setState({ accountInfos });
          self.saveAccountsToLS();
        } else {
          Feedback.toast.error('账户不存在');
        }
      });
    } catch (error) {
      Feedback.toast.error(error);
    }
  };

  onImportAccountClose = () => {
    this.setState({ importAccountVisible: false });
  }

  deleteAccount = (index) => {
    const accountName = this.state.accountInfos[index].accountName;
    this.state.accountInfos.splice(index, 1);
    this.setState({accountInfos: this.state.accountInfos});
    this.saveAccountsToLS();
    this.deleteTxFromFile(accountName);
  };
  
  showAssets = (index) => {
    this.state.curAccount = this.state.accountInfos[index];
    const balances = this.state.accountInfos[index].balances;
    const self = this;
    let promiseArr = [];
    for (const balance of balances) {
      if (this.state.assetInfos[balance.assetID] === undefined) {
        promiseArr.push(fractal.account.getAssetInfoById(balance.assetID));
      }
      if (balance.assetID === 1) {
        this.state.curAccountFTBalance = balance.balance;
      }
    }
    if (promiseArr.length > 0) {
      Promise.all(promiseArr).then(assets => {
        for (const asset of assets) {
          self.state.assetInfos[asset.assetId == null ? 0 : asset.assetId] = asset;
        }
        self.setState({
          assetVisible: true,
          balanceInfos: balances,
        });
      })
    } else {
      this.setState({
        assetVisible: true,
        balanceInfos: balances,
      });
    }
  }
  /** 
    * 交易状态：
    * 1: 发送失败：无需更新
    * 2：发送成功，但尚未执行：需更新
    * 3：发送成功，执行成功：需检查是否被回滚
    * 4：发送成功，执行失败：需检查是否被回滚
    * 5：内部交易成功：需检查是否被回滚
    * 6：内部交易失败：需检查是否被回滚
    *
    *  区块状态：
    * 1: 可逆：显示离不可逆的距离
    * 2：不可逆
    * 
   * 需要保存在文件中的账户信息及信息同步时间点：
   * （1）如果是首次同步账户交易信息，则从账户创建时的区块开始同步，同步到最新区块后，在文件中记录此账户最近同步的区块高度
   * （2）如果不是首次同步账户交易信息，则从文件中记录的区块高度+1开始同步交易
   * （3）即便账户被删除，交易信息依然需要保留下来
   * （4）用户在创建或导入账户的时候，就要开始定时同步此账户的交易信息
   * （5）网站刚打开，从文件中导入账户的时候，也需要开始同步账户的交易信息
   * 
   * 需要保存在文件中的交易信息：
   * 交易发起时间：
   * 交易hash:
   * 区块hash:
   * 区块状态：三种状态，可逆，不可逆，回退，只有当不可逆的时候，不需要再向节点获取状态，否则需要向节点轮询区块状态
   * 类型
   * 详情
   * 结果：需要查询receipt
   * 总gas费
   * gas分配详情
   * 
   * {account1:{lastBlockHash, lastBlockNum, txInfos:[{isInnerTx,txStatus,date,txHash,blockHash,blockNumber,blockStatus, actions:[ {type,from,to,assetID,value,payload,status,actionIndex,gasUsed,gasAllot: [ account,gas,typeId],error}],{...}]}}
   * 
   * 交易保存到三个文件中：
   * 1. txSentFail: 发送时就返回失败的交易
   * 2. txSentSuccess: 发送成功的交易
   * 3. txExecuted: 已执行的交易，保存成功和失败以及被回滚的
  */
  showTxs = async (index) => {
    try {
      this.state.curBlock = await fractal.ft.getCurrentBlock(false);
      this.state.curAccount = this.state.accountInfos[index];
      for (const balance of this.state.accountInfos[index].balances) {
        if (this.state.assetInfos[balance.assetID] == null) {
          const assetInfo = await fractal.account.getAssetInfoById(balance.assetID);
          this.state.assetInfos[balance.assetID] = assetInfo;
        }
      }

      let allTxInfoSet = utils.getDataFromFile(constant.TxInfoFile);
      if (allTxInfoSet != null) {
        let accountTxInfoSet = allTxInfoSet[this.state.curAccount.accountName];
        if (accountTxInfoSet == null) {   // 如果在本地不存在此账号的交易信息，则从链上同步其所有交易
          await fractal.ft.getCurrentBlock(false).then(async (curBlock) => {
            const accountTxs = await this.syncTxsOfAccount(this.state.curAccount, curBlock.number);
            allTxInfoSet[this.state.curAccount.accountName] = { txInfos: accountTxs };
            utils.storeDataToFile(constant.TxInfoFile, allTxInfoSet);
            accountTxInfoSet = allTxInfoSet[this.state.curAccount.accountName];
          });
        }
        const txInfos = [];
        for (const txInfo of accountTxInfoSet.txInfos) {
          const parsedActions = [];
          let transaction = txInfo;
          
          for (const actionInfo of txInfo.actions) {
            if (this.state.assetInfos[actionInfo.assetID] === undefined) {
              const asset = await fractal.account.getAssetInfoById(actionInfo.assetID);
              this.state.assetInfos[actionInfo.assetID] = asset;
            }
            const parsedAction = txParser.parseAction(actionInfo, this.state.assetInfos[actionInfo.assetID], this.state.assetInfos, this.state.dposInfo);
            if (txInfo.txStatus != TxStatus.SendError && txInfo.txStatus != TxStatus.NotExecute) {
              parsedAction.result = actionInfo.status == 1 ? '成功' : `失败（${actionInfo.error}）`;
              parsedAction.gasFee = `${actionInfo.gasUsed} aft`;
              parsedAction.gasAllot = actionInfo.gasAllot;
            } else {
              parsedAction.result = '';
              parsedAction.gasFee = '';
              parsedAction.gasAllot = '';
            }
            parsedActions.push(parsedAction);
          }
          
          transaction.actions = parsedActions;
          transaction.date = txInfo.date;
          txInfos.push(transaction);
        }
        this.setState({
          txVisible: true,
          txInfos,
        });
      } else {
        this.setState({
          txVisible: true,
          txInfos: [],
        });
      }
    } catch (error) {
      console.log(error);
    }
  }
  /**
    *   1.1 如果交易是可逆的，则检查其是否已被回滚
    *     1.1.1 如果没有被回滚，则确认其是否不可逆，是的话，更新状态irreversible为不可逆
    *     1.1.2 如果被回滚，则更新状态blockStatus
    *   1.2 如果不可逆，则pass
   *  */
  updateTxStatus = async (txInfo, lastIrreveribleBlockNum, callback) => {
    if (Object.prototype.hasOwnProperty.call(txInfo, 'txStatus') && txInfo.txStatus != TxStatus.NotExecute && txInfo.txStatus != TxStatus.SendError) {   // 通过txStatus判断交易receipt是否已经获取过，条件成立则同步区块状态，否则获取交易的receipt
      if (txInfo.blockStatus == null || txInfo.blockStatus == BlockStatus.Reversible || txInfo.blockStatus == BlockStatus.Unknown) {
        if (this.state.blockRollbackCache[txInfo.blockHash] == null) {
          const blockInfo = await fractal.ft.getBlockByNum(txInfo.blockNumber);
          this.state.blockRollbackCache[txInfo.blockHash] = blockInfo.hash != txInfo.blockHash;
        }
        if (this.state.blockRollbackCache[txInfo.blockHash]) {
          txInfo.blockStatus = BlockStatus.Rollbacked;
        } else {
          txInfo.blockStatus = txInfo.blockNumber <= lastIrreveribleBlockNum ? BlockStatus.Irreversible : BlockStatus.Reversible; 
        }
      }
      callback(txInfo);
    } else {
      const receipt = await fractal.ft.getTransactionReceipt(txInfo.txHash);
      if (receipt != null) {   // 被回滚的区块所包含的交易是没有receipt的
        txInfo.blockHash = receipt.blockHash;
        txInfo.blockNumber = receipt.blockNumber;
        txInfo.actions[0].status = receipt.actionResults[0].status;
        txInfo.txStatus = receipt.actionResults[0].status == 1 ? TxStatus.ExecuteSuccess : TxStatus.ExecuteFail;
        txInfo.actions[0].gasUsed = receipt.actionResults[0].gasUsed;
        txInfo.actions[0].gasAllot = receipt.actionResults[0].gasAllot;
        txInfo.actions[0].error = receipt.actionResults[0].error;
      }
      const internalTx = await fractal.ft.getInternalTxByHash(txInfo.txHash);
      if (internalTx != null) {
        txInfo.innerActions = internalTx.actions[0].internalActions;
      } else {
        txInfo.innerActions = [];
      }
      callback(txInfo);
    }
  }

  deleteTxFromFile = (accountName) => {
    let allTxInfoSet = utils.getDataFromFile(constant.TxInfoFile);
    if (allTxInfoSet == null) {
      return;
    }
    delete allTxInfoSet[accountName];
    utils.storeDataToFile(constant.TxInfoFile, allTxInfoSet);
  }
  /** 
    * {account1:{lastBlockHash, lastBlockNum, txInfos:[{isInnerTx,txStatus,date,txHash,blockHash,blockNumber,blockStatus, actions:[ {type,from,to,assetID,value,payload,status,actionIndex,gasUsed,gasAllot: [ account,gas,typeId],error}],{...}]}}
    * 
    * 交易状态：
    * 1: 发送失败：无需更新
    * 2：发送成功，但尚未执行：需更新
    * 3：发送成功，执行成功：需检查是否被回滚
    * 4：发送成功，执行失败：需检查是否被回滚
    * 5：内部交易成功：需检查是否被回滚
    * 6：内部交易失败：需检查是否被回滚
    *
    *
    * 区块状态：
    * 1: 可逆：   1   //初始默认的状态值
    * 2：不可逆   0
    * 3：被回滚  -1
    * 
    * 同步交易的过程：
    * 1：先遍历所有已存在的交易状态
    * 2：同步新的交易，为了防止区块已经被回退，需要往前同步一些区块，譬如两轮的区块数
    * 
    * 问：如何确认区块尚未被回滚？
    * 答：通过高度获取区块，然后比较区块的hash，如果一致，则表示当前未被回滚，当然，不能排除后面被回滚的可能性
    * 
    * 问：如何确认区块状态不可逆？
    * 答：首先确认区块未被回滚，这样区块高度才是有效的，然后才能根据区块高度来确认区块不可逆。
  */
  syncTxFromNode = async () => {
    try {
      console.log('syncTxFromNode start');
      let startSyncBlockNum = 0;
      const chainId = fractal.ft.getChainId();
      let allTxInfoSet = utils.getDataFromFile(constant.TxInfoFile, chainId);
      if (allTxInfoSet == null) {
        allTxInfoSet = {};
      }
      //console.log('allTxInfoSet:' + JSON.stringify(allTxInfoSet));
      const self = this;
      fractal.ft.getCurrentBlock(false).then(async (curBlock) => {
        self.state.curBlock = curBlock;
        const curBlockNum = self.state.curBlock.number;
        const lastIrreveribleBlockNum = self.state.irreversibleInfo.proposedIrreversible;
        self.state.blockRollbackCache = {};
        // 遍历所有本地账户，从文件中获取其已有交易信息，跟链进行状态同步，并将链上新的交易写入文件
        for (const account of self.state.accountInfos) {
          const accountName = account.accountName;
          let accountExistTxs = {};
          // 对已存在本地的交易进行状态同步
          if (allTxInfoSet[accountName] != null) {                             // 在交易文件中存在某个账户的记录
            const lastSyncBlockNum = allTxInfoSet[accountName].lastBlockNum;
            const lastSyncBlockHash = allTxInfoSet[accountName].lastBlockHash;
            if (lastSyncBlockHash == null || lastSyncBlockNum == null) {
              startSyncBlockNum = 0;
            } else {
              startSyncBlockNum = allTxInfoSet[accountName].lastBlockNum + 1;     // 前一次同步到的最后一个区块高度
            }
            for (const txInfo of allTxInfoSet[accountName].txInfos) {           // 本地提取所有未发送失败的交易，并且同步其状态
              // console.log('txInfo:' + txInfo.blockNumber + "----" + JSON.stringify(txInfo));
              // console.log('**************************');
              if (txInfo.txStatus == null || txInfo.txStatus !== TxStatus.SendError) {                     // 同步所有非发送失败的交易的状态
                await self.updateTxStatus(txInfo, lastIrreveribleBlockNum, (updatedTxInfo) => {                  
                  accountExistTxs[updatedTxInfo.txHash] = updatedTxInfo; 
                  // console.log('**************************');
                });                      
              } else {
                accountExistTxs[txInfo.txHash] = txInfo;
              }
            }
          } else {  // 无此账户的历史交易数据，需要从账户创建之区块开始同步其交易
            startSyncBlockNum = account.number;
            allTxInfoSet[accountName] = {};
          }

          allTxInfoSet[accountName].lastBlockNum = curBlockNum;
          allTxInfoSet[accountName].lastBlockHash = self.state.curBlock.hash;
          allTxInfoSet[accountName].txInfos = [];

          // 从链上同步新的交易
          startSyncBlockNum -= self.state.maxRollbackBlockNum;
          if (startSyncBlockNum < 0) {
            startSyncBlockNum = 0;
          }
          // console.log('accountExistTxs:' + JSON.stringify(accountExistTxs));
          let promiseArr = [];
          let accountTxs = [];
          const step = self.state.maxRollbackBlockNum * 10;
          let blockNum = curBlockNum;
          for (; blockNum > startSyncBlockNum; blockNum -= step) {
            let lookBack = step;
            if (blockNum - startSyncBlockNum < step) {
              lookBack = blockNum - startSyncBlockNum;
            }
            promiseArr.push(fractal.ft.getTxsByAccount(accountName, blockNum, lookBack));
            // TODO 内部交易
            //accountTxs.push(fractal.ft.getInternalTxsByAccount(accountName, blockNum, lookBack));
          }

          const allTxs = await Promise.all(promiseArr);   // 获取所有交易的hash
          for (const txs of allTxs) {
            accountTxs.push(...txs);
          }
          promiseArr = [];
          let blockCache = {};
          for (const txHash of accountTxs) {
            if (accountExistTxs[txHash] == null) {
              promiseArr.push(fractal.ft.getTransactionByHash(txHash));                             
            }
          }
          const txInfos = await Promise.all(promiseArr);   // 获取所有交易详情
          promiseArr = [];
          for (let txInfo of txInfos) {
            if (blockCache[txInfo.blockHash] == null) {
              promiseArr.push(fractal.ft.getBlockByHash(txInfo.blockHash));
            }
          }
          const blocks = await Promise.all(promiseArr); // 获取所有未获取过的交易相关的区块，用于更新交易打包时间，之后再更新所有交易
          for (const block of blocks) {
            blockCache[block.hash] = block;
          }
          for (let txInfo of txInfos) {
            txInfo.date = blockCache[txInfo.blockHash].timestamp;
            txInfo.isInnerTx = 0;
            await self.updateTxStatus(txInfo, lastIrreveribleBlockNum, (updatedTxInfo) => {                  
              accountExistTxs[updatedTxInfo.txHash] = updatedTxInfo; 
            });
          }
          allTxInfoSet[accountName].txInfos.push(...Object.values(accountExistTxs));
        }
        if (!this.hasUnExecutedTx(allTxInfoSet)) {
          this.state.syncTxInterval = 60000;
        }
        //console.log('allTxInfoSet:' + JSON.stringify(allTxInfoSet));
        utils.storeDataToFile(constant.TxInfoFile, allTxInfoSet, chainId);
      });
    } catch (error) {
      if (error.message) {
        Feedback.toast.error(error.message);
      }
    }
    this.state.syncTxTimeoutId = setTimeout(() => { this.syncTxFromNode(); }, this.state.syncTxInterval);
  }

  // 同步账号所有的普通交易
  syncTxsOfAccount = async (account, curBlockNum) => {
    const self = this;
    let promiseArr = [];
    let accountTxs = [];
    let accountExistTxs = {};
    const lastIrreveribleBlockNum = self.state.irreversibleInfo.proposedIrreversible;
    const step = self.state.maxRollbackBlockNum * 10;
    let blockNum = curBlockNum;
    for (; blockNum >= account.number; blockNum -= step) {
      let lookBack = step;
      if (blockNum - account.number < step) {
        lookBack = blockNum - account.number;
      }
      promiseArr.push(fractal.ft.getTxsByAccount(account.accountName, blockNum, lookBack + 1));
      // TODO 内部交易
      //accountTxs.push(fractal.ft.getInternalTxsByAccount(accountName, blockNum, lookBack));
    }
    const allTxs = await Promise.all(promiseArr);     // 1:获取所有交易的hash
    for (const txs of allTxs) {
      accountTxs.push(...txs);
    }
    promiseArr = [];
    let blockCache = {};
    for (const txHash of accountTxs) {
      if (accountExistTxs[txHash] == null) {
        promiseArr.push(fractal.ft.getTransactionByHash(txHash));                             
      }
    }
    const txInfos = await Promise.all(promiseArr);   // 2:获取所有交易详情
    promiseArr = [];
    for (let txInfo of txInfos) {
      if (blockCache[txInfo.blockHash] == null) {
        promiseArr.push(fractal.ft.getBlockByHash(txInfo.blockHash));
      }
    }
    const blocks = await Promise.all(promiseArr);  // 3:获取所有未获取过的交易相关的区块，用于更新交易打包时间，之后再更新所有交易
    for (const block of blocks) {
      blockCache[block.hash] = block;
    }
    for (let txInfo of txInfos) {
      txInfo.date = blockCache[txInfo.blockHash].timestamp;
      txInfo.isInnerTx = 0;
      await self.updateTxStatus(txInfo, lastIrreveribleBlockNum, (updatedTxInfo) => {                  
        accountExistTxs[updatedTxInfo.txHash] = updatedTxInfo; 
      });
    }
    return Object.values(accountExistTxs);
  }

  hasUnExecutedTx = (allTxInfoSet) => {
    for (const accountInfo of Object.values(allTxInfoSet)) {
      for (const tx of accountInfo.txInfos) {
        if (tx.txStatus === TxStatus.NotExecute) {
          return true;
        }
      }
    }
    return false;
  }

  getValue = async (assetId, value) => {
    let assetInfo = this.state.assetInfos[assetId];
    if (assetInfo == null) {
      assetInfo = await fractal.account.getAssetInfoById(assetId);
    }
    let renderValue = new BigNumber(value);
    renderValue = renderValue.shiftedBy(assetInfo.decimals * -1);

    BigNumber.config({ DECIMAL_PLACES: 6 });
    renderValue = renderValue.toString(10) + assetInfo.symbol;
    return renderValue;
  }

  showInnerTxs = async (internalActions) => {
    const actions = [];
    for (const internalAction of internalActions) {
      let action = {};
      action.actionType = txParser.getActionTypeStr(internalAction.action.type);
      action.fromAccount = internalAction.action.from;
      action.toAccount = internalAction.action.to;
      action.assetId = internalAction.action.assetID;
      action.value = await this.getValue(action.assetId, internalAction.action.value);
      action.payload = internalAction.action.payload;
      actions.push(action);
    }
    this.setState({
      innerTxVisible: true,
      innerTxInfos: actions,
    })
  }

  renderInnerActions = (internalActions, index, record) => {
    return (internalActions == null || internalActions.length == 0) ? '无' : <Button type="primary" onClick={this.showInnerTxs.bind(this, internalActions)}>查看</Button>;
  }

  renderActionType = (value, index, record) => {
    const parseActions = record.actions;
    return parseActions.map((item) => {
      const defaultTrigger = <Tag type="normal" size="small">{item.actionType}</Tag>;
      return <Balloon trigger={defaultTrigger} closable={false}>{item.actionType}</Balloon>;
    });
  }
  renderDate = (value) => {
    var renderTime = new BigNumber(value);
    renderTime = renderTime.shiftedBy(6 * -1);

    return new Date(renderTime.toNumber()).toLocaleString()
  }
   
  copyValue = (value) => {
    copy(value);
    Feedback.toast.success('已复制到粘贴板');
  }

  renderHash = (value) => {
    const displayValue = value.substr(0, 6) + '...' + value.substr(value.length - 6);
    return <address title={'点击可复制'} onClick={ () => this.copyValue(value) }>{displayValue}</address>;
  }
  renderTxStatus = (value, index, record) => {
    let status = '';
    switch(value) {
      case TxStatus.SendError:
        status = <b>发送失败</b>;
        break;
      case TxStatus.NotExecute:
        status = <b>尚未执行</b>;
        break;
      case TxStatus.ExecuteFail:
      case TxStatus.InnerFail:
        status = <font color='red'><b>执行失败</b></font>;
        break;
      case TxStatus.ExecuteSuccess:
      case TxStatus.InnerSuccess:
        status = '执行成功';
        break;        
    }
    return status;
  }

  renderBlockStatus = (value, index, record) => {
    let status = '';
    const confirmBlockNum = this.state.curBlock.number - record.blockNumber;
    switch(value) {
      case BlockStatus.Rollbacked:
        return '已回滚';
      case BlockStatus.Irreversible:
        status = '不可逆';
        break;
      case BlockStatus.Reversible:
        status = '可逆';
        break;  
      case BlockStatus.Unknown:
        return '';
      default:
        return '';  
    }
    const defaultTrigger = <Tag type="normal" size="small">{status} +{confirmBlockNum}</Tag>;
    return <Balloon trigger={defaultTrigger} closable={false}>已确认区块数: {confirmBlockNum}</Balloon>;
  }

  renderDetailInfo = (value, index, record) => {
    const parseActions = record.actions;
    return parseActions.map((item) => {
      const defaultTrigger = <Tag type="normal" size="small">{item.detailInfo}</Tag>;
      return <Balloon trigger={defaultTrigger} closable={false}>{item.detailInfo}</Balloon>;
    });
  }

  renderResult = (value, index, record) => {
    const parseActions = record.actions;

    return parseActions.map((item) => {
      if (utils.isEmptyObj(item.error)) {
        return '成功';
      }
      const defaultTrigger = <Tag type="normal" size="small">失败</Tag>;
      return <Balloon trigger={defaultTrigger} closable={false}>{item.error}</Balloon>;
    });
  }

  renderGasFee = (value, index, record) => {
    const parseActions = record.actions;
    return parseActions.map((item) => {
      if (utils.isEmptyObj(item.gasFee)) {
        return '';
      }
      const defaultTrigger = <Tag type="normal" size="small">{item.gasFee}</Tag>;
      return <Balloon trigger={defaultTrigger} closable={false}>{item.gasFee}</Balloon>;
    });
  }

  renderGasAllot = (value, index, record) => {
    const parseActions = record.actions;
    if (utils.isEmptyObj(parseActions[0].gasAllot)) {
      return '';
    }
    return parseActions[0].gasAllot.map((gasAllot) => {
      let reason = '作为矿工';
      if (gasAllot.typeId === 0) {
        reason = '资产的发行者';
      } else if (gasAllot.typeId === 1) {
        reason = '合约的发行者';
      }
      const defaultTrigger = <Tag type="normal" size="small">{gasAllot.name}{reason}分到 {gasAllot.gas}aft</Tag>;
      return <Balloon trigger={defaultTrigger} closable={false}>{gasAllot.name}{reason}分到 {gasAllot.gas}aft</Balloon>;
    });
  }
  showAuthors = (index) => {
    this.setState({authorListVisible: true, authorList: this.state.accountInfos[index].authors, curAccount: this.state.accountInfos[index]});
  }
  bindNewAuthor = (index) => {
    this.setState({ bindNewAuthorVisible: true, curAccount: this.state.accountInfos[index] });
  }
  withdrawTxFee = (index) => {
    this.setState({ withdrawTxFeeVisible: true, curAccount: this.state.accountInfos[index] });
  }
  renderOperation = (value, index) => {
    return (
      <view>
        <Button type="primary" onClick={this.deleteAccount.bind(this, index)}>
          解除绑定
        </Button>
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.showAssets.bind(this, index)}>
          资产/转账
        </Button>
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.showTxs.bind(this, index)}>
          交易列表
        </Button>
        <p /><p />
        <Button type="primary" onClick={this.showAuthors.bind(this, index)}>
          权限列表
        </Button>
        {/* &nbsp;&nbsp;
        <Button type="primary" onClick={this.bindNewAuthor.bind(this, index)}>
          绑定新权限
        </Button> */}
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.withdrawTxFee.bind(this, index)}>
          手续费
        </Button>
      </view>
    );
  };

  deleteAuthor = async (index) => {
    const { threshold, updateAuthorThreshold } = this.state.curAccount;
    const { owner, weight } = this.state.authorList[index];
    const payload = '0x' + encode([threshold, updateAuthorThreshold, [UpdateAuthorType.Delete, [owner, weight]]]).toString('hex');
    this.state.txInfo = { actionType: constant.UPDATE_ACCOUNT_AUTHOR,
      accountName: this.state.curAccount.accountName,
      toAccountName: this.state.chainConfig.accountName,
      assetId: 1,
      value: 0,
      payload };

    this.setState({ txConfirmVisible: true });
  }

  updateWeight = async (index) => {
    this.state.curAuthor = this.state.authorList[index];
    this.setState({ updateWeightVisible: true })
  }
  isAccountAsOwner = (owner) => {
    return this.state.accountReg.test(owner);
  }
  renderOwner = (value) => {
    if (this.isAccountAsOwner(value)) {
      return value;
    }
    const displayValue = value.substr(0, 6) + '...' + value.substr(value.length - 6);
    return <address title={'点击可复制'} onClick={ () => this.copyValue(value) }>{displayValue}</address>;
  }
  renderAuthorOperation = (value, index) => {
    return (
      <view>
        <Button type="primary" onClick={this.deleteAuthor.bind(this, index)}>
          删除
        </Button>
        <p /><p />
        <Button type="primary" onClick={this.updateWeight.bind(this, index)}>
          修改权重
        </Button>
      </view>
    );
  };
  onAuthorListClose = () => {
    this.setState({authorListVisible: false});
  }

  onSystemCreatAccountOK = () => {
    if (!this.state.accountReg.test(this.state.fractalAccount)) {
      Feedback.toast.error('账号格式错误');
      return;
    }
    if (this.state.fractalPublicKey == '') {
      Feedback.toast.error('请选择公钥');
      return;
    }
    if (!this.state.emailReg.test(this.state.email)) {
      Feedback.toast.error('邮箱格式错误');
      return;
    }
    // this.props.createAccountBySystem({ accountName: this.state.fractalAccount, publicKey: this.state.fractalPublicKey, email: this.state.email });
  };
  onSystemCreatAccountClose = () => {
    this.setState({systemHelpVisible: false});
  }

  addAccountBySelf = () => {
    this.state.accountNames = [];
    this.state.accountInfos.map(account => this.state.accountNames.push(account.accountName));
    this.setState({ selfCreateAccountVisible: true });
  }
  onSelfCreateAccountOK = async () => {
    if (this.state.creator == '') {
      Feedback.toast.error('请选择创建者账号');
      return;
    }
    if (!this.state.accountReg.test(this.state.newAccountName)) {
      console.log(this.state.newAccountName);
      Feedback.toast.error('账号格式错误');
      return;
    }
    const exist = await fractal.account.isAccountExist(this.state.newAccountName);
    if (exist) {
      Feedback.toast.error('账号已存在，不可重复创建');
      return;
    }

    if (this.state.selfPublicKey == '' && this.state.otherPublicKey == '') {
      Feedback.toast.error('请选择或输入公钥');
      return;
    }
    let publicKey = this.state.otherPublicKey;
    if (publicKey == '') {
      publicKey = this.state.selfPublicKey;
    }
    let accountDetail = '';
    if (this.state.accountDetail != null) {
      accountDetail = this.state.accountDetail;
    }
    publicKey = utils.getPublicKeyWithPrefix(publicKey);
    if (!ethUtil.isValidPublic(Buffer.from(utils.hex2Bytes(publicKey)), true)) {
      Feedback.toast.error('无效公钥，请重新输入');
      return;
    }

    if (this.state.transferAmount == null || this.state.transferAmount == '') {
      this.state.transferAmount = 0;
    } else if (!this.state.numberReg.test(this.state.transferAmount)) {
      Feedback.toast.error('附带转账金额数有误，请重新输入');
      return;
    }
    this.state.curAccount = await fractal.account.getAccountByName(this.state.creator);

    const payload = '0x' + encode([this.state.newAccountName, this.state.creator, publicKey, accountDetail]).toString('hex');
    this.state.txInfo = { actionType: constant.CREATE_NEW_ACCOUNT,
      accountName: this.state.curAccount.accountName,
      toAccountName: this.state.chainConfig.accountName,  // fractal.account
      assetId: this.state.chainConfig.sysTokenID,  // ft
      value: new BigNumber(this.state.transferAmount).shiftedBy(this.state.chainConfig.sysTokenDecimal).toNumber(),
      payload };

    this.setState({ txConfirmVisible: true });
  };

  onSelfCreateAccountClose = () => {
    this.setState({ selfCreateAccountVisible: false });
  }
  onChangeCreatorAccount(value) {
    this.state.creator = value;
  }
  handlePasswordChange(v) {
    this.state.password = v;
  }
  handleNewAccountNameChange(v) {
    this.state.newAccountName = v;
  }
  handleNewOwnerChange(v) {
    this.state.newOwner = v;
  }
  handleWeightChange(v) {
    this.state.weight = v;
  }
  handleSelfPublicKeyChange(v) {
    this.state.selfPublicKey = v;
    if (v == this.state.inputOtherPKStr) {
      this.setState({ inputOtherPK: true });
    } else {
      this.setState({ inputOtherPK: false, otherPublicKey: '' });
    }
  }
  handleOthersPublicKeyChange(v) {
    this.state.otherPublicKey = v;
  }
  handleTAccountDetailChange(v) {
    this.state.accountDetail = v;
  }
  handleTransferAmountChange(v) {
    this.state.transferAmount = v;
  }
  handleImportAccountChange(v) {
    this.state.importAccountName = v;
  }

  handleTransferToAccountChange(v) {
    this.state.transferToAccount = v;
  }
  handleTransferValueChange(v) {
    this.state.transferValue = v;
  }
  handleGasPriceChange(v) {
    this.state.gasPrice = v;
  }
  handleGasLimitChange(v) {
    this.state.gasLimit = v;
  }

  onBindNewAuthorOK = async () => {
    const newOwner = this.state.newOwner;

    let ownerType = AuthorOwnerType.Error;
    if (ethUtil.isValidPublic(Buffer.from(utils.hex2Bytes(utils.getPublicKeyWithPrefix(newOwner))), true)) {
      ownerType = AuthorOwnerType.PublicKey;
    } else if (ethUtil.isValidAddress(newOwner) || ethUtil.isValidAddress('0x' + newOwner)) {
      ownerType = AuthorOwnerType.Address;
    } else if (this.state.accountReg.test(newOwner)) {
      ownerType = AuthorOwnerType.AccountName;
    }

    if (ownerType == AuthorOwnerType.Error) {
      Feedback.toast.error('请输入有效的账号、公钥或地址');
      return;
    }
    if (newOwner.indexOf('.') > 0 || newOwner.length <= 8) {
      const exist = await fractal.account.isAccountExist(newOwner);
      if (!exist) {
        Feedback.toast.error('账号不存在');
        return;
      }
    }
    if (this.state.weight == '') {
      Feedback.toast.error('请输入新的权重');
      return;
    }

    const { threshold, updateAuthorThreshold } = this.state.curAccount;
    const payload = '0x' + encode([threshold, updateAuthorThreshold, [[UpdateAuthorType.Add, [ownerType, newOwner, this.state.weight]]]]).toString('hex');
    this.state.txInfo = { actionType: constant.UPDATE_ACCOUNT_AUTHOR,
      accountName: this.state.curAccount.accountName,
      toAccountName: this.state.chainConfig.accountName,
      assetId: 1,
      value: 0,
      payload };

    this.setState({ txConfirmVisible: true });
  }
  onBindNewAuthorClose = () => {
    this.setState({ bindNewAuthorVisible: false });
  }

  onUpdateWeightOK = () => {
    const { threshold, updateAuthorThreshold } = this.state.curAccount;
    const { owner } = this.state.curAuthor;

    let ownerType = AuthorOwnerType.Error;
    if (ethUtil.isValidPublic(Buffer.from(utils.hex2Bytes(utils.getPublicKeyWithPrefix(owner))), true)) {
      ownerType = AuthorOwnerType.PublicKey;
    } else if (ethUtil.isValidAddress(owner) || ethUtil.isValidAddress('0x' + owner)) {
      ownerType = AuthorOwnerType.Address;
    } else if (this.state.accountReg.test(owner)) {
      ownerType = AuthorOwnerType.AccountName;
    }
    const payload = '0x' + encode([threshold, updateAuthorThreshold, [[UpdateAuthorType.Update, [ownerType, owner, this.state.weight]]]]).toString('hex');
    this.state.txInfo = { actionType: constant.UPDATE_ACCOUNT_AUTHOR,
      accountName: this.state.curAccount.accountName,
      toAccountName: this.state.chainConfig.accountName,
      assetId: 1,
      value: 0,
      payload };

    this.setState({ txConfirmVisible: true });
  }

  onUpdateWeightClose = () => {
    this.setState({ updateWeightVisible: false });
  }
  onWithdrawTxFeeOK = () => {
    
  }
  onWithdrawTxFeeClose = () => {
    this.setState({ withdrawTxFeeVisible: false });
  }
  getTxFee = async () => {
    const txFeeInfoObj = await fractal.fee.getObjectFeeByName(this.state.curAccount.accountName, this.state.txFeeType);
    //console.log(txFeeInfo);
    if (txFeeInfoObj == null) {
      Feedback.toast.prompt('无手续费信息');
    } else {
      const txFeeDetail = await this.getValue(this.state.chainConfig.sysTokenID, txFeeInfoObj.assetFees[0].remainFee);
      this.setState({ txFeeInfo : '当前可提取手续费:' + txFeeDetail });
    }
  }
  onChangeTxFeeTypeAccount = (value) => {
    this.state.txFeeType = value;
  }
  onAssetClose = () => {
    this.setState({
      assetVisible: false,
    });
  };
  symbolRender = (value) => {
    let assetInfo = this.state.assetInfos[value];
    if (assetInfo != null) {
      return assetInfo.symbol;
    }
    const self = this;
    fractal.account.getAssetInfoById(value).then(assetInfo => {
      self.state.assetInfos[value] = assetInfo;
    });
    
    return '';
  }
  balanceRender = (value, index) => {
    const { assetInfos, balanceInfos } = this.state;
    const decimals = assetInfos[balanceInfos[index].assetID].decimals;
    // var baseValue = new BigNumber(10).pow(decimals);

    let renderValue = new BigNumber(value);
    renderValue = renderValue.shiftedBy(decimals * -1);

    BigNumber.config({ DECIMAL_PLACES: 6 });
    renderValue = renderValue.toString(10);
    return renderValue;
  }
  assetRender = (value, index) => {
    return (
      <view>
        <Button type="primary" onClick={this.transfer.bind(this, index)}>
          转账
        </Button>
      </view>
    );
  };
  renderContract = (value, index) => {
    return value > 0 ? '是' : '否';
  }

  transfer = (index) => {
    const assetID = this.state.balanceInfos[index].assetID;
    const self = this;
    fractal.ft.getSuggestionGasPrice().then(gasPrice => {
      if (gasPrice > self.state.suggestionPrice) {
        self.state.suggestionPrice = gasPrice;
      }
  
      self.setState({
        transferVisible: true,
        transferAssetSymbol: self.state.assetInfos[assetID].symbol,
        curTransferAsset: self.state.assetInfos[assetID],
        curBalance: self.state.balanceInfos[index],
      });
    });
  }
  onTxConfirmOK = () => {
    if (this.state.gasPrice == '') {
      Feedback.toast.error('请输入GAS单价');
      return;
    }
    if (!this.state.gasReg.test(this.state.gasPrice)) {
      Feedback.toast.error('请输入正确GAS单价');
      return;
    }

    if (this.state.gasLimit == '') {
      Feedback.toast.error('请输入愿意支付的最多GAS数量');
      return;
    }
    if (!this.state.gasReg.test(this.state.gasLimit)) {
      Feedback.toast.error('请输入正确的GAS上限');
      return;
    }

    if (this.state.password == '') {
      Feedback.toast.error('请输入钱包密码');
      return;
    }

    const gasValue = new BigNumber(this.state.gasPrice).multipliedBy(this.state.gasLimit).shiftedBy(9);
    const maxValue = new BigNumber(this.state.curAccountFTBalance);
    if (gasValue.comparedTo(maxValue) > 0) {
      Feedback.toast.error('余额不足以支付gas费用');
      return;
    }

    const txInfo = this.state.txInfo;
    txInfo.gasAssetId = this.state.chainConfig.sysTokenID;  // ft作为gas asset
    txInfo.gasPrice = new BigNumber(this.state.gasPrice).shiftedBy(9).toNumber();
    txInfo.gasLimit = new BigNumber(this.state.gasLimit).toNumber();

    const authors = this.state.curAccount.authors;
    let threshold = this.state.curAccount.threshold;
    if (txInfo.actionType === constant.UPDATE_ACCOUNT_AUTHOR) {
      threshold = this.state.curAccount.updateAuthorThreshold;
    }
    const keystores = this.getValidKeystores(authors, threshold);
    if (keystores.length == 0) {
      Feedback.toast.error('本地权限不满足交易签名要求！');
    } else {
      let index = 0;
      let multiSigInfos = [];
      let promiseArr = [];
      for (const ethersKSInfo of keystores) {
        promiseArr.push(ethers.Wallet.fromEncryptedJson(JSON.stringify(ethersKSInfo), this.state.password));
      }
      Promise.all(promiseArr).then(wallets => {
        for (const wallet of wallets) {
          multiSigInfos.push({privateKey: wallet.privateKey, indexes: [index]});
          index++;
        }

        fractal.ft.sendMultiSigTransaction(txInfo, multiSigInfos).then(txHash => {
          this.processTxSendResult(txInfo, txHash);
        }).catch(error => {
          console.log(error);
          Feedback.toast.error('交易发送失败：' + error);
          this.addSendErrorTxToFile(txInfo);
        });
      }).catch(error => {
        console.log(error);
        Feedback.toast.error(error.message);
      });
      
      Feedback.toast.success('开始发送交易');
    }
  };

  processTxSendResult = (txInfo, txHash) => {
    if (txHash != null) {
      Feedback.toast.success('交易发送成功');

      txInfo.txHash = txHash;
      this.addSendSuccessTxToFile(txInfo);
      this.setState({syncTxInterval: 3000, transferVisible: false});
      clearTimeout(this.state.syncTxTimeoutId);
      this.state.syncTxTimeoutId = setTimeout(() => { this.syncTxFromNode(); }, this.state.syncTxInterval);
    } else {
      Feedback.toast.error('交易发送失败');
      this.addSendErrorTxToFile(txInfo);
    }
  }
  /** 
   *  const txInfo = { actionType: constant.TRANSFER,
        accountName: self.state.curAccount.accountName,
        toAccountName: self.state.transferToAccount,
        assetId: self.state.curTransferAsset.assetId,
        gasLimit: new BigNumber(self.state.gasLimit).toNumber(),
        gasPrice: new BigNumber(self.state.gasPrice).toNumber(),
        value: value.toNumber(),
        payload: '' };

    * {account1:{lastBlockHash, lastBlockNum, txInfos:[{isInnerTx,txStatus,date,txHash,blockHash,blockNumber,blockStatus, actions:[ {type,from,to,assetID,value,payload,status,actionIndex,gasUsed,gasAllot: [ account,gas,typeId],error}],{...}]}}
    */
   addSendSuccessTxToFile = (txInfo) => {
    txInfo.isInnerTx = 0;
    txInfo.txStatus = TxStatus.NotExecute;
    txInfo.date = new Date().getTime() * 1000000;
    txInfo.blockHash = '0x';
    txInfo.blockNumber = '';
    txInfo.blockStatus = BlockStatus.Unknown;
    let action = {};
    action.type = txInfo.actionType;
    action.from = txInfo.accountName;
    action.to = txInfo.toAccountName;
    action.assetID = txInfo.assetId;
    action.value = txInfo.value;
    action.payload = txInfo.payload;
    action.status = 0;
    action.actionIndex = 0;
    action.gasUsed = 0;
    action.gasAllot = [];
    txInfo.actions = [action];

    let allTxInfoSet = utils.getDataFromFile(constant.TxInfoFile);
    if (allTxInfoSet != null) {
      const accountTxInfoSet = allTxInfoSet[txInfo.accountName];
      if (accountTxInfoSet == null) {
        accountTxInfoSet = {};
        accountTxInfoSet.txInfos = [txInfo];
        allTxInfoSet[txInfo.accountName] = accountTxInfoSet;
      } else {
        accountTxInfoSet.txInfos.push(txInfo);
      }
    } else {
      allTxInfoSet = {};
      allTxInfoSet[txInfo.accountName] = {};
      allTxInfoSet[txInfo.accountName].txInfos = [txInfo];
    }
    utils.storeDataToFile(constant.TxInfoFile, allTxInfoSet);
  }
  addSendErrorTxToFile = (txInfo) => {
    txInfo.isInnerTx = 0;
    txInfo.txStatus = TxStatus.SendError;
    txInfo.date = new Date().getTime() * 1000000;
    txInfo.txHash = '0x';
    txInfo.blockHash = '0x';
    txInfo.blockNumber = '';
    txInfo.blockStatus = BlockStatus.Unknown;
    let action = {};
    action.type = txInfo.actionType;
    action.from = txInfo.accountName;
    action.to = txInfo.toAccountName;
    action.assetID = txInfo.assetId;
    action.value = txInfo.value;
    action.payload = txInfo.payload;
    action.status = 0;
    action.actionIndex = 0;
    action.gasUsed = 0;
    action.gasAllot = [];
    txInfo.actions = [action];

    let allTxInfoSet = utils.getDataFromFile(constant.TxInfoFile);
    if (allTxInfoSet != null) {
      const accountTxInfoSet = allTxInfoSet[txInfo.accountName];
      if (accountTxInfoSet == null) {
        accountTxInfoSet = {};
        accountTxInfoSet.txInfos = [txInfo];
        allTxInfoSet[txInfo.accountName] = accountTxInfoSet;
      } else {
        accountTxInfoSet.txInfos.push(txInfo);
      }
    } else {
      allTxInfoSet = {};
      allTxInfoSet[txInfo.accountName] = {};
      allTxInfoSet[txInfo.accountName].txInfos = [txInfo];
    }
    utils.storeDataToFile(constant.TxInfoFile, allTxInfoSet);
  }

  onTxConfirmClose = () => {
    this.setState({ txConfirmVisible: false });
  }
  onTransferOK = () => {
    if (this.state.transferToAccount == '') {
      Feedback.toast.error('请输入账号');
      return;
    }
    if (!this.state.accountReg.test(this.state.transferToAccount)) {
      Feedback.toast.error('账号格式错误');
      return;
    }
    const self = this;
    fractal.account.isAccountExist(this.state.transferToAccount).then(exist => {
      if (!exist) {
        Feedback.toast.error('目标账号不存在');
        return;
      }
  
      if (self.state.transferValue == '') {
        Feedback.toast.error('请输入转账金额');
        return;
      }
      if (!self.state.numberReg.test(self.state.transferValue)) {
        Feedback.toast.error('请输入正确的金额');
        return;
      }
  
      if (self.state.gasPrice == '') {
        Feedback.toast.error('请输入GAS单价');
        return;
      }
      if (!self.state.gasReg.test(self.state.gasPrice)) {
        Feedback.toast.error('请输入正确GAS单价');
        return;
      }
  
      if (self.state.gasLimit == '') {
        Feedback.toast.error('请输入愿意支付的最多GAS数量');
        return;
      }
      if (!self.state.gasReg.test(self.state.gasLimit)) {
        Feedback.toast.error('请输入正确的GAS上限');
        return;
      }
  
      if (self.state.password == '') {
        Feedback.toast.error('请输入密码');
        return;
      }
  
      const decimals = self.state.curTransferAsset.decimals;
      const value = new BigNumber(self.state.transferValue).shiftedBy(decimals);
  
      const gasValue = new BigNumber(self.state.gasPrice).multipliedBy(self.state.gasLimit).shiftedBy(9);
      const maxValue = new BigNumber(self.state.curBalance.balance);
      if (self.state.curTransferAsset.assetId === self.state.chainConfig.sysTokenID) {
        const valueAddGasFee = value.plus(gasValue);
  
        if (valueAddGasFee.comparedTo(maxValue) > 0) {
          Feedback.toast.error('余额不足');
          return;
        }
      } else {
        if (value.comparedTo(maxValue) > 0) {
          Feedback.toast.error('余额不足');
          return;
        }
        const ftValue = new BigNumber(self.state.curAccountFTBalance);
        if (gasValue.comparedTo(ftValue) > 0) {
          Feedback.toast.error('FT余额不足，可能无法支付足够GAS费');
          return;
        }
      }
      const transferAssetId = self.state.curTransferAsset.assetId;
      const transferInfo = { actionType: constant.TRANSFER,
        accountName: self.state.curAccount.accountName,
        toAccountName: self.state.transferToAccount,
        assetId: transferAssetId == null ? 0 : transferAssetId,
        gasLimit: new BigNumber(self.state.gasLimit).toNumber(),
        gasPrice: new BigNumber(self.state.gasPrice).shiftedBy(9).toNumber(),
        value: new BigNumber(value).toNumber(),
        payload: '' };
  
      const authors = self.state.curAccount.authors;
      const threshold = self.state.curAccount.threshold;
      const keystores = self.getValidKeystores(authors, threshold);
      if (keystores.length == 0) {
        Feedback.toast.error('本地不满足交易签名要求！');
      } else {
        let index = 0;
        let multiSigInfos = [];
        let promiseArr = [];
        for (const ethersKSInfo of keystores) {
          promiseArr.push(ethers.Wallet.fromEncryptedJson(JSON.stringify(ethersKSInfo), this.state.password));
        }
        Promise.all(promiseArr).then(wallets => {
          for (const wallet of wallets) {
            multiSigInfos.push({privateKey: wallet.privateKey, indexes: [index]});
            index++;
          }

          fractal.ft.sendMultiSigTransaction(transferInfo, multiSigInfos).then(txHash => {
            this.processTxSendResult(transferInfo, txHash);
          }).catch(error => {
            console.log(error);
            Feedback.toast.error('交易发送失败：' + error);
            this.addSendErrorTxToFile(transferInfo);
          });
        }).catch(error => {
          console.log(error);
          Feedback.toast.error(error.message);
        });
        
        Feedback.toast.success('开始发送交易');
      }
    })
    
  };
  getValidKeystores = (authors, threshold) => {
    let keystoreInfo = {};
    for (const keystore of this.state.keystoreList) {
      keystoreInfo[keystore.address] = keystore;
    }

    let totalWeight = 0;
    let myKeystores = [];
    for (const author of authors) {
      const owner = author.owner;
      const buffer = Buffer.from(utils.hex2Bytes(owner));
      let address = '0x';
      if (ethUtil.isValidPublic(buffer, true)) {
        address = ethUtil.bufferToHex(ethUtil.pubToAddress(owner, true));
      } else if (ethUtil.isValidAddress(owner)) {
        address = ethUtil.bufferToHex(buffer);
      }
      if (address.startsWith('0x')) {
        address = address.substr(2);
      }
      if (keystoreInfo[address] != null) {
        totalWeight += author.weight;
        myKeystores.push(keystoreInfo[address]);
        if (totalWeight >= threshold) {
          break;
        }
      }
    }
    return totalWeight < threshold ? [] : myKeystores;
  }
  onTransferClose = () => {
    this.setState({
      transferVisible: false,
    });
  }

  onTxClose = () => {
    this.setState({
      txVisible: false,
    });
  };

  onInnerTxClose = () => {
    this.setState({
      innerTxVisible: false,
    });
  };


  onSort(dataIndex, order) {
    const txInfos = this.state.txInfos.sort((a, b) => {
      const result = a[dataIndex] - b[dataIndex];
      return (order === 'asc') ? (result > 0 ? 1 : -1) : (result > 0 ? -1 : 1);
    });
    this.setState({
      txInfos,
    });
  }

  render() {
    return (
      <div className="editable-table">
        <IceContainer>
          <Table primaryKey="accountName" dataSource={this.state.accountInfos} hasBorder={false} isLoading={this.state.isLoading}>
            <Table.Column
              width={80}
              title="账号"
              dataIndex="accountName"
            />
            <Table.Column
              width={80}
              title="创建者"
              dataIndex="founder"
            />
            <Table.Column
              width={100}
              title="权限交易阈值"
              dataIndex="updateAuthorThreshold"
            />
            <Table.Column
              width={100}
              title="普通交易阈值"
              dataIndex="threshold"
            />
            <Table.Column
              width={80}
              title="区块高度"
              dataIndex="number"
            />
            <Table.Column
              width={80}
              title="合约账户"
              dataIndex="codeSize"
              cell={this.renderContract.bind(this)}
            />
            <Table.Column title="操作" width={500} cell={this.renderOperation} />
          </Table>
          {/* <div onClick={this.addAccountBySystem.bind(this)} style={styles.addNewItem}>
            + 新增账户(第三方免费帮您创建)
          </div> */}
          <div onClick={this.addAccountBySelf.bind(this)} style={styles.addNewItem}>
            + 新增账户
          </div>
          <div onClick={this.onImportAccount.bind(this)} style={styles.addNewItem}>
            + 导入账户
          </div>
        </IceContainer>
        {/* <Dialog
          visible={this.props.systemHelpVisible}
          onOk={this.onSystemCreatAccountOK.bind(this)}
          onCancel={() => this.onSystemCreatAccountClose.bind(this)}
          onClose={() => this.onSystemCreatAccountClose.bind(this)}
          title="账户创建"
          footerAlign="center"
        >
          <Input hasClear
            onChange={this.handleFractalAccountNameChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="待创建账号"
            size="medium"
            defaultValue=""
            maxLength={16}
            hasLimitHint
            placeholder="由a-z0-9组成，长度8~16位"
          />
          <br />
          <br />
          <Select
            style={{ width: 400 }}
            placeholder="选择公钥，此公钥将同账户绑定，账户所有者有权更换"
            onChange={this.handleFractalPublicKeyChange.bind(this)}
            label="公钥："
          >
            {
            this.props.keystoreList.map((keystore) => (
              <Select.Option value={keystore.publicKey} label={keystore.publicKey}>
                {keystore.publicKey}
              </Select.Option>
            ))
          }
          </Select>
          <br />
          <br />
          <Input hasClear
            onChange={this.handleEmailChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="邮箱"
            size="medium"
            defaultValue=""
            maxLength={34}
            hasLimitHint
          />
        </Dialog> */}
        <Dialog
          visible={this.state.selfCreateAccountVisible}
          onOk={this.onSelfCreateAccountOK.bind(this)}
          onCancel={this.onSelfCreateAccountClose.bind(this)}
          onClose={this.onSelfCreateAccountClose.bind(this)}
          title="账户创建"
          footerAlign="center"
        >
          <Select
            style={{ width: 400 }}
            placeholder="选择您拥有的账户(此账户用于创建新账户)"
            onChange={this.onChangeCreatorAccount.bind(this)}
            dataSource={this.state.accountNames}
          />
          <br />
          <br />
          <Input hasClear
            onChange={this.handleNewAccountNameChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="待创建账号"
            size="medium"
            defaultValue=""
            maxLength={25}
            hasLimitHint
            placeholder="由a-z0-9.组成，长度8~25位"
          />
          <br />
          <br />

          <Select
            style={{ width: 400 }}
            placeholder="选择绑定本地已有公钥或在下面输入其它公钥"
            onChange={this.handleSelfPublicKeyChange.bind(this)}
          >
            {
            [...this.state.keystoreList, { publicKey: this.state.inputOtherPKStr }].map((keystore) => (
              <Select.Option value={keystore.publicKey} label={keystore.publicKey}>
                {keystore.publicKey}
              </Select.Option>
            ))
          }

          </Select>
          <br />
          <br />
          <Input hasClear
            onChange={this.handleOthersPublicKeyChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="其它公钥"
            size="medium"
            defaultValue=""
            maxLength={132}
            hasLimitHint
            disabled={!this.state.inputOtherPK}
            placeholder="若此处填入公钥，创建时将以此公钥为准"
          />
          <br />
          <br />
          <Input hasClear
            onChange={this.handleTAccountDetailChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="账号描述"
            size="medium"
            defaultValue=""
            maxLength={255}
            hasLimitHint
          />
          <br />
          <br />
          <Input hasClear
            onChange={this.handleTransferAmountChange.bind(this)}
            onPressEnter={this.onSelfCreateAccountOK.bind(this)}
            style={{ width: 400 }}
            addonBefore="附带转账金额(单位:FT)"
            size="medium"
            defaultValue=""
            maxLength={10}
            hasLimitHint
            placeholder="创建新账号的同时，可向此账号转账，默认为0"
          />
        </Dialog>

        <Dialog
          visible={this.state.bindNewAuthorVisible}
          onOk={this.onBindNewAuthorOK.bind(this)}
          onCancel={this.onBindNewAuthorClose.bind(this)}
          onClose={this.onBindNewAuthorClose.bind(this)}
          title="绑定新的权限拥有者"
          footerAlign="center"
        >
          <Input hasClear
            onChange={this.handleNewOwnerChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="权限拥有者"
            size="medium"
            defaultValue=""
            maxLength={133}
            hasLimitHint
            placeholder='可输入账户名/公钥/地址'
          />
          <br />
          <br />
          权重:
          <NumberPicker
            onChange={this.handleWeightChange.bind(this)}
            style={{ width: 400 }}
            step={1}
            inputWidth={"350px"} 
          />
        </Dialog>

        <Dialog
          visible={this.state.updateWeightVisible}
          onOk={this.onUpdateWeightOK.bind(this)}
          onCancel={this.onUpdateWeightClose.bind(this)}
          onClose={this.onUpdateWeightClose.bind(this)}
          title="更新权重"
          footerAlign="center"
        >
          <NumberPicker
            onChange={this.handleWeightChange.bind(this)}
            style={{ width: 400 }}
            step={1}
            inputWidth={"350px"} 
          />
        </Dialog>
        <Dialog
          visible={this.state.withdrawTxFeeVisible}
          onOk={this.onWithdrawTxFeeOK.bind(this)}
          onCancel={this.onWithdrawTxFeeClose.bind(this)}
          onClose={this.onWithdrawTxFeeClose.bind(this)}
          title="提取手续费"
          footerAlign="center"
          footer={this.state.withdrawFooter}
        >
          <Select
            style={{ width: 400 }}
            placeholder="选择手续费类型"
            onChange={this.onChangeTxFeeTypeAccount.bind(this)}
            dataSource={this.state.txFeeTypes}
          />
          <p />
          {this.state.txFeeInfo}
        </Dialog>
        <Dialog
          visible={this.state.importAccountVisible}
          title="导入账户"
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onImportAccountOK.bind(this)}
          onCancel={this.onImportAccountClose.bind(this)}
          onClose={this.onImportAccountClose.bind(this)}
        >
          <Input hasClear
            onChange={this.handleImportAccountChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="账号"
            size="medium"
            defaultValue=""
            maxLength={16}
            hasLimitHint
            onPressEnter={this.onImportAccountOK.bind(this)}
          />
        </Dialog>
        <Dialog
          style={{ width: 450 }}
          visible={this.state.authorListVisible}
          title="权限拥有者列表"
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onAuthorListClose.bind(this)}
          onCancel={this.onAuthorListClose.bind(this)}
          onClose={this.onAuthorListClose.bind(this)}
          footer={this.state.authorListFooter}
        >
          <div className="editable-table">
            <IceContainer>
              <Table primaryKey="owner" dataSource={this.state.authorList} hasBorder={false} resizable>
                <Table.Column title="所有者" dataIndex="owner" width={100} cell={this.renderOwner.bind(this)}/>
                <Table.Column title="权重" dataIndex="weight" width={100} />
                <Table.Column title="操作" width={150} cell={this.renderAuthorOperation.bind(this)} />
              </Table>
            </IceContainer>
          </div>
        </Dialog>

        <Dialog
          style={{ width: 450 }}
          visible={this.state.assetVisible}
          title="资产信息"
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onAssetClose.bind(this)}
          onCancel={this.onAssetClose.bind(this)}
          onClose={this.onAssetClose.bind(this)}
        >
          <div className="editable-table">
            <IceContainer>
              <Table primaryKey="assetID" dataSource={this.state.balanceInfos} hasBorder={false} resizable>
                <Table.Column title="资产ID" dataIndex="assetID" width={100} />
                <Table.Column title="资产符号" dataIndex="assetID" width={100} cell={this.symbolRender.bind(this)} />
                <Table.Column title="可用金额" dataIndex="balance" width={100} cell={this.balanceRender.bind(this)} />
                <Table.Column title="操作" width={150} cell={this.assetRender.bind(this)} />
              </Table>
            </IceContainer>
          </div>
        </Dialog>

        <Dialog
          style={{ width: 1200 }}
          visible={this.state.txVisible}
          title="交易信息"
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onTxClose.bind(this)}
          onCancel={this.onTxClose.bind(this)}
          onClose={this.onTxClose.bind(this)}
        >
          <div className="editable-table">
            <IceContainer>
              <Table primaryKey="date" dataSource={this.state.txInfos} hasBorder={false} resizable onSort={this.onSort.bind(this)} isZebra={true}>
                <Table.Column title="时间" dataIndex="date" width={65} cell={this.renderDate.bind(this)} sortable />
                <Table.Column title="交易Hash" dataIndex="txHash" width={60} cell={this.renderHash.bind(this)} />
                <Table.Column title="交易状态" dataIndex="txStatus" width={50} cell={this.renderTxStatus.bind(this)} />
                <Table.Column title="区块Hash" dataIndex="blockHash" width={60} cell={this.renderHash.bind(this)} />
                <Table.Column title="区块高度" dataIndex="blockNumber" width={50} sortable />
                <Table.Column title="区块状态" dataIndex="blockStatus" width={100} cell={this.renderBlockStatus.bind(this)} />
                <Table.Column title="内部交易" dataIndex="innerActions" width={80} cell={this.renderInnerActions.bind(this)} />

                <Table.Column title="类型" dataIndex="parsedActions" width={80} cell={this.renderActionType.bind(this)} />
                <Table.Column title="详情" dataIndex="parsedActions" width={100} cell={this.renderDetailInfo.bind(this)} />
                {/* <Table.Column title="Action结果" dataIndex="parsedActions" width={80} cell={this.renderResult.bind(this)} /> */}
                <Table.Column title="总手续费" dataIndex="parsedActions" width={80} cell={this.renderGasFee.bind(this)} />
                <Table.Column title="手续费分配详情" dataIndex="parsedActions" width={150} cell={this.renderGasAllot.bind(this)} />
              </Table>
            </IceContainer>
          </div>
        </Dialog>
        <Dialog
          style={{ width: 800 }}
          visible={this.state.innerTxVisible}
          title="内部交易信息"
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onInnerTxClose.bind(this)}
          onCancel={this.onInnerTxClose.bind(this)}
          onClose={this.onInnerTxClose.bind(this)}
        >
          <div className="editable-table">
            <IceContainer>
              <Table dataSource={this.state.innerTxInfos} hasBorder={false} resizable>
                <Table.Column title="类型" dataIndex="actionType" width={80} />
                <Table.Column title="发起账号" dataIndex="fromAccount" width={100} />
                <Table.Column title="接收账号" dataIndex="toAccount" width={80} />
                <Table.Column title="资产ID" dataIndex="assetId" width={80} />
                <Table.Column title="金额" dataIndex="value" width={80} />
                <Table.Column title="额外信息" dataIndex="payload" width={150} />
              </Table>
            </IceContainer>
          </div>
        </Dialog>
        <Dialog
          visible={this.state.transferVisible}
          title="转账"
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onTransferOK.bind(this)}
          onCancel={this.onTransferClose.bind(this)}
          onClose={this.onTransferClose.bind(this)}
        >
          <Input hasClear
            onChange={this.handleTransferToAccountChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="收款账号"
            size="medium"
            defaultValue=""
            maxLength={16}
            hasLimitHint
          />
          <br />
          <br />
          <Input hasClear
            onChange={this.handleTransferValueChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="金额"
            addonAfter={this.state.transferAssetSymbol}
            size="medium"
            hasLimitHint
          />
          <br />
          <br />
          <Input hasClear
            onChange={this.handleGasPriceChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="GAS单价"
            addonAfter="gaft"
            size="medium"
            placeholder={`建议值：${this.state.suggestionPrice}`}
            hasLimitHint
          />
          <br />
          1gaft = 10<sup>-9</sup>ft = 10<sup>9</sup>aft
          <br />
          <br />
          <Input hasClear
            onChange={this.handleGasLimitChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="GAS数量上限"
            size="medium"
            hasLimitHint
          />
          <br />
          <br />
          <Input hasClear
            htmlType="password"
            onChange={this.handlePasswordChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="钱包密码"
            size="medium"
            defaultValue=""
            maxLength={20}
            hasLimitHint
            onPressEnter={this.onTransferOK.bind(this)}
          />
        </Dialog>
        <Dialog
          visible={this.state.txConfirmVisible}
          title="交易确认"
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onTxConfirmOK.bind(this)}
          onCancel={this.onTxConfirmClose.bind(this)}
          onClose={this.onTxConfirmClose.bind(this)}
        >
          <Input hasClear
            onChange={this.handleGasPriceChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="GAS单价"
            addonAfter="gaft"
            size="medium"
            placeholder={`建议值：${this.state.suggestionPrice}`}
            hasLimitHint
          />
          <br />
          1gaft = 10<sup>-9</sup>ft = 10<sup>9</sup>aft
          <br />
          <br />
          <Input hasClear
            onChange={this.handleGasLimitChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="GAS数量上限"
            size="medium"
            hasLimitHint
          />
          <br />
          <br />
          <Input hasClear
            htmlType="password"
            onChange={this.handlePasswordChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="钱包密码"
            size="medium"
            defaultValue=""
            maxLength={20}
            hasLimitHint
            onPressEnter={this.onTxConfirmOK.bind(this)}
          />
        </Dialog>
      </div>
    );
  }
}

const styles = {
  addNewItem: {
    background: '#F5F5F5',
    height: 32,
    lineHeight: '32px',
    marginTop: 20,
    cursor: 'pointer',
    textAlign: 'center',
  },
};