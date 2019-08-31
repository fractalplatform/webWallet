export const assetSol = `pragma solidity ^0.4.24;

contract Asset {
    uint256 public totalSupply;

    constructor() public {
        totalSupply = 10;
    }

    function reg(string desc) public returns(uint256){
        return issueasset(desc);
    }
    function add(uint assetId, address to, uint256 value) public {
        addasset(assetId,to,value);
    }
    function getAssetId() public returns (uint256) {
        return msg.assetid;
    }
    function transAsset(address to, uint assetId, uint256 value) public payable {
        to.transferex(assetId, value);
    }
    function setname(address newOwner, uint assetId) public {
        setassetowner(assetId, newOwner);
    }
    function getbalance(address to, uint assetId) public returns(uint256) {
        return to.balanceex(assetId);
    }
    function getAssetAmount(uint256 assetId, uint256 t) public returns (uint256){
        return assetamount(assetId,t);
    }
    function getSnapshotTime(uint256 i,uint256 t) public returns (uint256){
        return snapshottime(i,t);
    }
    function getSnapBalance(address to,uint256 assetId,uint256 t) public returns (uint256){
        return to.snapbalance(assetId,t);
    }
}'`;

export const cryptoSol = `pragma solidity ^0.4.11;

contract testencrypt {
    
   function myencode() external returns (uint256 len){     
      bytes memory mycode = "Hello, world.";
      bytes memory pubkey = "047db227d7094ce215c3a0f57e1bcc732551fe351f94249471934567e0f5dc1bf795962b8cccb87a2eb56b29fbe37d614e2f4c3c45b789ae4f1f51f4cb21972ffd";
      bytes memory aa = new bytes(10);
      len = cryptocalc( mycode,pubkey,aa,0);
      return len;
    }

   function mydecode() external returns (uint256 len){   
      bytes memory mycode = "Hello, world.";  
      bytes memory prikey = "289c2857d4598e37fb9647507e47a309d6133539bf21a8b9cb6df88fd5232032";
      bytes memory aa = new bytes(10);
      len = cryptocalc( mycode,prikey,aa,1);
      return len;
    }
    
    
}`;