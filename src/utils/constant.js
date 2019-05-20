export const CALL_CONTRACT = 0;
export const CREATE_CONTRACT = 1;

export const CREATE_NEW_ACCOUNT = 256;
export const UPDATE_ACCOUNT = 257;
export const DELETE_ACCOUNT = 258;
export const UPDATE_ACCOUNT_AUTHOR = 259;

export const INCREASE_ASSET = 512;
export const ISSUE_ASSET = 513;
export const DESTORY_ASSET = 514;
export const SET_ASSET_OWNER = 515;
export const UPDATE_ASSET = 516;
export const TRANSFER = 517;

export const REG_CANDIDATE = 768;
export const UPDATE_CANDIDATE = 769;
export const UNREG_CANDIDATE = 770;
export const REFUND_DEPOSIT = 771;
export const VOTE_CANDIDATE = 772;

export const ADD_CANDIDATE_BL = 1024;
export const EXIT_TAKEOVER = 1025;

export const WITHDRAW_TX_FEE = 1280;

export const FT_ASSET_ID = 1;
export const FT_DECIMALS = 18;

export const AccountFile = 'accountInfo';
export const KeyStoreFile = 'keystoreInfo';
export const TxInfoFile = 'txInfo';
export const ContractABIFile = 'contractABI';

export const PublicKeyPrefix = '0x04';
export const ChainIdPrefix = 'ChainId-';

/* 交易状态：
* 1: 发送失败：无需更新
* 2：发送成功，但尚未执行：需更新
* 3：发送成功，执行成功：需检查是否被回滚
* 4：发送成功，执行失败：需检查是否被回滚
* 5：内部交易成功：需检查是否被回滚
* 6：内部交易失败：需检查是否被回滚
*/
export const TxStatus = { SendError:1, NotExecute:2, ExecuteSuccess:3, ExecuteFail:4, InnerSuccess:5, InnerFail:6 };

/* 区块状态：
    * 1: 可逆：   1   //初始默认的状态值
    * 2：不可逆   0
    * 3：被回滚  -1
*/
export const BlockStatus = { Rollbacked: -1, Irreversible: 0, Reversible: 1, Unknown: 2 };