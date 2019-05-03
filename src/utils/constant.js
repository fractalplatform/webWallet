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

export const REG_CADIDATE = 768;
export const UPDATE_CADIDATE = 769;
export const UNREG_CADIDATE = 770;
export const REMOVE_VOTER = 771;
export const VOTE_CADIDATE = 772;
export const CHANGE_CADIDATE = 773;
export const UNVOTE_CADIDATE = 774;

export const KICKED_CADIDATE = 773;
export const EXIT_TAKEOVER = 774;

export const WITHDRAW_TX_FEE = 1280;

export const FT_ASSET_ID = 1;
export const FT_DECIMALS = 18;

export const AccountFile = 'accountInfo';
export const KeyStoreFile = 'keystoreInfo';
export const TxInfoFile = 'txInfo';

export const PublicKeyPrefix = '0x04';
export const ChainIdPrefix = 'ChainId-';