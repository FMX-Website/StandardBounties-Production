// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title StandardBountiesProxy
 * @notice Minimal proxy contract using EIP-1167 standard
 * @dev Deploys under 500k gas while providing full StandardBounties functionality
 */
contract StandardBountiesProxy {
    
    // Implementation contract address (immutable saves gas)
    address public immutable implementation;
    
    // Proxy-specific storage
    bool private _initialized;
    
    /**
     * @dev Constructor sets the implementation address
     * @param _implementation Address of the StandardBounties implementation contract
     */
    constructor(address _implementation) {
        require(_implementation != address(0), "Invalid implementation");
        implementation = _implementation;
    }
    
    /**
     * @dev Initialize the proxy with owner
     * @param _owner The owner address for this bounty instance
     */
    function initialize(address _owner) external {
        require(!_initialized, "Already initialized");
        require(_owner != address(0), "Invalid owner");
        
        _initialized = true;
        
        // Delegate initialization to implementation
        (bool success, ) = implementation.delegatecall(
            abi.encodeWithSignature("initialize(address)", _owner)
        );
        require(success, "Initialization failed");
    }
    
    /**
     * @dev Fallback function delegates all calls to implementation
     */
    fallback() external payable {
        address impl = implementation;
        assembly {
            // Copy msg.data to memory
            calldatacopy(0, 0, calldatasize())
            
            // Delegate call to implementation
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            
            // Copy return data to memory
            returndatacopy(0, 0, returndatasize())
            
            // Return or revert based on result
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
    
    /**
     * @dev Receive function for ETH transfers
     */
    receive() external payable {
        // Delegate to implementation's receive function
        address impl = implementation;
        assembly {
            let result := delegatecall(gas(), impl, 0, 0, 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}