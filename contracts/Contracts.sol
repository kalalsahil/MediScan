// // SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

contract Contacts {
    uint public count = 0;

    struct Contact {
        uint id;
        string name;
        string prediction;
        bool checked;
    }

    mapping(uint => Contact) public contacts;

    function createContact(string memory _name, string memory _prediction) public {
        require(!isContactExist(_name, _prediction), "name already exists");
        count++;
        contacts[count] = Contact(count, _name, _prediction, false);
    }

    function isContactExist(string memory _name, string memory _prediction) view public returns (bool) {
        for (uint i = 1; i <= count; i++) {
            Contact storage contact = contacts[i];
            if (keccak256(abi.encodePacked(contact.name)) == keccak256(abi.encodePacked(_name)) &&
                keccak256(abi.encodePacked(contact.prediction)) == keccak256(abi.encodePacked(_prediction))) {
                return true;
            }
        }
        return false;
    }

    function getUncheckedContacts() public view returns (uint[] memory, string[] memory, string[] memory) {
        uint[] memory uncheckedIds = new uint[](count);
        string[] memory uncheckedNames = new string[](count);
        string[] memory uncheckedPredictions = new string[](count);

        uint uncheckedCount = 0;
        for (uint i = 1; i <= count; i++) {
            Contact storage contact = contacts[i];
            if (!contact.checked) {
                uncheckedIds[uncheckedCount] = contact.id;
                uncheckedNames[uncheckedCount] = contact.name;
                uncheckedPredictions[uncheckedCount] = contact.prediction;
                uncheckedCount++;
            }
        }

        uint[] memory uncheckedIdsTrimmed = new uint[](uncheckedCount);
        string[] memory uncheckedNamesTrimmed = new string[](uncheckedCount);
        string[] memory uncheckedPredictionsTrimmed = new string[](uncheckedCount);

        for (uint i = 0; i < uncheckedCount; i++) {
            uncheckedIdsTrimmed[i] = uncheckedIds[i];
            uncheckedNamesTrimmed[i] = uncheckedNames[i];
            uncheckedPredictionsTrimmed[i] = uncheckedPredictions[i];
        }

        return (uncheckedIdsTrimmed, uncheckedNamesTrimmed, uncheckedPredictionsTrimmed);
    }

}
