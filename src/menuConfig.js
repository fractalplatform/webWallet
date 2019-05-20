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
    name: '概览',
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
    name: '账户管理',
    path: '/table',
    icon: 'coupons',
    // authority: 'admin',
    children: [
      {
        name: '密钥',
        path: '/KeystoreManager',
        authority: 'admin',
      },
      {
        name: '账号',
        path: '/AccountManager',
        authority: 'admin',
      },
    ],
  },
  {
    name: '区块 & 交易(待更新)',
    path: '/list',
    icon: 'search',
    children: [
      {
        name: '区块',
        path: '/Block',
      },
      {
        name: '交易',
        path: '/Transaction',
      },
    ],
  },
  {
    name: '资产管理',
    path: '/portlets',
    icon: 'ul-list',
    children: [
      {
        name: '资产搜索',
        path: '/assetSearch',
      },
      {
        name: '资产操作',
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
        name: '候选者列表',
        path: '/producerList',
      },
    ],
  },
  {
    name: '开发者',
    path: '/portlets',
    icon: 'code',
    children: [
      {
        name: '合约调用',
        path: '/contractManager',
      },
      {
        name: '交易构造',
        path: '/rawTxConstructor',
      },
    ],
  },
];

export { headerMenuConfig, asideMenuConfig };
