/* eslint-disable prefer-template */
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
import * as fractal from 'fractal-web3';
import TxSend from "../TxSend";
import * as Constant from '../../utils/constant';

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
        founder: '',
      },
      assetInfoSet: [],
      inputPasswordVisible: false,
      txInfo: {},
      txSendVisible: false,
    };
  }
  componentWillReceiveProps(nextProps) {
    this.setState({ assetInfoSet: nextProps.assetInfoSet, txSendVisible: false });
  }
  formChange = (value) => {
    this.setState({
      value,
      txSendVisible: false,
    });
  };

  onSubmit = async () => {
    const { value } = this.state;

    const curAccountName = this.props.accountName;
    if (curAccountName === '') {
      Feedback.toast.error('请选择需要操作资产的账户');
      return;
    }

    if (value.assetId === '') {
      Feedback.toast.error('请选择需要改变创办者的资产ID');
      return;
    }

    for (const assetInfo of this.state.assetInfoSet) {
      if (assetInfo.assetId === value.assetId) {
        this.state.decimals = assetInfo.decimals;
        break;
      }
    }

    if (value.founder === '') {
      Feedback.toast.error('请输入创办者的账户名称');
      return;
    }

    const bExist = await fractal.account.isAccountExist(value.founder);
    if (bExist === false) {
      Feedback.toast.error('创办者不存在');
      return;
    }

    const txInfo = {};
    txInfo.actionType = Constant.UPDATE_ASSET;
    txInfo.accountName = curAccountName;
    txInfo.toAccountName = 'fractal.asset';
    txInfo.assetId = 0;
    txInfo.amount = 0;

    const assetId = parseInt(value.assetId, 10);

    const rlpData = encode([assetId, value.founder]);
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
                        需改变创办者的资产:
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
                  addonBefore="创办者:"
                  name="founder"
                  size="large"
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <Button type="normal" onClick={this.onSubmit}>提交</Button>
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
