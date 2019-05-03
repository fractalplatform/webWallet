/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint react/no-string-refs:0 */
import React, { Component } from 'react';
import { Grid, Input, Radio, Button, Select, Dialog, Feedback } from '@icedesign/base';
import {
  FormBinderWrapper as IceFormBinderWrapper,
  FormBinder as IceFormBinder,
} from '@icedesign/form-binder';
import { encode } from 'rlp';
import * as rpc from '../../api';
import * as action from '../../utils/constant';
import { saveTxHash } from '../../utils/utils';

const { Row } = Grid;

export default class AssetOwnerSet extends Component {
  static displayName = 'AssetOwnerSet';

  static propTypes = {};

  static defaultProps = {};

  constructor(props) {
    super(props);
    this.state = {
      value: {
        assetId: null,
        owner: '',
      },
      assetInfoSet: [],
      inputPasswordVisible: false,
    };
  }
  getAssetInfoOfOwner = async (accountName, _this) => {
    let resp = await rpc.getAccountInfo([accountName]);
    const assetInfoSet = [];
    if (Object.prototype.hasOwnProperty.call(resp.data, 'error') && resp.data.result != null) {
      const account = resp.data.result;
      for (const balance of account.balances) {
        resp = await rpc.getAssetInfoById([balance.assetID]);
        if (Object.prototype.hasOwnProperty.call(resp.data, 'error') && resp.data.result != null) {
          const assetInfo = resp.data.result;
          if (assetInfo.owner === accountName) {
            assetInfo.label = `${assetInfo.assetId}--${assetInfo.assetName}`;
            assetInfo.value = assetInfo.assetId;
            assetInfoSet.push(assetInfo);
          }
        }
      }
      _this.setState({ assetInfoSet, assetId: '' });
    }
  }
  componentWillReceiveProps(nextProps) {
    this.getAssetInfoOfOwner(nextProps.accountName, this);
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
      Feedback.toast.error('请选择需要操作资产的账户');
      return;
    }

    if (value.assetId === '') {
      Feedback.toast.error('请选择需要改变管理者的资产ID');
      return;
    }

    for (const assetInfo of this.state.assetInfoSet) {
      if (assetInfo.assetId === value.assetId) {
        this.state.decimals = assetInfo.decimals;
        break;
      }
    }

    if (value.owner === '') {
      Feedback.toast.error('请输入管理者的账户名称');
      return;
    }

    const resp = await rpc.isAccountExist([value.owner]);
    if (resp.data.result === false) {
      Feedback.toast.error('管理者不存在');
      return;
    }
    this.setState({
      inputPasswordVisible: true,
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
      Feedback.toast.error('请先输入账户所绑定密钥对应的密码');
      return;
    }
    this.onClose();

    const curAccountName = this.props.accountName;
    const password = this.state.password;
    const assetId = parseInt(value.assetId, 10);
    const owner = value.owner;

    const params = {};
    params.actionType = action.SET_ASSET_OWNER;
    params.accountName = curAccountName;
    params.password = password;

    const rlpData = encode([assetId, '', '', 0, 0, '', owner, 0, 0]);
    params.data = `0x${rlpData.toString('hex')}`;
    console.log(params.data);
    try {
      const response = await rpc.sendTransaction(params);
      if (response.status === 200) {
        if (response.data.result != null) {
          saveTxHash(params.accountName, params.actionType, response.data.result);
          Feedback.toast.success('交易发送成功');
        } else {
          Feedback.toast.error(`交易发送失败:${response.data.error.message}`);
        }
      } else {
        Feedback.toast.error(`交易发送失败, 错误号:${response.status}`);
      }
      return response.data;
    } catch (error) {
      Feedback.toast.error(`交易发送失败, 错误信息:${error}`);
    }
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
                        需改变管理者的资产ID:
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
                  addonBefore="管理者:"
                  name="owner"
                  size="large"
                />
              </IceFormBinder>
            </Row>
            <Row style={styles.formRow} justify="center">
              <Button type="normal" onClick={this.onSubmit}>提交</Button>
            </Row>
          </div>
        </IceFormBinderWrapper>
        <Dialog
          visible={this.state.inputPasswordVisible}
          title="输入密码"
          footerActions="ok"
          footerAlign="center"
          closeable="true"
          onOk={this.onInputPasswordOK.bind(this)}
          onCancel={this.onClose.bind(this)}
          onClose={this.onClose.bind(this)}
        >
          <Input hasClear
            htmlType="password"
            onChange={this.handlePasswordChange.bind(this)}
            style={{ width: 400 }}
            addonBefore="密码"
            size="medium"
            defaultValue=""
            maxLength={20}
            hasLimitHint
            onPressEnter={this.onInputPasswordOK.bind(this)}
          />
        </Dialog>
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
