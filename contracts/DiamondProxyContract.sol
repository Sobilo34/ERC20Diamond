// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library DiamondStorage {
    bytes32 constant STORAGE_SLOT = keccak256("diamond.storage.diamond");

    struct FacetAddressAndPosition {
        address facetAddress;
        uint96 functionSelectorPosition;
    }

    struct Layout {
        mapping(bytes4 => FacetAddressAndPosition) selectorToFacetAndPosition;
        bytes4[] selectors;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 slot = STORAGE_SLOT;
        assembly {
            l.slot := slot
        }
    }
}

contract DiamondProxyContract {
    event DiamondCut(bytes4[] selectors, address facet);

	constructor() {
		
	}

    function addFacet(address facet, bytes4[] memory selectors) external {
        DiamondStorage.Layout storage ds = DiamondStorage.layout();
        
        for (uint256 i = 0; i < selectors.length; i++) {
            bytes4 selector = selectors[i];
            require(
                ds.selectorToFacetAndPosition[selector].facetAddress == address(0),
                "Selector already exists"
            );
            
            ds.selectorToFacetAndPosition[selector] = DiamondStorage.FacetAddressAndPosition({
                facetAddress: facet,
                functionSelectorPosition: uint96(ds.selectors.length)
            });
            
            ds.selectors.push(selector);
        }
        
        emit DiamondCut(selectors, facet);
    }

    function facetAddress(bytes4 selector) external view returns (address) {
        return DiamondStorage.layout().selectorToFacetAndPosition[selector].facetAddress;
    }

    function facetSelectors() external view returns (bytes4[] memory) {
        return DiamondStorage.layout().selectors;
    }

    fallback() external payable {
        DiamondStorage.Layout storage ds = DiamondStorage.layout();
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;
        require(facet != address(0), "Function does not exist");

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    receive() external payable {}
}