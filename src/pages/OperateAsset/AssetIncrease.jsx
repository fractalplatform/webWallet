/* eslint-disable prefer-template */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint react/no-string-refs:0 */
import React, { Component } from 'react';
import { Grid, Input, Button, Select, Dialog, Feedback } from '@icedesign/base';
import {
  FormBinderWrapper as IceFormBinderWrapper,
  FormBinder as IceFormBinder,
} from '@icedesign/form-binder';
import { encode } from 'rlp';
import BigNumber from 'bignumber.js';
import * as fractal from 'fractal-web3';
import * as Constant from '../../utils/constant';
import { T } from '../../utils/lang';
import TxSend from "../TxSend";

const { Row } = Grid;

export default class AssetIncrease extends Component {
  static displayName = 'AssetIssueTable';

  static propTypes = {};

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.state = {
      value: {
        assetId: '',
        amount: 0,
        toAccount: '',
      },
      assetInfoSet: [],
      inputPasswordVisible: false,
      decimals: 0,
      txInfo: {},
      txSendVisible: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ assetInfoSet: nextProps.assetInfoSet, assetId: '', txSendVisible: false });
  }
  formChange = (value) => {
    this.setState({
      value,
    });
  };

  onSubmit = async () => {
    const { value } = this.state;

    const curAccountName = this.props.accountName;
    if (curAccountName === '') {
      Feedback.toast.error(T('请选择需要操作资产的账户'));
      return;
    }

    if (value.assetId === '') {
      Feedback.toast.error(T('请选择待增发的资产ID'));
      return;
    }

    if (value.amount === '' || value.amount === '0') {
      Feedback.toast.error(T('请输入大于0的增发金额'));
      return;
    }

    let selectedAsset;
    for (const assetInfo of this.state.assetInfoSet) {
      if (assetInfo.assetId === value.assetId) {
        selectedAsset = assetInfo;
        this.state.decimals = assetInfo.decimals;
        break;
      }
    }
    const addAmount = new BigNumber(value.amount);
    const amount = new BigNumber(selectedAsset.amount);
    const addIssue = new BigNumber(selectedAsset.addIssue);
    const upperLimit = new BigNumber(selectedAsset.upperLimit);
    if (addAmount.plus(addIssue).comparedTo(upperLimit) > 0) {
      Feedback.toast.error(T('已超过可增发的总金额'));
      return;
    }
    if (amount.plus(addIssue).comparedTo(upperLimit) > 0) {
      Feedback.toast.error(T('已超过可发行的上限'));
      return;
    }

    if (value.toAccount === '') {
      Feedback.toast.error(T('请输入增发对象的账户名称'));
      return;
    }

    const bAccountExist = await fractal.account.isAccountExist(value.toAccount);
    if (bAccountExist === false) {
      Feedback.toast.error(T('增发对象不存在'));
      return;
    }

    const txInfo = {};
    txInfo.actionType = Constant.INCREASE_ASSET;
    txInfo.accountName = curAccountName;
    txInfo.toAccountName = 'fractal.asset';
    txInfo.assetId = 0;
    txInfo.amount = 0;

    const assetId = parseInt(value.assetId, 10);
    const addMount = new BigNumber(value.amount);
    const decimals = parseInt(this.state.decimals, 10);
    const toAccount = value.toAccount;

    const rlpData = encode([assetId, addMount.shiftedBy(decimals).toString(16), toAccount]);
    txInfo.payload = `0x${rlpData.toString('hex')}`;

    this.setState({
      txInfo,
      txSendVisible: true,
    });
  }
  onClose = () => {
    this.setState({
      inputPasswordVisible: false,
    });
  }

  handlePasswordChange = (v) => {
    this.state.password = v;
  }
  render() {
    return (
      <div>
        <IceFormBinderWrapper
          value={this.state.value}
          onChange={this.formChange}
          ref="form"
        >
          <div style={styles.formContent}>
            <Row style={styles.formRow} justify="center">
                        {T('待增发的资产')}:
              <IceFormBinder required message="Required!">
                <Select
                  placeholder={T("选择需要增发的资产ID")}
                  dataSource={this.state.assetInfoSet}
                  name="assetId"
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required message="Required!">
                <Input hasClear
                  addonBefore={T("增发金额")}
                  name="amount"
                  size="large"
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required message="Required!">
                <Input hasClear
                  addonBefore={T("增发对象")}
                  name="toAccount"
                  size="large"
                  placeholder={T("将资产增发给此账号")}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <Button type="normal" onClick={this.onSubmit}>{T("提交")}</Button>
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
    margin: '20px',
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
    alignItems: 'center',
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
