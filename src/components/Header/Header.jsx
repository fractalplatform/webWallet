/* eslint-disable prefer-template */
/* eslint jsx-a11y/no-noninteractive-element-interactions:0 */
import React, { PureComponent } from 'react';
import { Icon, Input, Dialog, Feedback } from '@icedesign/base';
import Layout from '@icedesign/layout';
import Menu from '@icedesign/menu';
import FoundationSymbol from 'foundation-symbol';
import { Button, Balloon } from '@alifd/next';
import cookie from 'react-cookies';
import axios from 'axios';
import { createHashHistory } from 'history';
import cx from 'classnames';
import { Link } from 'react-router-dom';
import * as fractal from 'fractal-web3'
import { headerMenuConfig } from '../../menuConfig';
import Logo from '../Logo';

export const history = createHashHistory();

export default class Header extends PureComponent {
  constructor(props) {
    super(props);
    let ip = '127.0.0.1';
    let port = 8545;
    const nodeInfoCookie = cookie.load('nodeInfo');

    if (nodeInfoCookie != null && nodeInfoCookie !== '') {
      const nodeInfos = nodeInfoCookie.split('/')[2].split(':');
      ip = nodeInfos[0];
      port = nodeInfos[1];
    }

    this.state = {
      nodeConfigVisible: false,
      ip,
      port,
      nodeInfo: 'http://' + ip + ':' + port,
    };
  }
  openSetDialog = () => {
    this.setState({ nodeConfigVisible: true });
  }
  handleIPChange = (v) => {
    this.state.ip = v;
  }
  handlePortChange = (v) => {
    this.state.port = v;
  }
  onConfigNodeOK = () => {
    if (this.state.ip === '') {
      Feedback.toast.error('请输入IP地址');
      return;
    }
    if (this.state.port === '') {
      Feedback.toast.error('请输入端口');
      return;
    }
    const nodeInfo = 'http://' + this.state.ip + ':' + this.state.port;
    cookie.save('nodeInfo', nodeInfo);
    axios.defaults.baseURL = nodeInfo;
    this.setState({ nodeConfigVisible: false, nodeInfo });
    fractal.utils.setProvider(nodeInfo);
    history.push('/');
  }
  render() {
    const defaultTrigger = <Button type="primary" className="btrigger" onClick={this.openSetDialog.bind(this)}><Icon type="set" />设置节点</Button>;
    const { isMobile, theme, width, className, style } = this.props;
    return (
      <Layout.Header
        theme={theme}
        className={cx('ice-design-layout-header', className)}
        style={{ ...style, width }}
      >
        <Logo />
        <div
          className="ice-design-layout-header-menu"
          style={{ display: 'flex' }}
        >
          <Balloon trigger={defaultTrigger} closable={false}>
            当前连接的节点:{this.state.nodeInfo}
          </Balloon>
          <Dialog
            visible={this.state.nodeConfigVisible}
            title="配置节点"
            footerActions="ok"
            footerAlign="center"
            closeable="true"
            onOk={this.onConfigNodeOK.bind(this)}
            onCancel={() => this.setState({ nodeConfigVisible: false })}
            onClose={() => this.setState({ nodeConfigVisible: false })}
          >
            <Input hasClear
              onChange={this.handleIPChange.bind(this)}
              style={{ width: 400 }}
              addonBefore="IP"
              size="medium"
              defaultValue={this.state.ip}
              maxLength={15}
              hasLimitHint
            />
            <br />
            <br />
            <Input hasClear
              onChange={this.handlePortChange.bind(this)}
              style={{ width: 400 }}
              addonBefore="RPC端口"
              size="medium"
              defaultValue={this.state.port}
              maxLength={5}
              hasLimitHint
              onPressEnter={this.onConfigNodeOK.bind(this)}
            />
          </Dialog>

          {/* <Search
            style={{ fontSize: '12px' }}
            size="large"
            inputWidth={400}
            searchText="Search"
            placeholder="Search by Address / Txhash / Block / Token / Ens"
          /> */}
          {/* Header 菜单项 begin */}
          {headerMenuConfig && headerMenuConfig.length > 0 ? (
            <Menu mode="horizontal" selectedKeys={[]}>
              {headerMenuConfig.map((nav, idx) => {
                const linkProps = {};
                if (nav.newWindow) {
                  linkProps.href = nav.path;
                  linkProps.target = '_blank';
                } else if (nav.external) {
                  linkProps.href = nav.path;
                } else {
                  linkProps.to = nav.path;
                }
                return (
                  <Menu.Item key={idx}>
                    {linkProps.to ? (
                      <Link {...linkProps}>
                        {nav.icon ? (
                          <FoundationSymbol type={nav.icon} size="small" />
                        ) : null}
                        {!isMobile ? nav.name : null}
                      </Link>
                    ) : (
                      <a {...linkProps}>
                        {nav.icon ? (
                          <FoundationSymbol type={nav.icon} size="small" />
                        ) : null}
                        {!isMobile ? nav.name : null}
                      </a>
                    )}
                  </Menu.Item>
                );
              })}
            </Menu>
          ) : null}
          {/* Header 菜单项 end */}

          {/* Header 右侧内容块 */}

          {/* <Balloon
            visible={false}
            trigger={
              <div
                className="ice-design-header-userpannel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 12,
                }}
              >
                <IceImg
                  height={40}
                  width={40}
                  src={
                    profile.avatar ||
                    'https://img.alicdn.com/tfs/TB1L6tBXQyWBuNjy0FpXXassXXa-80-80.png'
                  }
                  className="user-avatar"
                />
                <div className="user-profile">
                  <span className="user-name" style={{ fontSize: '13px' }}>
                    {profile.name}
                  </span>
                  <br />
                  <span
                    className="user-department"
                    style={{ fontSize: '12px', color: '#999' }}
                  >
                    {profile.department}
                  </span>
                </div>
                <Icon
                  type="arrow-down-filling"
                  size="xxs"
                  className="icon-down"
                />
              </div>
            }
            closable={false}
            className="user-profile-menu"
          >
            <ul>
              <li className="user-profile-menu-item">
                <FoundationSymbol type="person" size="small" />我的主页
              </li>
              <li className="user-profile-menu-item">
                <FoundationSymbol type="repair" size="small" />设置
              </li>
              <li
                className="user-profile-menu-item"
                onClick={this.props.handleLogout}
              >
                <FoundationSymbol type="compass" size="small" />退出
              </li>
            </ul>
          </Balloon> */}
        </div>
      </Layout.Header>
    );
  }
}
