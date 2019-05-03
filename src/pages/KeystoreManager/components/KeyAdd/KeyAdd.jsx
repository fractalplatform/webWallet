import React, { Component } from 'react';
import IceContainer from '@icedesign/container';
import { Table, Button, Input, Dialog, Feedback } from '@icedesign/base';

export default class KeyAdd extends Component {
  static displayName = 'KeyAdd';

  constructor(props) {
    super(props);
    
    this.state = {
      
    };
  }

  componentDidMount() {
    
  }

  render() {
    return (
      <div className="editable-table">
        <IceContainer>
          <Table dataSource={this.state.dataSource} hasBorder={false}>
            <Table.Column width={80} title="ID" cell={this.renderOrder} />
            <Table.Column
              width={120}
              title="公钥"
              dataIndex="publicKey"
            />
            <Table.Column
              width={120}
              title="文件路径"
              dataIndex="path"
            />
            <Table.Column title="操作" width={200} cell={this.renderOperation} />
          </Table>
          <div onClick={this.addNewItem} style={styles.addNewItem}>
            + 新增一对公私钥
          </div>
          <div onClick={this.importPrikey} style={styles.addNewItem}>
            + 导入私钥
          </div>
        </IceContainer>
        <Dialog
          visible={this.state.pwdDialogVisible}
          onOk={this.onOK}
          onCancel={this.onClose}
          onClose={this.onClose}
          title="输入密码"
          footerAlign='center'
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
            onPressEnter={this.onOK}
          />
        </Dialog>  
        <Dialog
          visible={this.state.msgVisible}
          title="通知"
          footerActions='ok'
          footerAlign='center'
          closeable='true'
          onOk={this.onMsgClose}
          onCancel={this.onMsgClose}
          onClose={this.onMsgClose}
        >
          {this.state.msgContent}
        </Dialog>  
        <Dialog
          visible={this.state.newPwdDialogVisible}
          onOk={this.onChangePwdOK}
          onCancel={this.onChangePwdClose}
          onClose={this.onChangePwdClose}
          title="修改密码"
          footerAlign='center'
        >
          <Input hasClear
            htmlType="password"
            onChange={this.handlePasswordChange.bind(this)} 
            style={{ width: 400 }}
            addonBefore="旧密码"
            size="medium"
            defaultValue=""
            maxLength={20}
            hasLimitHint
            onPressEnter={this.onChangePwdOK}
          />
          <p/>
          <p/>
          <Input hasClear
            htmlType="password"
            onChange={this.handleNewPasswordChange.bind(this)} 
            style={{ width: 400 }}
            addonBefore="新密码"
            size="medium"
            defaultValue=""
            maxLength={20}
            hasLimitHint
            onPressEnter={this.onChangePwdOK}
          />
        </Dialog>  
        <Dialog
          visible={this.state.importKeyDialogVisible}
          onOk={this.onImportKeyOK}
          onCancel={this.onImportKeyClose}
          onClose={this.onImportKeyClose}
          title="导入私钥"
          footerAlign='center'
        >
          <Input hasClear
            onChange={this.handlePrivateKeyChange.bind(this)} 
            style={{ width: 400 }}
            addonBefore="私钥"
            placeholder="无需0x前缀"
            size="medium"
            defaultValue=""
            maxLength={64}
            hasLimitHint
            onPressEnter={this.onImportKeyOK}
          />
          <p/>
          <p/>
          <Input hasClear
            htmlType="password"
            onChange={this.handlePasswordChange.bind(this)} 
            style={{ width: 400 }}
            addonBefore="密码"
            size="medium"
            defaultValue=""
            maxLength={20}
            hasLimitHint
            onPressEnter={this.onImportKeyOK}
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
