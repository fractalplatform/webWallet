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
import * as action from '../../utils/constant';
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
      },
      inputPasswordVisible: false,
      password: '',
      txSendVisible: false,
      txInfo: {},
    };
  }


  componentWillReceiveProps(nextProps) {
    this.setState({
      txSendVisible: false,
    })
  }

  formChange = (value) => {
    this.setState({
      value,
      txSendVisible: false,
    });
  };

  onSubmit = () => {
    const { value } = this.state;

    const curAccountName = this.props.accountName;
    if (curAccountName === '') {
      Feedback.toast.error('请选择需要操作资产的账户');
      return;
    }
    // const assetNameReg = new RegExp('^([a-z][a-z0-9]{1,15})(?:\\.([a-z0-9]{1,8})){0,1}$');
    // if (!assetNameReg.test(value.assetName)) {
    //   Feedback.toast.error('资产名称错误');
    //   return;
    // }
    // let resp = await rpc.getAssetInfoByName([value.assetName]);
    // if (resp.data.result != null) {
    //   Feedback.toast.error('资产名称已存在');
    //   return;
    // }
    // const assetSymbolReg = new RegExp('^[a-z0-9]{2,16}$');
    // if (!assetSymbolReg.test(value.symbol)) {
    //   Feedback.toast.error('资产符号错误');
    //   return;
    // }
    // const zero = new BigNumber(0);
    // const amount = new BigNumber(value.amount);
    // if (amount.comparedTo(zero) < 0) {
    //   Feedback.toast.error('资产金额必须大于0');
    //   return;
    // }

    // const decimals = parseInt(value.decimals, 10);
    // if (decimals === undefined) {
    //   Feedback.toast.error('请输入正确的精度');
    //   return;
    // }

    // resp = await rpc.isAccountExist([value.owner]);
    // if (resp.data.result === false) {
    //   Feedback.toast.error('管理者不存在');
    //   return;
    // }
    // resp = await rpc.isAccountExist([value.founder]);
    // if (resp.data.result === false) {
    //   Feedback.toast.error('创办者不存在');
    //   return;
    // }
    // const upperLimit = new BigNumber(value.upperLimit);
    // if (upperLimit.comparedTo(amount) < 0) {
    //   Feedback.toast.error('资产上限必须大于等于资产发行金额');
    //   return;
    // }
    const amount = new BigNumber(value.amount);
    const decimals = parseInt(value.decimals, 10);
    const upperLimit = new BigNumber(value.upperLimit);

    const txInfo = {};
    txInfo.actionType = action.ISSUE_ASSET;
    txInfo.accountName = curAccountName;
    txInfo.toAccountName = 'fractal.asset';
    txInfo.assetId = 0;
    txInfo.value = 0;
    const rlpData = encode([value.assetName, value.symbol, amount.shiftedBy(decimals).toNumber(),
      decimals, value.founder, value.owner, upperLimit.shiftedBy(decimals).toNumber(), value.contract, value.desc]);
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

  onInputPasswordOK = async () => {
    const { value } = this.state;
    if (this.state.password === '') {
      Feedback.toast.error('请输入钱包密码');
      return;
    }
    this.onClose();

    
    
    
    
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
              <IceFormBinder required message="请输入正确的资产名称">
                <Input hasClear
                  addonBefore="名称:" // "^[a-z0-9]{2,16}$"
                  name="assetName"
                  size="large"
                  placeholder="a~z、0~9组成，2-16位"
                  //maxLength={16}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required message="请输入正确的资产符号">
                <Input hasClear
                  addonBefore="符号:" // "^[a-z0-9]{2,16}$"
                  name="symbol"
                  size="large"
                  placeholder="a~z、0~9组成，2-16位"
                  //maxLength={16}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required message="请输入正确金额">
                <Input hasClear
                  addonBefore="金额:"
                  name="amount"
                  size="large"
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required message="请输入正确精度">
                <Input hasClear
                  addonBefore="精度:"
                  name="decimals"
                  size="large"
                  //maxLength={2}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required>
                <Input hasClear
                  addonBefore="管理者:"
                  name="owner"
                  size="large"
                  placeholder="可对此资产进行管理"
                  //maxLength={16}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required>
                <Input hasClear
                  addonBefore="创办者:"
                  name="founder"
                  size="large"
                  placeholder="可收取相关手续费"
                  //maxLength={16}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder required>
                <Input hasClear
                  addonBefore="增发上限:"
                  name="upperLimit"
                  size="large"
                  placeholder="资产增发上限,0表示无上限"
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder>
                <Input hasClear
                  addonBefore="合约账户:"
                  name="contract"
                  size="large"
                  placeholder="留空表示非协议资产"
                  //maxLength={16}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <IceFormBinder>
                <Input hasClear autoHeight
                  addonBefore="资产描述:"
                  name="desc"
                  size="large"
                  //maxLength={255}
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <Button type="normal" onClick={this.onSubmit.bind(this)}>提交</Button>
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
