import { T } from './utils/lang'
// 菜单配置
// headerMenuConfig：头部导航配置
// asideMenuConfig：侧边导航配置

const headerMenuConfig = [
  // {
  //   name: 'feedback',
  //   path: '',
  //   external: true,
  //   newWindow: true,
  //   icon: 'message',
  // },
  // {
  //   name: '设置节点',
  //   path: '',
  //   external: true,
  //   icon: 'tool',
  // },
];

const asideMenuConfig = [
  {
    name: T('概览'),
    path: '/dashboard',
    icon: 'home2',
  },
  // {
  //   name: 'Nodes Info',
  //   path: '/chart',
  //   icon: 'chart1',
  //   children: [
  //     {
  //       name: 'Wallet Node',
  //       path: '/page17',
  //       authority: 'admin',
  //     },
  //     {
  //       name: 'Producer Nodes',
  //       path: '/Configure',
  //       authority: 'admin',
  //     },
  //   ],
  // },
  {
    name: T('账户管理'),
    path: '/table',
    icon: 'coupons',
    // authority: 'admin',
    children: [
      {
        name: T('密钥'),
        path: '/KeystoreManager',
        authority: 'admin',
      },
      {
        name: T('账号'),
        path: '/AccountManager',
        authority: 'admin',
      },
    ],
  },
  {
    name: T('区块 & 交易查询'),
    path: '/list',
    icon: 'search',
    children: [
      {
        name: T('区块'),
        path: '/Block',
      },
      {
        name: T('交易'),
        path: '/Transaction',
      },
    ],
  },
  {
    name: T('资产管理'),
    path: '/portlets',
    icon: 'ul-list',
    children: [
      {
        name: T('资产搜索'),
        path: '/assetSearch',
      },
      {
        name: T('资产操作'),
        path: '/assetOperator',
      },
    ],
  },
  {
    name: 'DPos',
    path: '/portlets',
    icon: 'repair',
    children: [
      {
        name: T('候选者列表'),
        path: '/producerList',
      },
    ],
  },
  {
    name: T('开发者'),
    path: '/portlets',
    icon: 'code',
    children: [
      {
        name: T('合约开发'),
        path: '/contractDev',
      },
      // {
      //   name: T('合约调用'),
      //   path: '/contractManager',
      // },
      {
        name: T('原始交易构造'),
        path: '/rawTxConstructor',
      },
      // {
      //   name: T('自动化测试'),
      //   path: '/autoTest',
      // },
    ],
  },
];

export { headerMenuConfig, asideMenuConfig };
