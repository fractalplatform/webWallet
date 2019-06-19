/* eslint-disable prefer-template */
/* eslint jsx-a11y/no-noninteractive-element-interactions:0 */
import React, { PureComponent } from 'react';
import { Icon, Input, Dialog, Feedback, Select } from '@icedesign/base';
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
import * as utils from '../../utils/utils';
import { T, setLang } from '../../utils/lang';

export const history = createHashHistory();

export default class Header extends PureComponent {
  constructor(props) {
    super(props);
    const nodeInfoCookie = cookie.load('nodeInfo');
    const defaultLang = cookie.load('defaultLang');

    let nodeInfo = nodeInfoCookie;
    if (utils.isEmptyObj(nodeInfo)) {
      nodeInfo = 'http://127.0.0.1:8545';
    }

    this.state = {
      nodeConfigVisible: false,
      nodeInfo,
      chainId: 0,
      customNodeDisabled: true,
      languages: [{value: 'ch', label:'中文'}, {value: 'en', label:'English'}],
      defaultLang: (defaultLang == null || defaultLang == 'ch') ? 'ch' : 'en',
      nodes: [{value: 'http://120.92.115.77:33100', label:'主网http://120.92.115.77:33100'}, {value: 'http://120.92.115.77:33000', label:'测试网http://120.92.115.77:33000'}, 
              {value: 'http://127.0.0.1::8545', label:'本地节点http://127.0.0.1::8545'}, {value: 'others', label: '自定义'}],
    };
    setLang(this.state.defaultLang);
  }
  componentDidMount = () => {
    fractal.ft.getChainConfig().then(chainConfig => {
      this.setState({chainId: chainConfig.chainId});
    })
  }
  openSetDialog = () => {
    this.setState({ nodeConfigVisible: true });
  }
  handleNodeInfoChange = (v) => {
    this.state.nodeInfo = v;
  }
  onChangeLanguage = (v) => {
    cookie.save('defaultLang', v);
    setLang(v);
    history.push('/');
  }
  onChangeNode = (v) => {
    cookie.save('defaultNode', v);
    this.state.nodeInfo = v;
    this.setState({customNodeDisabled: v != 'others'});
  }
  onConfigNodeOK = () => {
    const nodeInfo = this.state.nodeInfo.indexOf('http://') == 0 ? this.state.nodeInfo : 'http://' + this.state.nodeInfo;
    cookie.save('nodeInfo', nodeInfo);
    axios.defaults.baseURL = nodeInfo;
    this.setState({ nodeConfigVisible: false, nodeInfo });
    fractal.utils.setProvider(nodeInfo);
    this.state.chainId = fractal.ft.getChainId();
    history.push('/');
  }
  render() {
    const defaultTrigger = <Button type="primary" className="btrigger" onClick={this.openSetDialog.bind(this)}><Icon type="set" />{T('设置节点')}</Button>;
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
          <Select
            style={{ width: 100 }}
            placeholder={T("语言")}
            onChange={this.onChangeLanguage.bind(this)}
            dataSource={this.state.languages}
            defaultValue={this.state.defaultLang}
          />
          &nbsp;&nbsp;
          <Balloon trigger={defaultTrigger} closable={false}>
            {T('当前连接的节点')}:{this.state.nodeInfo}, ChainId:{this.state.chainId}
          </Balloon>
          <Dialog
            visible={this.state.nodeConfigVisible}
            title={T("配置节点")}
            footerActions="ok"
            footerAlign="center"
            closeable="true"
            onOk={this.onConfigNodeOK.bind(this)}
            onCancel={() => this.setState({ nodeConfigVisible: false })}
            onClose={() => this.setState({ nodeConfigVisible: false })}
          >
            <Select
                style={{ width: 400 }}
                placeholder={T("选择节点")}
                onChange={this.onChangeNode.bind(this)}
                dataSource={this.state.nodes}
            />
            <br />
            <br />
            <Input hasClear
              disabled={this.state.customNodeDisabled}
              onChange={this.handleNodeInfoChange.bind(this)}
              style={{ width: 400 }}
              addonBefore="RPC URL"
              size="medium"
              defaultValue={this.state.nodeInfo}
              maxLength={150}
              hasLimitHint
            />
            {/* <br />
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
            /> */}
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
