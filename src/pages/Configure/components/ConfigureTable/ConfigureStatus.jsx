import React, { Component } from 'react';
import Container from '@icedesign/container';

import { Icon, Card, Switch } from '@icedesign/base';

export default class ConfigureStatus extends Component {
  static displayName = 'ConfigureStatus';

  onChange(checked) {
    this.setState({miningStatus:{...this.state.miningStatus, status: checked ? '进行中' : '已停止', iconType: checked ? 'loading' : 'warning'}});
  }

  constructor(props) {
    super(props);
    this.state = {
      miningStatus:
        {
          iconType: 'loading',
          title: '挖矿状态',
          desc: '节点是否挖矿中',
          status: '进行中',
        },
    };
    this.onChange = this.onChange.bind(this);
  }

  render() {
    return (
      <Container>
        <div style={styles.header}>
          <h2 style={{ margin: 0, fontSize: 16 }}>节点配置</h2>
          <span style={{ fontSize: 12, color: '#999', paddingLeft: 20 }}>
            此处可以管理节点相关配置，包括挖矿。。。
          </span>
        </div>
        <Card
          style={{ width: 300 }}
          title={this.state.miningStatus.title}
          subTitle={this.state.miningStatus.desc}
          titlePrefixLine={true}
          extra={<Switch defaultChecked='true' checkedChildren="开" onChange={this.onChange} unCheckedChildren="关" />}
        >
        <div text-align='center' padding='10px 16px'>
          <Icon type={this.state.miningStatus.iconType} size='xxl'/>
          <p>{this.state.miningStatus.status}</p>
        </div>
        </Card>
      </Container>
    );
  }
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
  },
};
