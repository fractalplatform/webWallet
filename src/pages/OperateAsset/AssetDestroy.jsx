/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint react/no-string-refs:0 */
import React, { Component } from 'react';
import { Grid, Input, Button, Select, Dialog, Feedback } from '@icedesign/base';
import {
  FormBinderWrapper as IceFormBinderWrapper,
  FormBinder as IceFormBinder,
} from '@icedesign/form-binder';
import { encode } from 'rlp';
import BigNumber from 'bignumber.js';
import * as utils from '../../utils/utils';
import { T } from '../../utils/lang';  
import TxSend from "../TxSend";
import * as Constant from '../../utils/constant';
import * as AssetUtils from './AssetUtils';

const { Row } = Grid;

export default class AssetFounderSet extends Component {
  static displayName = 'AssetFounderSet';

  static propTypes = {};

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.state = {
      value: {
        assetId: null,
        amount: '',
      },
      assetInfoSet: [],
      selectedAsset: {},
      inputPasswordVisible: false,
      txInfo: {},
      txSendVisible: false,
    };
  }
  componentWillReceiveProps(nextProps) {
    AssetUtils.getAllAssetInfo(nextProps.accountName).then(assetInfoSet => {
        this.setState({ assetInfoSet, txSendVisible: false});
    });
  }
  formChange = (value) => {
    this.setState({
      value,
      txSendVisible: false
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
      Feedback.toast.error(T('请选择需要销毁的资产'));
      return;
    }

    for (const assetInfo of this.state.assetInfoSet) {
      if (assetInfo.assetId === value.assetId) {
        this.state.selectedAsset = assetInfo;
        break;
      }
    }

    if (value.amount === '') {
      Feedback.toast.error(T('请输入待销毁资产金额'));
      return;
    }

    const amount = new BigNumber(value.amount).shiftedBy(this.state.selectedAsset.decimals);
    const curAmount = new BigNumber(this.state.selectedAsset.amount);
    if (amount.comparedTo(curAmount) > 0) {
      Feedback.toast.error(T('销毁金额不能超过您所拥有的资产总额') + `：${curAmount.toNumber()}`);
      return;
    }

    
    const txInfo = {};
    txInfo.actionType = Constant.DESTORY_ASSET;
    txInfo.accountName = curAccountName;
    txInfo.toAccountName = 'fractal.asset';
    const assetId = parseInt(value.assetId, 10);
    txInfo.assetId = assetId;
    txInfo.amount = amount.toString(16);

    txInfo.payload = '';
    if (!utils.isEmptyObj(value.desc)) {
      const rlpData = encode([value.desc]);
      txInfo.payload = `0x${rlpData.toString('hex')}`;
    }
    
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
            {T('需销毁的资产')}:
              <IceFormBinder required message="Required!">
                <Select
                  dataSource={this.state.assetInfoSet}
                  name="assetId"
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required message="Required!">
                <Input hasClear
                  addonBefore={T("销毁金额")}
                  name="amount"
                  size="large"
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required message="Required!">
                <Input hasClear
                  addonBefore={T("销毁说明")}
                  name="desc"
                  size="large"
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
