/* eslint-disable prefer-template */
/* eslint react/no-string-refs:0 */
import React, { Component } from 'react';
import BigNumber from 'bignumber.js';
import { Grid, Input, Feedback, Button, Dialog } from '@icedesign/base';
import {
  FormBinderWrapper as IceFormBinderWrapper,
  FormBinder as IceFormBinder,
} from '@icedesign/form-binder';
import { encode } from 'rlp';
import * as fractal from 'fractal-web3';
import * as action from '../../utils/constant';
import { T } from '../../utils/lang';
import TxSend from "../TxSend";

const { Row } = Grid;

export default class AssetIssueTable extends Component {
  static displayName = 'AssetIssueTable';

  static propTypes = {};

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.state = {
      value: {
        assetName: '',
        symbol: '',
        amount: 0,
        decimals: 0,
        owner: '',
        founder: '',
        upperLimit: 0,
        contract: '',
        desc: '',
      },
      inputPasswordVisible: false,
      password: '',
      txSendVisible: false,
      txInfo: {},
      assetReg: new RegExp('^([a-z][a-z0-9]{1,15})(?:\\.([a-z0-9]{1,8})){0,1}(?:\\.([a-z0-9]{1,8})){0,1}$'),
      assetInfoSet: [],
      curAccountName: '',
    };
  }


  componentWillReceiveProps(nextProps) {
    this.setState({
      assetInfoSet: nextProps.assetInfoSet,
      curAccountName: nextProps.accountName,
      txSendVisible: false,
    })
  }

  formChange = (value) => {
    this.setState({
      value,
      txSendVisible: false,
    });
  };
  
  getFatherAssets = (assetName) => {
    const fatherAssets = [];
    const assetSplits = assetName.split('.');
    const count = assetSplits.length;
    for (let i = 1; i < count; i++) {
      let fatherAsset = assetSplits.slice(0, i).join('.');
      fatherAssets.push(fatherAsset);
    }
    return fatherAssets;
  }


  onSubmit = async () => {
    const { value } = this.state;

    if (this.state.curAccountName === '') {
      Feedback.toast.error(T('请选择需要操作资产的账户'));
      return;
    }
    let accountName = '';
    let assetName = value.assetName;
    if (value.assetName.indexOf(':') > 0) {
      accountName = value.assetName.split(':')[0];
      assetName = value.assetName.split(':')[1];
    }
    if (!this.state.assetReg.test(assetName) || assetName.length > 31) {
      Feedback.toast.error(T('资产名称错误'));
      return;
    }
    try {
      const assetInfo = await fractal.account.getAssetInfoByName(value.assetName);
      if (assetInfo != null) {
        Feedback.toast.error(T('资产已存在'));
        return;
      }
    } catch (error) {
      Feedback.toast.error(error.message || error);
    }
    const accountInfo = await fractal.account.getAccountByName(value.assetName);
    if (accountInfo != null) {
      Feedback.toast.error(T('资产名同账号名冲突，不可用'));
      return;
    }

    let validFatherAsset = false;
    let fatherAssetNames = this.getFatherAssets(value.assetName);
    for (const fatherAssetName of fatherAssetNames) {
      const assetInfo = await fractal.account.getAssetInfoByName(fatherAssetName);
      if (assetInfo == null) {
        Feedback.toast.error(T('父资产不存在'));
        return;
      }
      if (assetInfo.owner == this.state.curAccountName) {
        validFatherAsset = true;
        break;
      }
    }
    if (!validFatherAsset) {
      Feedback.toast.error(T('由于父资产的管理者不属于此账户，因此无法创建此子资产'));
      return;
    }

    if (!this.state.assetReg.test(value.symbol)) {
      Feedback.toast.error(T('资产符号错误'));
      return;
    }
    const zero = new BigNumber(0);
    const amount = new BigNumber(value.amount);
    if (amount.comparedTo(zero) < 0) {
      Feedback.toast.error(T('资产金额必须大于0'));
      return;
    }

    const decimals = parseInt(value.decimals, 10);
    if (decimals == null) {
      Feedback.toast.error(T('请输入正确的精度'));
      return;
    }
    if (fartherAsset != null && fartherAsset.decimals != decimals) {
      Feedback.toast.error(T('父子资产的精度必须保持一致'));
      return;
    }

    let bExist = await fractal.account.isAccountExist(value.owner);
    if (!bExist) {
      Feedback.toast.error(T('管理者账户不存在'));
      return;
    }
    bExist = await fractal.account.isAccountExist(value.founder);
    if (!bExist) {
      Feedback.toast.error(T('创办者不存在'));
      return;
    }
    const upperLimit = new BigNumber(value.upperLimit);
    if (upperLimit.comparedTo(amount) < 0) {
      Feedback.toast.error(T('资产上限必须大于等于资产发行金额'));
      return;
    }

    const txInfo = {};
    txInfo.actionType = action.ISSUE_ASSET;
    txInfo.accountName = this.state.curAccountName;
    txInfo.toAccountName = 'fractal.asset';
    txInfo.assetId = 0;
    txInfo.amount = 0;
    const rlpData = encode([value.assetName, value.symbol, '0x' + amount.shiftedBy(decimals).toString(16),
      decimals, value.founder, value.owner, '0x' + upperLimit.shiftedBy(decimals).toString(16), value.contract, value.desc]);
    txInfo.payload = `0x${rlpData.toString('hex')}`;

    this.setState({
      txInfo,
      txSendVisible: true,
    });
  }

  render() {
    return (
      <div>
        <IceFormBinderWrapper
          value={this.state.value}
          onChange={this.formChange.bind(this)}
          ref="form"
        >
          <div style={styles.formContent}>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required message={T("请输入正确的资产名称")}>
                <Input hasClear
                  addonBefore={T("名称")} // "^[a-z0-9]{2,16}$"
                  name="assetName"
                  size="large"
                  placeholder={T("不可跟已有的资产和账户名冲突")}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required message={T("请输入正确的资产符号")}>
                <Input hasClear
                  addonBefore={T("符号")} // "^[a-z0-9]{2,16}$"
                  name="symbol"
                  size="large"
                  placeholder={T("a~z、0~9.组成，2-16位")}
                  maxLength={16}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required message={T("请输入正确金额")}>
                <Input hasClear
                  addonBefore={T("金额")}
                  name="amount"
                  size="large"
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required message={T("请输入正确精度")}>
                <Input hasClear
                  addonBefore={T("精度")}
                  name="decimals"
                  size="large"
                  maxLength={2}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required>
                <Input hasClear
                  addonBefore={T("管理者")}
                  name="owner"
                  size="large"
                  placeholder={T("可对此资产进行管理")}
                  maxLength={16}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required>
                <Input hasClear
                  addonBefore={T("创办者")}
                  name="founder"
                  size="large"
                  placeholder={T("可收取相关手续费")}
                  maxLength={16}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required>
                <Input hasClear
                  addonBefore={T("增发上限")}
                  name="upperLimit"
                  size="large"
                  placeholder={T("资产增发上限,0表示无上限")}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder>
                <Input hasClear
                  addonBefore={T("合约账户")}
                  name="contract"
                  size="large"
                  placeholder={T("留空表示非协议资产")}
                  //maxLength={16}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder>
                <Input hasClear autoHeight
                  addonBefore={T("资产描述")}
                  name="desc"
                  size="large"
                  //maxLength={255}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <Button type="normal" onClick={this.onSubmit.bind(this)}>{T("提交")}</Button>
            </Row>
          </div>
        </IceFormBinderWrapper>
        <TxSend visible={this.state.txSendVisible} accountName={this.props.accountName} txInfo={this.state.txInfo}/>
      </div>
    );
  }
}

const styles = {
  formContent: {
    width: '100%',
    position: 'relative',
  },
  container: {
    margin: '10px',
    padding: '0',
  },
  title: {
    margin: '0',
    padding: '20px',
    fonSize: '16px',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    color: 'rgba(0,0,0,.85)',
    fontWeight: '500',
    borderBottom: '1px solid #eee',
  },
  formRow: {
    margin: '10px 0',
  },
  formItem: {
    display: 'flex',
    alignItems: 'center',
    margin: '10px 0',
  },
  formLabel: {
    minWidth: '70px',
  },
};
