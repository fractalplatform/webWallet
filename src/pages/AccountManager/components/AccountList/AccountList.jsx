import React, { Component } from 'react';
import IceContainer from '@icedesign/container';
import { Table, Button, Select, Input, Dialog, Feedback, NumberPicker } from '@icedesign/base';
import { Tag, Balloon } from '@alifd/next';

import BigNumber from 'bignumber.js';
import * as fractal from 'fractal-web3';
import * as ethUtil from 'ethereumjs-util';
import copy from 'copy-to-clipboard';

import { encode } from 'rlp';
import './AccountList.scss';

import * as txParser from '../../../../utils/transactionParser';
import * as utils from '../../../../utils/utils'; 
import { T } from '../../../../utils/lang'; 
import * as Constant from '../../../../utils/constant';
import TxSend from "../../../TxSend";

//const UpdateAuthorType = { Add: 0, Update: 1, Delete: 2};
const AuthorOwnerType = { Error: -1, AccountName: 0, PublicKey: 1, Address: 2 };
const TxFeeType = { Asset:0, Contract:1, Coinbase:2 };
const AuthorUpdateStatus = { Add: 0, Modify: 1, Delete: 2, Normal: 3 };

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
      accountReg: new RegExp('^([a-z][a-z0-9]{6,15})(?:\.([a-z0-9]{2,16})){0,1}(?:\.([a-z0-9]{2,16})){0,1}$'),
      numberReg: new RegExp('^[0-9][0-9]*(\\.[0-9]*){0,1}$'),
      idReg: new RegExp('^[1-9][0-9]*'),
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
      curAccount: {accountName: ''},
      txInfo: {},
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
      accountIndex: 0,
      inputOtherPK: false,
      inputOtherPKStr: T('输入其它公钥'),
      dposInfo: {},
      chainConfig: {},
      irreversibleInfo: {},
      maxTxSyncBlockNum: 10000,
      maxRollbackBlockNum: 0,
      maxRollbackTime: 0,  // ms
      importAccountVisible: false,
      authorListVisible: false,
      selfCreateAccountVisible: props.location != null ? props.location.state.selfCreateAccountVisible : false,
      bindNewAuthorVisible: false,
      updateWeightVisible: false,
      modifyThresholdVisible: false,
      transferVisible: false,
      innerTxVisible: false,
      withdrawTxFeeVisible: false,
      txSendVisible: false,
      contractInfoVisible: false,
      contractByteCodeVisible: false,
      originalABI: '',
      inputAssetName: false,
      accountInfos: [],
      authorList: [],
      accountNames: [],
      keystoreList: [],
      blockRollbackCache: {},
      curBlock: null,
      syncTxInterval: 60000,
      syncTxTimeoutId: 0,
      innerTxInfos: [],
      txFeeTypes: [{value:TxFeeType.Asset, label:T('资产')}, {value:TxFeeType.Contract, label:T('合约')}, {value:TxFeeType.Coinbase, label:T('挖矿')}],
      feeTypeName: T('名称'),
      withdrawFooter: (<view>
                        <Button type='primary' onClick={this.onWithdrawTxFeeOK.bind(this)}>{T('提取')}</Button>
                        <Button type='normal' onClick={this.getTxFee.bind(this)}>{T('查询')}</Button>
                       </view>),
      authorListFooter: (<view>
                        <Button type='primary' onClick={this.submitAllAuthorUpdate.bind(this)}>{T('提交所有修改')}</Button>
                      </view>),
      txListFooter: (<view>
                        <Button type='primary' onClick={this.onUpdateTx.bind(this)}>{T('刷新')}</Button>
                        <Button type='normal' onClick={this.onTxClose.bind(this)}>{T('取消')}</Button>
                      </view>),
      txFeeInfo: '',
      helpVisible: false,
      thresholdTypes: [{value: 1, label:T('普通交易所需阈值')}, {value: 2, label:T('修改权限所需阈值')}],
    };
  }

  componentDidMount = async () => {
    try {
      fractal.dpos.getDposInfo().then(dposInfo => this.state.dposInfo = dposInfo);
      //fractal.ft.getChainConfig().then(chainConfig => this.state.chainConfig = chainConfig);
      this.state.chainConfig = await fractal.ft.getChainConfig();
      fractal.ft.setChainId(this.state.chainConfig.chainId);
      this.state.chainConfig.sysTokenID = 0;
      const assetInfo = await fractal.account.getAssetInfoById(this.state.chainConfig.sysTokenID);
      this.state.assetInfos[this.state.chainConfig.sysTokenID] = assetInfo;
      this.state.maxRollbackBlockNum = this.state.dposInfo.blockFrequency * this.state.dposInfo.candidateScheduleSize;
      this.state.maxRollbackTime = this.state.maxRollbackBlockNum * this.state.dposInfo.blockInterval;
      fractal.dpos.getDposIrreversibleInfo().then(irreversibleInfo => this.state.irreversibleInfo = irreversibleInfo);

      this.state.keystoreList = utils.loadKeystoreFromLS();
      utils.loadAccountsFromLS().then(accountInfos => { 
        this.setState({ accountInfos }); 
      });
      this.syncTxFromNode();
    } catch (error) {
      Feedback.toast.error(error.message || error);
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
    utils.storeDataToFile(Constant.AccountFile, accounts);
  }

  onImportAccount = () => {
    this.setState({ importAccountVisible: true });
  }
  onApplyForAccount = () => {
    Feedback.toast.success(T('请在公链电报群中申请账号'));
  }
  onImportAccountOK = async () => {
    if (this.state.importAccountName == '') {
      Feedback.toast.error(T('请输入账号'));
      return;
    }
    if (!this.state.accountReg.test(this.state.importAccountName) && !this.state.idReg.test(this.state.importAccountName)) {
      Feedback.toast.error(T('账号格式错误'));
      return;
    }
    const self = this;
    if (this.state.idReg.test(this.state.importAccountName)) {
      const accountId = parseInt(this.state.importAccountName);
      for (const account of this.state.accountInfos) {
        if (account.accountID == accountId) {
          Feedback.toast.error(T('账号已存在，不可重复导入!'));
          return;
        }
      }
  
      try {
        fractal.account.getAccountById(accountId).then(account => {
          if (account != null) {
            const accountInfos = [...self.state.accountInfos, account];
            self.setState({ accountInfos, importAccountVisible: false });
            self.saveAccountsToLS();
          } else {
            Feedback.toast.error(T('账户不存在'));
          }
        });
      } catch (error) {
        Feedback.toast.error(error);
      }
    } else {
      for (const account of this.state.accountInfos) {
        if (account.accountName == this.state.importAccountName) {
          Feedback.toast.error(T('账号已存在，不可重复导入!'));
          return;
        }
      }
  
      try {
        fractal.account.getAccountByName(this.state.importAccountName).then(account => {
          if (account != null) {
            const accountInfos = [...self.state.accountInfos, account];
            self.setState({ accountInfos, importAccountVisible: false });
            self.saveAccountsToLS();
          } else {
            Feedback.toast.error(T('账户不存在'));
          }
        });
      } catch (error) {
        Feedback.toast.error(error);
      }
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
      if (balance.assetID === 0) {
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
      this.state.accountIndex = index;
      this.state.curBlock = await fractal.ft.getCurrentBlock(false);
      this.state.curAccount = this.state.accountInfos[index];
      for (const balance of this.state.accountInfos[index].balances) {
        if (this.state.assetInfos[balance.assetID] == null) {
          const assetInfo = await fractal.account.getAssetInfoById(balance.assetID);
          this.state.assetInfos[balance.assetID] = assetInfo;
        }
      }

      let allTxInfoSet = utils.getDataFromFile(Constant.TxInfoFile);
      if (allTxInfoSet != null) {
        let accountTxInfoSet = allTxInfoSet[this.state.curAccount.accountName];
        if (accountTxInfoSet == null) {   // 如果在本地不存在此账号的交易信息，则从链上同步其所有交易
          await fractal.ft.getCurrentBlock(false).then(async (curBlock) => {
            const accountTxs = await this.syncTxsOfAccount(this.state.curAccount, curBlock.number);
            allTxInfoSet[this.state.curAccount.accountName] = { txInfos: accountTxs };
            utils.storeDataToFile(Constant.TxInfoFile, allTxInfoSet);
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
            if (actionInfo.error != '') {
              console.log(actionInfo);
            }
            const parsedAction = txParser.parseAction(actionInfo, this.state.assetInfos[actionInfo.assetID], this.state.assetInfos, this.state.dposInfo);
            if (txInfo.txStatus != Constant.TxStatus.SendError && txInfo.txStatus != Constant.TxStatus.NotExecute) {
              parsedAction.result = actionInfo.status == 1 ? T('成功') : `${T('失败')}（${actionInfo.error}）`;
              parsedAction.gasFee = actionInfo.gasUsed;
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
          txSendVisible: false,
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
    if (Object.prototype.hasOwnProperty.call(txInfo, 'txStatus') && txInfo.txStatus != Constant.TxStatus.NotExecute && txInfo.txStatus != Constant.TxStatus.SendError) {   // 通过txStatus判断交易receipt是否已经获取过，条件成立则同步区块状态，否则获取交易的receipt
      if (txInfo.blockStatus == null || txInfo.blockStatus == Constant.BlockStatus.Reversible || txInfo.blockStatus == Constant.BlockStatus.Unknown) {
        if (this.state.blockRollbackCache[txInfo.blockHash] == null) {
          const blockInfo = await fractal.ft.getBlockByNum(txInfo.blockNumber);
          this.state.blockRollbackCache[txInfo.blockHash] = blockInfo.hash != txInfo.blockHash;
        }
        if (this.state.blockRollbackCache[txInfo.blockHash]) {
          txInfo.blockStatus = Constant.BlockStatus.Rollbacked;
        } else {
          txInfo.blockStatus = txInfo.blockNumber <= lastIrreveribleBlockNum ? Constant.BlockStatus.Irreversible : Constant.BlockStatus.Reversible; 
        }
      }
      callback(txInfo);
    } else {
      const receipt = await fractal.ft.getTransactionReceipt(txInfo.txHash);
      if (receipt != null) {   // 被回滚的区块所包含的交易是没有receipt的
        txInfo.blockHash = receipt.blockHash;
        txInfo.blockNumber = receipt.blockNumber;
        txInfo.actions[0].status = receipt.actionResults[0].status;
        txInfo.txStatus = receipt.actionResults[0].status == 1 ? Constant.TxStatus.ExecuteSuccess : Constant.TxStatus.ExecuteFail;
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
    let allTxInfoSet = utils.getDataFromFile(Constant.TxInfoFile);
    if (allTxInfoSet == null) {
      return;
    }
    delete allTxInfoSet[accountName];
    utils.storeDataToFile(Constant.TxInfoFile, allTxInfoSet);
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
      let allTxInfoSet = utils.getDataFromFile(Constant.TxInfoFile, chainId);
      if (allTxInfoSet == null) {
        allTxInfoSet = {};
      }
      //console.log('allTxInfoSet:' + JSON.stringify(allTxInfoSet));
      const self = this;
      fractal.ft.getCurrentBlock(false).then(async (curBlock) => {
        self.state.curBlock = curBlock;
        const curBlockNum = self.state.curBlock.number;
        const lastIrreveribleBlockNum = self.state.irreversibleInfo.bftIrreversible;
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
              if (txInfo.txStatus == null || txInfo.txStatus !== Constant.TxStatus.SendError) {                     // 同步所有非发送失败的交易的状态
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
          if (startSyncBlockNum < curBlockNum - self.state.maxTxSyncBlockNum) {
            startSyncBlockNum = curBlockNum - self.state.maxTxSyncBlockNum;
            if (startSyncBlockNum < 0) {
              startSyncBlockNum = 0;
            }
          }
          // console.log('accountExistTxs:' + JSON.stringify(accountExistTxs));
          let promiseArr = [];
          let accountInternalTxPromiseArr = [];
          const step = self.state.maxRollbackBlockNum;
          let blockNum = curBlockNum;
          for (; blockNum > startSyncBlockNum; blockNum -= step) {
            let lookBack = step;
            if (blockNum - startSyncBlockNum < step) {
              lookBack = blockNum - startSyncBlockNum;
            }
            promiseArr.push(fractal.ft.getTxsByAccount(accountName, blockNum, lookBack));
            // 内部交易
            accountInternalTxPromiseArr.push(fractal.ft.getInternalTxsByAccount(accountName, blockNum, lookBack));
          }

          let accountTxs = [];
          const allTxs = await Promise.all(promiseArr);   // 获取所有交易的hash
          const allInternalTxs = await Promise.all(accountInternalTxPromiseArr);   // 获取所有内部交易信息，里面包含了txhash
          for (const txsInfo of allTxs) {
            accountTxs.push(...txsInfo.txs);
          }
          for (const internalTxs of allInternalTxs) {
            internalTxs.map(internalTx => {
              accountTxs.push(internalTx.txhash);
            });
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
        utils.storeDataToFile(Constant.TxInfoFile, allTxInfoSet, chainId);
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
    const lastIrreveribleBlockNum = self.state.irreversibleInfo.bftIrreversible;
    const step = self.state.maxRollbackBlockNum;
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
        if (tx.txStatus === Constant.TxStatus.NotExecute) {
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

    let decimalPlaces = assetInfo.decimals > 6 ? 6 : assetInfo.decimals;
    if (renderValue.comparedTo(new BigNumber(0.000001)) < 0) {
      decimalPlaces = assetInfo.decimals;
    }

    BigNumber.config({ DECIMAL_PLACES: decimalPlaces });
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
    return (internalActions == null || internalActions.length == 0) ? T('无') : <Button type="primary" onClick={this.showInnerTxs.bind(this, internalActions)}>{T('查看')}</Button>;
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
    Feedback.toast.success(T('已复制到粘贴板'));
  }

  renderHash = (value) => {
    const displayValue = value.substr(0, 6) + '...' + value.substr(value.length - 6);
    return <address title={T('点击可复制')} onClick={ () => this.copyValue(value) }>{displayValue}</address>;
  }
  renderTxStatus = (value, index, record) => {
    let status = '';
    switch(value) {
      case Constant.TxStatus.SendError:
        status = <b>{T('发送失败')}</b>;
        break;
      case Constant.TxStatus.NotExecute:
        status = <b>{T('尚未执行')}</b>;
        break;
      case Constant.TxStatus.ExecuteFail:
      case Constant.TxStatus.InnerFail:
        const defaultTrigger = <font color='red'><b>{T('执行失败')}</b></font>;
        status = <Balloon trigger={defaultTrigger} closable={false}>{record.actions[0].error}</Balloon>;
        break;
      case Constant.TxStatus.ExecuteSuccess:
      case Constant.TxStatus.InnerSuccess:
        status = T('执行成功');
        break;        
    }
    return status;
  }

  renderBlockStatus = (value, index, record) => {
    let status = '';
    const confirmBlockNum = this.state.curBlock.number - record.blockNumber;
    switch(value) {
      case Constant.BlockStatus.Rollbacked:
        return T('已回滚');
      case Constant.BlockStatus.Irreversible:
        status = T('不可逆');
        break;
      case Constant.BlockStatus.Reversible:
        status = T('可逆');
        break;  
      case Constant.BlockStatus.Unknown:
        return '';
      default:
        return '';  
    }
    const defaultTrigger = <Tag type="normal" size="small">{status} +{confirmBlockNum}</Tag>;
    return <Balloon trigger={defaultTrigger} closable={false}>{T('已确认区块数')}: {confirmBlockNum}</Balloon>;
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
        return T('成功');
      }
      const defaultTrigger = <Tag type="normal" size="small">{T('失败')}</Tag>;
      return <Balloon trigger={defaultTrigger} closable={false}>{item.error}</Balloon>;
    });
  }

  renderGasFee = (value, index, record) => {
    const parseActions = record.actions;
    return parseActions.map((item) => {
      if (utils.isEmptyObj(item.gasFee)) {
        return '';
      }
      const earnedGasFee = utils.getGasEarned(record.gasPrice, item.gasFee, this.state.assetInfos[record.gasAssetID]) + 'ft';
      const defaultTrigger = <Tag type="normal" size="small">{earnedGasFee}</Tag>;
      return <Balloon trigger={defaultTrigger} closable={false}>{earnedGasFee}</Balloon>;
    });
  }

  renderGasAllot = (value, index, record) => {
    const parseActions = record.actions;
    if (utils.isEmptyObj(parseActions[0].gasAllot)) {
      return '';
    }
    return parseActions[0].gasAllot.map((gasAllot) => {
      let reason = T('作为矿工');
      if (gasAllot.typeId === 0) {
        reason = T('资产的发行者');
      } else if (gasAllot.typeId === 1) {
        reason = T('合约的发行者');
      }
      const earnedGasFee = utils.getGasEarned(record.gasPrice, gasAllot.gas, this.state.assetInfos[record.gasAssetID]) + 'ft';
      const defaultTrigger = <Tag type="normal" size="small">{gasAllot.name}{reason}{T('分到')} {earnedGasFee}</Tag>;
      return <Balloon trigger={defaultTrigger} closable={false}>{gasAllot.name}{reason}{T('分到')} {earnedGasFee}</Balloon>;
    });
  }
  showAuthors = (index) => {
    this.state.accountInfos[index].authors.map(author => {
      author.status = AuthorUpdateStatus.Normal;
    })
    this.setState({authorListVisible: true, authorList: this.state.accountInfos[index].authors, curAccount: this.state.accountInfos[index]});
  }
  bindNewAuthor = () => {
    this.setState({ bindNewAuthorVisible: true});
  }
  modifyThreshold = () => {
    this.setState({ modifyThresholdVisible: true});
  }
  submitAllAuthorUpdate= () => {
    let { threshold, updateAuthorThreshold } = this.state.curAccount;
    if (!utils.isEmptyObj(this.state.authorTxThreshold)) {
      updateAuthorThreshold = parseInt(this.state.authorTxThreshold);
    }
    if (!utils.isEmptyObj(this.state.normalTxThreshold)) {
      threshold = parseInt(this.state.normalTxThreshold);
    }
    const authorUpdateList = [];
    this.state.authorList.map(author => {
      if (author.status == AuthorUpdateStatus.Normal) {
        return;
      }
      const owner = author.owner;
      let ownerType = AuthorOwnerType.Error;
      if (ethUtil.isValidPublic(Buffer.from(utils.hex2Bytes(utils.getPublicKeyWithPrefix(owner))), true)) {
        ownerType = AuthorOwnerType.PublicKey;
      } else if (ethUtil.isValidAddress(owner) || ethUtil.isValidAddress('0x' + owner)) {
        ownerType = AuthorOwnerType.Address;
      } else if (this.state.accountReg.test(owner)) {
        ownerType = AuthorOwnerType.AccountName;
      }
      
      authorUpdateList.push([author.status, [ownerType, owner, author.weight]]);
    });

    const payload = '0x' + encode([threshold, updateAuthorThreshold, [...authorUpdateList]]).toString('hex');
    this.state.txInfo = { actionType: Constant.UPDATE_ACCOUNT_AUTHOR,
      accountName: this.state.curAccount.accountName,
      toAccountName: this.state.chainConfig.accountName,
      assetId: 0,
      amount: 0,
      payload };
    this.showTxSendDialog(this.state.txInfo);
  }
  withdrawTxFee = (index) => {
    this.setState({ withdrawTxFeeVisible: true, curAccount: this.state.accountInfos[index] });
  }
  addContractABI = (index) => {
    this.state.curAccount = this.state.accountInfos[index];
    const abiInfo = utils.getDataFromFile(Constant.ContractABIFile);
    this.state.originalABI = '';
    if (abiInfo != null && abiInfo[this.state.curAccount.accountName] != null) {
      this.state.originalABI = JSON.stringify(abiInfo[this.state.curAccount.accountName]).replace(/\\"/g, '"');
      this.state.originalABI = this.state.originalABI.substring(1, this.state.originalABI.length - 1);
    }
    this.setState({ contractInfoVisible: true });
  }
  addByteCode = (index) => {
    this.state.curAccount = this.state.accountInfos[index];
    if (this.state.curAccount.codeSize > 0) {
      
    } 
    this.setState({ contractByteCodeVisible: true, txSendVisible: false });
  }
  renderOperation = (value, index) => {
    let setByteCodeBtn = '';
    let abiBtn = '';
    if (this.state.accountInfos[index].codeSize > 0) {
      abiBtn = <Button type="primary" onClick={this.addContractABI.bind(this, index)}>{T('设置ABI')}</Button>
    } else {
      setByteCodeBtn = <Button type="primary" onClick={this.addByteCode.bind(this, index)}>{T('添加合约代码')}</Button>
    }
    return (
      <view>
        <Button type="primary" onClick={this.deleteAccount.bind(this, index)}>
          {T('解除绑定')}
        </Button>
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.showAssets.bind(this, index)}>
        {T('资产/转账')}
        </Button>
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.showTxs.bind(this, index)}>
        {T('交易列表')}
        </Button>
        <p /><p />
        <Button type="primary" onClick={this.showAuthors.bind(this, index)}>
        {T('权限管理')}
        </Button>
        &nbsp;&nbsp;
        <Button type="primary" onClick={this.withdrawTxFee.bind(this, index)}>
        {T('手续费')}
        </Button>
        &nbsp;&nbsp;
        {abiBtn}{setByteCodeBtn}
      </view>
    );
  };

  showTxSendDialog = (txInfo) => {
    this.setState({ txInfo, txSendVisible: true });
    this.state.txSendVisible = false;
  }

  deleteAuthor = async (index) => {
    const curAuthor = this.state.authorList[index];
    if (curAuthor.status == AuthorUpdateStatus.Add) {
      this.state.authorList.splice(index, 1);
    } else {
      curAuthor.weight = parseInt((curAuthor.weight + '').split('->')[0]);
      curAuthor.status = AuthorUpdateStatus.Delete;
    }
    this.setState({authorList: this.state.authorList});
    // const { threshold, updateAuthorThreshold } = this.state.curAccount;

  }

  updateWeight = async (index) => {
    this.state.curAuthor = this.state.authorList[index];
    this.setState({ updateWeightVisible: true, txSendVisible: false })
  }
  undoOperator = (index) => {
    const curAuthor = this.state.authorList[index];
    curAuthor.status = AuthorUpdateStatus.Normal;
    curAuthor.weight = (curAuthor.weight + '').split('->')[0];
    this.setState({ authorList: this.state.authorList })
  }
  isAccountAsOwner = (owner) => {
    return this.state.accountReg.test(owner);
  }
  renderOwner = (value) => {
    if (this.isAccountAsOwner(value)) {
      return value;
    }
    const displayValue = value.substr(0, 6) + '...' + value.substr(value.length - 6);
    return <address title={T('点击可复制')} onClick={ () => this.copyValue(value) }>{displayValue}</address>;
  }
  renderStatus = (value) => {
    let status = '未改变';
    switch(value) {
      case AuthorUpdateStatus.Normal:
        break;
      case AuthorUpdateStatus.Add:
          status = '新增';
        break;
      case AuthorUpdateStatus.Delete:
          status = '待删除';
        break;
      case AuthorUpdateStatus.Modify:
          status = '待修改';
        break;
    }
    return T(status);
  }
  renderAuthorOperation = (value, index) => {
    const curAuthor = this.state.authorList[index];
    if (curAuthor.status == AuthorUpdateStatus.Add) {
      return (
        <view>
          <Button type="primary" onClick={this.deleteAuthor.bind(this, index)}>
          {T('删除')}
          </Button>
          &nbsp;&nbsp;
          <Button type="primary" onClick={this.updateWeight.bind(this, index)}>
          {T('修改')}
          </Button>
        </view>
      );
    } else {
      return (
        <view>
          <Button type="primary" onClick={this.deleteAuthor.bind(this, index)}>
            {T('删除')}
          </Button>
          &nbsp;&nbsp;
          <Button type="primary" onClick={this.updateWeight.bind(this, index)}>
            {T('修改')}
          </Button>
          <p /><p />
          <Button type="primary" onClick={this.undoOperator.bind(this, index)}>
            {T('重置')}
          </Button>
        </view>
      );
    }
  };
  onAuthorListClose = () => {
    this.setState({authorListVisible: false, txSendVisible: false});
  }

  onSystemCreatAccountOK = () => {
    if (!this.state.accountReg.test(this.state.fractalAccount)) {
      Feedback.toast.error(T('账号格式错误'));
      return;
    }
    if (this.state.fractalPublicKey == '') {
      Feedback.toast.error(T('请选择公钥'));
      return;
    }
    if (!this.state.emailReg.test(this.state.email)) {
      Feedback.toast.error(T('邮箱格式错误'));
      return;
    }
    // this.props.createAccountBySystem({ accountName: this.state.fractalAccount, publicKey: this.state.fractalPublicKey, email: this.state.email });
  };
  onSystemCreatAccountClose = () => {
    this.setState({systemHelpVisible: false, txSendVisible: false});
  }

  addAccountBySelf = () => {
    this.state.accountNames = [];
    this.state.accountInfos.map(account => this.state.accountNames.push(account.accountName));
    if (this.state.accountNames.length == 0) {
      this.setState({ helpVisible: true });
      return;
    }
    this.setState({ selfCreateAccountVisible: true, txSendVisible: false });
  }
  onSelfCreateAccountOK = async () => {
    if (this.state.creator == '') {
      Feedback.toast.error(T('请选择创建者账号'));
      return;
    }
    if (!this.state.accountReg.test(this.state.newAccountName) && this.state.newAccountName.length > 31) {
      console.log(this.state.newAccountName);
      Feedback.toast.error(T('账号格式错误'));
      return;
    }
    const exist = await fractal.account.isAccountExist(this.state.newAccountName);
    if (exist) {
      Feedback.toast.error(T('账号已存在，不可重复创建'));
      return;
    }

    if (this.state.selfPublicKey == '' && this.state.otherPublicKey == '') {
      Feedback.toast.error(T('请选择或输入公钥'));
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
      Feedback.toast.error(T('无效公钥，请重新输入'));
      return;
    }

    if (this.state.transferAmount == null || this.state.transferAmount == '') {
      this.state.transferAmount = 0;
    } else if (!this.state.numberReg.test(this.state.transferAmount)) {
      Feedback.toast.error(T('附带转账金额数有误，请重新输入'));
      return;
    }
    this.state.curAccount = await fractal.account.getAccountByName(this.state.creator);

    const payload = '0x' + encode([this.state.newAccountName, this.state.creator, publicKey, accountDetail]).toString('hex');
    let amountValue = new BigNumber(this.state.transferAmount).shiftedBy(this.state.chainConfig.sysTokenDecimal);
    amountValue = amountValue.comparedTo(new BigNumber(0)) == 0 ? 0 : '0x' + amountValue.toString(16);
    this.state.txInfo = { actionType: Constant.CREATE_NEW_ACCOUNT,
      accountName: this.state.curAccount.accountName,
      toAccountName: this.state.chainConfig.accountName,  // fractal.account
      assetId: this.state.chainConfig.sysTokenID,  // ft
      amount: amountValue,
      payload };

    this.showTxSendDialog(this.state.txInfo);
  };

  onSelfCreateAccountClose = () => {
    this.setState({ selfCreateAccountVisible: false, txSendVisible: false});
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
      this.setState({ inputOtherPK: true, txSendVisible: false });
    } else {
      this.setState({ inputOtherPK: false, otherPublicKey: '', txSendVisible: false });
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
  handleAuthorThresholdChange = (v) => {
    this.state.authorTxThreshold = v;
  }
  handleThresholdChange = (v) => {
    this.state.normalTxThreshold = v;
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
      Feedback.toast.error(T('请输入有效的账号、公钥或地址'));
      return;
    }
    if (newOwner.indexOf('.') > 0 || newOwner.length <= 8) {
      const exist = await fractal.account.isAccountExist(newOwner);
      if (!exist) {
        Feedback.toast.error(T('账号不存在'));
        return;
      }
    }
    if (utils.isEmptyObj(this.state.weight)) {
      Feedback.toast.error(T('请输入权重'));
      return;
    }

    this.state.authorList.push({owner: newOwner, weight: this.state.weight, status: AuthorUpdateStatus.Add});
    this.setState({authorList: this.state.authorList, bindNewAuthorVisible: false});

    // const { threshold, updateAuthorThreshold } = this.state.curAccount;
    // const payload = '0x' + encode([threshold, updateAuthorThreshold, [[UpdateAuthorType.Add, [ownerType, newOwner, this.state.weight]]]]).toString('hex');
    // this.state.txInfo = { actionType: Constant.UPDATE_ACCOUNT_AUTHOR,
    //   accountName: this.state.curAccount.accountName,
    //   toAccountName: this.state.chainConfig.accountName,
    //   assetId: 0,
    //   amount: 0,
    //   payload };

    // this.showTxSendDialog(this.state.txInfo);
  }
  onBindNewAuthorClose = () => {
    this.setState({ bindNewAuthorVisible: false, txSendVisible: false });
  }

  onModifyThresholdOK = async () => {

  }

  onModifyThresholdClose = () => {
    this.setState({ modifyThresholdVisible: false, txSendVisible: false });
  }

  onChangeThresholdType =  (v) => {
    this.state.thresholdType = v;
  }

  onUpdateWeightOK = () => {
    if (this.state.curAuthor.status == AuthorUpdateStatus.Add) {
      this.state.curAuthor.weight = this.state.weight;
    } else {
      this.state.curAuthor.weight = (this.state.curAuthor.weight + '').split('->')[0] + '->' + this.state.weight;
      this.state.curAuthor.status = AuthorUpdateStatus.Modify;
    }
    this.setState({authorList: this.state.authorList, updateWeightVisible: false});
  }

  onUpdateWeightClose = () => {
    this.setState({ updateWeightVisible: false, txSendVisible: false });
  }
  onWithdrawTxFeeOK = async () => {
    if (this.state.txFeeType == null) {
      Feedback.toast.error(T('请选择手续费类型'));
      return;
    }
    if (this.state.assetName == null) {
      Feedback.toast.error(T('请输入名称'));
      return;
    }
    const txFeeName = this.state.txFeeType == TxFeeType.Asset ? this.state.assetName : this.state.curAccount.accountName;
    let payload = '0x';
    if (this.state.txFeeType == TxFeeType.Asset) {
      const assetInfo = await fractal.account.getAssetInfoByName(txFeeName);
      const assetId = assetInfo.assetId == null ? 0 : assetInfo.assetId;
      payload += fractal.utils.getContractPayload('withdrawAssetFee', ['uint256'], [assetId]);
    } else if (this.state.txFeeType == TxFeeType.Contract) {
      const account = await fractal.account.getAccountByName(txFeeName);
      payload += fractal.utils.getContractPayload('withdrawAccountFee', ['uint256'], [account.accountID]);
    } else if (this.state.txFeeType == TxFeeType.Coinbase) {
      const account = await fractal.account.getAccountByName(txFeeName);
      payload += fractal.utils.getContractPayload('withdrawCoinbaseFee', ['uint256'], [account.accountID]);
    }
    this.state.txInfo = { actionType: Constant.CALL_CONTRACT,
      accountName: this.state.curAccount.accountName,
      toAccountName: 'feecontract',
      assetId: 0,
      amount: 0,
      payload };

    this.showTxSendDialog(this.state.txInfo);
  }
  onWithdrawTxFeeClose = () => {
    this.setState({ withdrawTxFeeVisible: false, txSendVisible: false, txFeeInfo: '' });
  }
  getTxFee = async () => {
    const txFeeName = this.state.txFeeType == TxFeeType.Asset ? this.state.assetName : this.state.curAccount.accountName;
    const txFeeInfoObj = await fractal.fee.getObjectFeeByName(txFeeName, this.state.txFeeType);
    //console.log(txFeeInfo);
    if (txFeeInfoObj == null) {
      Feedback.toast.prompt(T('无手续费信息'));
    } else {
      let txFeeDetail = await this.getValue(this.state.chainConfig.sysTokenID, txFeeInfoObj.assetFees[0].remainFee);
      if (this.state.txFeeType == TxFeeType.Asset) {
        const assetInfo = await fractal.account.getAssetInfoByName(txFeeName);
        txFeeDetail = T('此资产创办者[') + assetInfo.founder + T(']可提取手续费:') + txFeeDetail;
      } else if (this.state.txFeeType == TxFeeType.Contract) {
        const accountInfo = await fractal.account.getAccountByName(txFeeName);
        txFeeDetail = T('此合约创办者[') + accountInfo.founder + T(']可提取手续费:') + txFeeDetail;
      } else {
        txFeeDetail = T('矿工[') + txFeeName + T(']可提取手续费:') + txFeeDetail;
      }
      this.setState({ txFeeInfo : txFeeDetail, txSendVisible: false });
    }
  }
  onChangeTxFeeTypeAccount = (value) => {
    this.state.txFeeType = value;
    const feeTypeName = this.state.txFeeType == TxFeeType.Asset ? T('资产名') : (this.state.txFeeType == TxFeeType.Contract ? T('合约账号') : T('矿工账号'));
    this.setState({ txSendVisible: false, txFeeInfo: '', feeTypeName });
  }
  onChangeAssetName = (value) => {
    this.state.assetName = value;
  }
  onAssetClose = () => {
    this.setState({
      assetVisible: false,
      txSendVisible: false
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
    
    let decimalPlaces = decimals > 6 ? 6 : decimals;
    if (renderValue.comparedTo(new BigNumber(0.000001)) < 0) {
      decimalPlaces = decimals;
    }

    BigNumber.config({ DECIMAL_PLACES: decimalPlaces });
    renderValue = renderValue.toString(10);
    return renderValue;
  }
  assetRender = (value, index) => {
    return (
      <view>
        <Button type="primary" onClick={this.transfer.bind(this, index)}>
          {T('转账')}
        </Button>
      </view>
    );
  };
  renderContract = (value, index) => {
    return value > 0 ? T('是') : T('否');
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

  processTxSendResult = (txInfo, txHash) => {
    if (txHash != null) {
      Feedback.toast.success(T('交易发送成功'));

      txInfo.txHash = txHash;
      this.addSendSuccessTxToFile(txInfo);
      this.setState({syncTxInterval: 3000, transferVisible: false, txSendVisible: false});
      clearTimeout(this.state.syncTxTimeoutId);
      this.state.syncTxTimeoutId = setTimeout(() => { this.syncTxFromNode(); }, this.state.syncTxInterval);
    } else {
      Feedback.toast.error(T('交易发送失败'));
      this.addSendErrorTxToFile(txInfo);
    }
  }
  /** 
   *  const txInfo = { actionType: Constant.TRANSFER,
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
    txInfo.txStatus = Constant.TxStatus.NotExecute;
    txInfo.date = new Date().getTime() * 1000000;
    txInfo.blockHash = '0x';
    txInfo.blockNumber = '';
    txInfo.blockStatus = Constant.BlockStatus.Unknown;
    txInfo.actions[0].status = 0;
    txInfo.actions[0].actionIndex = 0;
    txInfo.actions[0].gasUsed = 0;
    txInfo.actions[0].gasAllot = [];

    const accountName = txInfo.actions[0].accountName;
    let allTxInfoSet = utils.getDataFromFile(Constant.TxInfoFile);
    if (allTxInfoSet != null) {
      const accountTxInfoSet = allTxInfoSet[accountName];
      if (accountTxInfoSet == null) {
        accountTxInfoSet = {};
        accountTxInfoSet.txInfos = [txInfo];
        allTxInfoSet[accountName] = accountTxInfoSet;
      } else {
        accountTxInfoSet.txInfos.push(txInfo);
      }
    } else {
      allTxInfoSet = {};
      allTxInfoSet[accountName] = {};
      allTxInfoSet[accountName].txInfos = [txInfo];
    }
    utils.storeDataToFile(Constant.TxInfoFile, allTxInfoSet);
  }
  addSendErrorTxToFile = (txInfo) => {
    txInfo.isInnerTx = 0;
    txInfo.txStatus = Constant.TxStatus.SendError;
    txInfo.date = new Date().getTime() * 1000000;
    txInfo.txHash = '0x';
    txInfo.blockHash = '0x';
    txInfo.blockNumber = '';
    txInfo.blockStatus = Constant.BlockStatus.Unknown;
    txInfo.actions[0].status = 0;
    txInfo.actions[0].actionIndex = 0;
    txInfo.actions[0].gasUsed = 0;
    txInfo.actions[0].gasAllot = [];

    const accountName = txInfo.actions[0].accountName;
    let allTxInfoSet = utils.getDataFromFile(Constant.TxInfoFile);
    if (allTxInfoSet != null) {
      const accountTxInfoSet = allTxInfoSet[accountName];
      if (accountTxInfoSet == null) {
        accountTxInfoSet = {};
        accountTxInfoSet.txInfos = [txInfo];
        allTxInfoSet[accountName] = accountTxInfoSet;
      } else {
        accountTxInfoSet.txInfos.push(txInfo);
      }
    } else {
      allTxInfoSet = {};
      allTxInfoSet[accountName] = {};
      allTxInfoSet[accountName].txInfos = [txInfo];
    }
    utils.storeDataToFile(Constant.TxInfoFile, allTxInfoSet);
  }

  onTransferOK = () => {
    if (this.state.transferToAccount == '') {
      Feedback.toast.error(T('请输入账号'));
      return;
    }
    if (!this.state.accountReg.test(this.state.transferToAccount)) {
      Feedback.toast.error(T('账号格式错误'));
      return;
    }
    const self = this;
    fractal.account.isAccountExist(this.state.transferToAccount).then(exist => {
      if (!exist) {
        Feedback.toast.error(T('目标账号不存在'));
        return;
      }
  
      if (self.state.transferValue == '') {
        Feedback.toast.error(T('请输入转账金额'));
        return;
      }
      if (!self.state.numberReg.test(self.state.transferValue)) {
        Feedback.toast.error(T('请输入正确的金额'));
        return;
      }
  
      const decimals = self.state.curTransferAsset.decimals;
      const value = new BigNumber(self.state.transferValue).shiftedBy(decimals);
      const maxValue = new BigNumber(self.state.curBalance.balance);
      if (value.comparedTo(maxValue) > 0) {
        Feedback.toast.error(T('余额不足'));
        return;
      }
      
      const amountValue = value.comparedTo(new BigNumber(0)) == 0 ? 0 : '0x' + value.toString(16);
      const transferAssetId = self.state.curTransferAsset.assetId;
      let txInfo = {actionType: Constant.TRANSFER, 
                    accountName: self.state.curAccount.accountName, 
                    toAccountName: self.state.transferToAccount,
                    assetId: transferAssetId == null ? 0 : transferAssetId,
                    amount: amountValue,
                    payload: ''};
      this.showTxSendDialog(txInfo);
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
      txSendVisible: false
    });
  }

  onUpdateTx = () => {
    this.syncTxFromNode();
    this.showTxs(this.state.accountIndex);
  }
  onTxClose = () => {
    this.setState({
      txVisible: false,
      txSendVisible: false
    });
  };

  onInnerTxClose = () => {
    this.setState({
      innerTxVisible: false,
      txSendVisible: false
    });
  };


  onSort(dataIndex, order) {
    const txInfos = this.state.txInfos.sort((a, b) => {
      const result = a[dataIndex] - b[dataIndex];
      return (order === 'asc') ? (result > 0 ? 1 : -1) : (result > 0 ? -1 : 1);
    });
    this.setState({
      txInfos,
      txSendVisible: false
    });
  }

  storeContractABI = (contractAccountName, abiInfo) => {
    let storedABI = utils.getDataFromFile(Constant.ContractABIFile);
    if (storedABI != null) {
      storedABI[contractAccountName] = abiInfo;
    } else {
      storedABI = {};
      storedABI[contractAccountName] = abiInfo;
    }
    utils.storeDataToFile(Constant.ContractABIFile, storedABI);
  }
  
  onAddContractABIOK = () => {
    if (!utils.isEmptyObj(this.state.contractABI) && !fractal.utils.isValidABI(this.state.contractABI)) {
      Feedback.toast.error(T('ABI信息不符合规范，请检查后重新输入'));
      return;
    }
    this.storeContractABI(this.state.curAccount.accountName, this.state.contractABI);
    Feedback.toast.success(T('添加成功'));
    this.setState({ contractInfoVisible: false });
  }

  onAddContractABIClose = () => {
    this.setState({ contractInfoVisible: false });
  }

  handleContractABIChange = (value) => {
    this.state.contractABI = value;
  }

  onAddContractByteCodeOK = () => {
    if (utils.isEmptyObj(this.state.contractByteCode)) {
      Feedback.toast.error(T('请输入bytecode'));
      return;
    }
    const payload = '0x' + this.state.contractByteCode;
    this.state.txInfo = { actionType: Constant.CREATE_CONTRACT,
      accountName: this.state.curAccount.accountName,
      toAccountName: this.state.curAccount.accountName,
      assetId: 0,
      amount: 0,
      payload };

    this.showTxSendDialog(this.state.txInfo);
    this.setState({ contractByteCodeVisible: false });
  }

  onAddContractByteCodeClose = () => {
    this.setState({ contractByteCodeVisible: false });
  }

  handleContractByteCodeChange = (value) => {
    this.state.contractByteCode = value;
  }
  render() {
    return (
      <div className="editable-table">
        <IceContainer>
          <Table primaryKey="accountName" dataSource={this.state.accountInfos} hasBorder={false} isLoading={this.state.isLoading}>
            <Table.Column
              width={80}
              title="ID"
              dataIndex="accountID"
            />
            <Table.Column
              width={80}
              title={T("账号")}
              dataIndex="accountName"
            />
            <Table.Column
              width={80}
              title={T("创建者")}
              dataIndex="founder"
            />
            <Table.Column
              width={100}
              title={T("权限交易阈值")}
              dataIndex="updateAuthorThreshold"
            />
            <Table.Column
              width={100}
              title={T("普通交易阈值")}
              dataIndex="threshold"
            />
            <Table.Column
              width={80}
              title={T("区块高度")}
              dataIndex="number"
            />
            <Table.Column
              width={80}
              width={80}
              title={T("合约账户")}
              dataIndex="codeSize"
              cell={this.renderContract.bind(this)}
            />
            <Table.Column title={T("操作")} width={500} cell={this.renderOperation} />
          </Table>
          {/* <div onClick={this.addAccountBySystem.bind(this)} style={styles.addNewItem}>
            + 新增账户(第三方免费帮您创建)
          </div> */}
          <div onClick={this.addAccountBySelf.bind(this)} style={styles.addNewItem}>
            + {T('新增账户')}
          </div>
          <div onClick={this.onImportAccount.bind(this)} style={styles.addNewItem}>
            + {T('导入账户')}
          </div>
          <Feedback title={T("提示")} type="help" visible={this.state.helpVisible}>
          {T('首个主网账户请找第三方申请，如是首个测试网账户可到公链电报群(https://t.me/FractalOfficial)进行申请，申请成功后请将私钥和账户导入即可使用。')}
          </Feedback>
        </IceContainer>
        <Dialog
          visible={this.state.selfCreateAccountVisible}
          onOk={this.onSelfCreateAccountOK.bind(this)}
          onCancel={this.onSelfCreateAccountClose.bind(this)}
          onClose={this.onSelfCreateAccountClose.bind(this)}
          title={T("账户创建")}
          footerAlign="center"
        >
          <Select
            style={{ width: 400 }}
            placeholder={T("选择您拥有的账户(此账户用于创建新账户)")}
            onChange={this.onChangeCreatorAccount.bind(this)}
            dataSource={this.state.accountNames}
          />
          <br />
          <br />
          <Input hasClear
            onChange={this.handleNewAccountNameChange.bind(this)}
            style={{ width: 400 }}
            addonBefore={T("待创建账号")}
            size="medium"
            defaultValue=""
            maxLength={50}
            hasLimitHint
            placeholder={T("字母开头,由a-z0-9.组成,一级7~16位,二三级皆2~16位")}
          />
          <br />
          <br />

          <Select
            style={{ width: 400 }}
            placeholder={T("选择绑定本地已有公钥或在下面输入其它公钥")}
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
          {T("如无公钥，请前往“账户管理”->“密钥”页面创建公私钥")}
          <br />
          <br />
          <Input hasClear
            onChange={this.handleOthersPublicKeyChange.bind(this)}
            style={{ width: 400 }}
            addonBefore={T("其它公钥")}
            size="medium"
            defaultValue=""
            maxLength={132}
            hasLimitHint
            disabled={!this.state.inputOtherPK}
            placeholder={T("若此处填入公钥，创建时将以此公钥为准")}
          />
          <br />
          <br />
          <Input hasClear
            onChange={this.handleTAccountDetailChange.bind(this)}
            style={{ width: 400 }}
            addonBefore={T("账号描述")}
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
            addonBefore={T("附带转账金额(单位:FT)")}
            size="medium"
            defaultValue=""
            maxLength={10}
            hasLimitHint
            placeholder={T("创建新账号的同时，可向此账号转账，默认为0")}
          />
        </Dialog>

        <Dialog
          visible={this.state.bindNewAuthorVisible}
          onOk={this.onBindNewAuthorOK.bind(this)}
          onCancel={this.onBindNewAuthorClose.bind(this)}
          onClose={this.onBindNewAuthorClose.bind(this)}
          title={T("绑定新的权限拥有者")}
          footerAlign="center"
        >
          <Input hasClear
            onChange={this.handleNewOwnerChange.bind(this)}
            style={{ width: 400 }}
            addonBefore={T("权限拥有者")}
            size="medium"
            defaultValue=""
            maxLength={133}
            hasLimitHint
            placeholder={T('可输入账户名/公钥/地址')}
          />
          <br />
          <br />
          {T('权重')}:
          <NumberPicker
            onChange={this.handleWeightChange.bind(this)}
            style={{ width: 400 }}
            step={1}
            inputWidth={"350px"} 
          />
        </Dialog>

        <Dialog
          visible={this.state.modifyThresholdVisible}
          onOk={this.onModifyThresholdOK.bind(this)}
          onCancel={this.onModifyThresholdClose.bind(this)}
          onClose={this.onModifyThresholdClose.bind(this)}
          title={T("修改阈值")}
          footerAlign="center"
        >
          <Select
            style={{ width: 400 }}
            placeholder={T("选择阈值类型")}
            onChange={this.onChangeThresholdType.bind(this)}
            dataSource={this.state.thresholdTypes}
          />
          <br />
          <br />
          {T('新阈值')}:
          <NumberPicker
            onChange={this.handleThresholdChange.bind(this)}
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
          title={T("更新权重")}
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
          title={T("提取手续费") + '--' + this.state.curAccount.accountName}
          footerAlign="center"
          footer={this.state.withdrawFooter}
        >
          <Select
            style={{ width: 400 }}
            placeholder={T("选择手续费类型")}
            onChange={this.onChangeTxFeeTypeAccount.bind(this)}
            dataSource={this.state.txFeeTypes}
          />
          <p /><p />
          <Input hasClear 
            onChange={this.onChangeAssetName.bind(this)}
            style={{ width: 400 }}
            addonBefore={this.state.feeTypeName}
            size="medium"
            defaultValue=""
            maxLength={16}
            hasLimitHint
          />
          <p />
          {this.state.txFeeInfo}
        </Dialog>
        <Dialog
          visible={this.state.importAccountVisible}
          title={T("导入账户")}
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
            addonBefore={T("账号名/ID")}
            size="medium"
            defaultValue=""
            maxLength={16}
            hasLimitHint
            onPressEnter={this.onImportAccountOK.bind(this)}
          />
        </Dialog>
        <Dialog
          style={{ width: 600 }}
          visible={this.state.authorListVisible}
          title={T("权限管理")}
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
                <Table.Column title={T("所有者")} dataIndex="owner" width={100} cell={this.renderOwner.bind(this)}/>
                <Table.Column title={T("权重")} dataIndex="weight" width={100} />
                <Table.Column title={T("当前状态")} dataIndex="status" width={100} cell={this.renderStatus.bind(this)}/>
                <Table.Column title={T("操作")} width={150} cell={this.renderAuthorOperation.bind(this)} />
              </Table>

              <div onClick={this.bindNewAuthor.bind(this)} style={styles.addNewItem}>
                + {T("绑定新权限")}
              </div>
              <br />
              <br />
              <Input
                onChange={this.handleAuthorThresholdChange.bind(this)}
                style={{ width: 500 }}
                addonBefore={T("权限交易阈值")}
                size="medium"
                defaultValue={this.state.curAccount.updateAuthorThreshold}
              />
              <br />
              <br />
              <Input
                onChange={this.handleThresholdChange.bind(this)}
                style={{ width: 500 }}
                addonBefore={T("普通交易阈值")}
                defaultValue={this.state.curAccount.threshold}
                size="medium"
              />
            </IceContainer>
          </div>
        </Dialog>

        <Dialog
          style={{ width: 450 }}
          visible={this.state.assetVisible}
          title={T("资产信息")}
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
                <Table.Column title={T("资产ID")} dataIndex="assetID" width={100} />
                <Table.Column title={T("资产符号")} dataIndex="assetID" width={100} cell={this.symbolRender.bind(this)} />
                <Table.Column title={T("可用金额")} dataIndex="balance" width={100} cell={this.balanceRender.bind(this)} />
                <Table.Column title={T("操作")} width={150} cell={this.assetRender.bind(this)} />
              </Table>
            </IceContainer>
          </div>
        </Dialog>

        <Dialog
          style={{ width: 1200 }}
          visible={this.state.txVisible}
          title={T("交易信息")}
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onTxClose.bind(this)}
          onCancel={this.onTxClose.bind(this)}
          onClose={this.onTxClose.bind(this)}
          footer={this.state.txListFooter}
        >
          <div className="editable-table">
            <IceContainer>
              <Table fixedHeader primaryKey="date" dataSource={this.state.txInfos} hasBorder={false} resizable onSort={this.onSort.bind(this)} isZebra={true}>
                <Table.Column title={T("时间")} dataIndex="date" width={65} cell={this.renderDate.bind(this)} sortable />
                <Table.Column title={T("交易Hash")} dataIndex="txHash" width={60} cell={this.renderHash.bind(this)} />
                <Table.Column title={T("交易状态")} dataIndex="txStatus" width={50} cell={this.renderTxStatus.bind(this)} />
                <Table.Column title={T("区块Hash")} dataIndex="blockHash" width={60} cell={this.renderHash.bind(this)} />
                <Table.Column title={T("区块高度")} dataIndex="blockNumber" width={50} sortable />
                <Table.Column title={T("区块状态")} dataIndex="blockStatus" width={100} cell={this.renderBlockStatus.bind(this)} />
                <Table.Column title={T("内部交易")} dataIndex="innerActions" width={80} cell={this.renderInnerActions.bind(this)} />

                <Table.Column title={T("类型")} dataIndex="parsedActions" width={80} cell={this.renderActionType.bind(this)} />
                <Table.Column title={T("详情")} dataIndex="parsedActions" width={100} cell={this.renderDetailInfo.bind(this)} />
                {/* <Table.Column title="Action结果" dataIndex="parsedActions" width={80} cell={this.renderResult.bind(this)} /> */}
                <Table.Column title={T("总手续费")} dataIndex="parsedActions" width={80} cell={this.renderGasFee.bind(this)} />
                <Table.Column title={T("手续费分配详情")} dataIndex="parsedActions" width={150} cell={this.renderGasAllot.bind(this)} />
              </Table>
            </IceContainer>
          </div>
        </Dialog>
        <Dialog
          style={{ width: 800 }}
          visible={this.state.innerTxVisible}
          title={T("内部交易信息")} 
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
                <Table.Column title={T("类型")}  dataIndex="actionType" width={80} />
                <Table.Column title={T("发起账号")}  dataIndex="fromAccount" width={100} />
                <Table.Column title={T("接收账号")}  dataIndex="toAccount" width={80} />
                <Table.Column title={T("资产ID")}  dataIndex="assetId" width={80} />
                <Table.Column title={T("金额")}  dataIndex="value" width={80} />
                <Table.Column title={T("额外信息")}  dataIndex="payload" width={150} />
              </Table>
            </IceContainer>
          </div>
        </Dialog>
        <Dialog
          visible={this.state.transferVisible}
          title={T("转账信息")}
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
            addonBefore={T("收款账号")}
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
            addonBefore={T("金额")}
            onPressEnter={this.onTransferOK.bind(this)}
            addonAfter={this.state.transferAssetSymbol}
            size="medium"
            hasLimitHint
          />
        </Dialog>
        <Dialog
          visible={this.state.contractInfoVisible}
          title={T("本地添加合约ABI信息")}
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onAddContractABIOK.bind(this)}
          onCancel={this.onAddContractABIClose.bind(this)}
          onClose={this.onAddContractABIClose.bind(this)}
        >
          <Input hasClear multiple
            onChange={this.handleContractABIChange.bind(this)}
            style={{ width: 400 }}
            addonBefore={T("ABI信息")}
            size="medium"
            defaultValue={this.state.originalABI}
            hasLimitHint
          />
        </Dialog>
        <Dialog
          visible={this.state.contractByteCodeVisible}
          title={T("设置合约byteCode")}
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onAddContractByteCodeOK.bind(this)}
          onCancel={this.onAddContractByteCodeClose.bind(this)}
          onClose={this.onAddContractByteCodeClose.bind(this)}
        >
          <Input hasClear multiple
            onChange={this.handleContractByteCodeChange.bind(this)}
            style={{ width: 400 }}
            addonBefore={T("合约byteCode")}
            size="medium"
            hasLimitHint
          />
        </Dialog>
        <TxSend visible={this.state.txSendVisible} accountName={this.state.curAccount.accountName} txInfo={this.state.txInfo}/>
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