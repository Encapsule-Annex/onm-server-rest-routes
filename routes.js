
var onm = require('onm');
var uuid = require('node-uuid');

module.exports = function (onmModelDictionary_, onmStoreDictionary_) {

    var onmModelDictionary = onmModelDictionary_;
    var onmStoreDictionary = onmStoreDictionary_;

    return {

        //
        // Get basic information about this server endpoint.
        getAppMeta: function(req, res) {
            var packages = {};
            var appJSON = require('../../package.json');
            packages[appJSON.name] = appJSON;
            packages['onm'] = require('../onm/package.json');
            res.send(packages);
        },

        //
        // Enumerate the onm data models supported by this node instance.
        // Use the data model to create an onm store via POST /store/create/:model
        //
        getModels: function(req, res) {
            var models = [];
            for (modelName in onmModelDictionary) {
                models.push({
                    modelName: modelName,
                    modelPackage: onmModelDictionary[modelName].package
                });
            }
            res.send(200, models);
        },

        //
        // Enumerate the in-memory onm stores managed by this node instance.
        getStores: function(req, res) {
            var stores = [];
            for (key in onmStoreDictionary) {
                stores.push({
                    dataModel: onmStoreDictionary[key].model.jsonTag,
                    storeKey: key
                });
            }
            res.send(200, stores);
        },

        //
        // Traverse the namespace structure of the specified store starting at the given
        // address (or the root address of the store if unspecified). Return an array of
        // onm.Address hash strings for each namespace.
        getStoreAddresses: function(req, res) {
            var store = onmStoreDictionary[req.query.store];
            if ((store == null) || !store) {
                res.send(404, "Data store '" + req.query.store + "' does not exist.");
            } else {
                var addressHash = req.query.address || store.model.jsonTag;
                address = undefined
                try {
                    address = store.model.createAddressFromHashString(addressHash);
                    var namespace = store.openNamespace(address);
            
                    var addresses = [];

                    var processNamespace = function (address_) {
                        addresses.push(address_.getHashString());
                        var model = address_.getModel();
                        if (model.namespaceType === "extensionPoint") {
                            var namespace = store.openNamespace(address_);
                            namespace.visitExtensionPointSubcomponents( function(address_) {
                                processNamespace(address_);
                            });
                        } else {
                            address_.visitChildAddresses( function(address_) {
                                processNamespace(address_);
                            });
                        }
                    };

                    processNamespace(address);
                    var result = {};
                    result[req.query.store] = addresses;
                    res.send(200, result);
                } catch (exception) {
                    res.send(412, exception);
                }
           }
        },

        //
        // Retrieve the JSON serialization of the given store, or the serialization of
        // the given sub-namespace of the store (if specified).
        getStoreData: function(req, res) {
            var store = onmStoreDictionary[req.query.store];
            if ((store == null) || !store) {
                res.send(404, "No such store '" + req.query.store + "' on this server.");
            } else {
                var addressHash = req.query.address || store.model.jsonTag;
                var address = undefined;
                try {
                    address = store.model.createAddressFromHashString(addressHash);
                    var namespace = store.openNamespace(address);
                    var data = {};
                    data[address.getModel().jsonTag] = namespace.implementation.dataReference;
                    res.send(200, data);
                } catch (exception) {
                    res.send(412, exception);
                }
            }
        },

        //
        // Create a new in-memory data store instance using the the indicated onm data model.
        postCreateStore: function(req, res) {
            if (!req._body || (req.body == null) || !req.body) {
                res.send(400, "Invalid POST missing required request body.");
                return;
            }
            if ((req.body.model == null) || !req.body.model) {
                res.send(400, "Invalid POST missing 'model' property in request body.");
                return;
            }
            var onmDataModelRecord = onmModelDictionary[req.body.model];
            if ((onmDataModelRecord == null) || !onmDataModelRecord || (onmDataModelRecord.model == null) || !onmDataModelRecord.model) {
                res.send(403, "The specified onm data model '" + req.body.model + "' is unsupported by this server.");
                return;
            }
            var storeUuid = uuid.v4();
            var store = onmStoreDictionary[storeUuid] = new onm.Store(onmDataModelRecord.model);
            var storeRecord = {
                dataModel: store.model.jsonTag,
                storeKey: storeUuid
            };
            console.log("created in-memory data store '" + storeUuid + "'.");
            res.send(200, storeRecord);
        },

        //
        // Create a new component data resource in the indicated store using the specified
        // address hash to indicate the specific component to create.
        postCreateComponent: function(req, res) {
            if (!req._body || (req.body == null) || !req.body) {
                res.send(400, "Invalid POST missing required request body.");
                return;
            }
            if ((req.body.store == null) || !req.body.store) {
                res.send(400, "Invalid POST mising 'store' property in request body.");
                return;
            }
            if ((req.body.address == null) || !req.body.address) {
                res.send(400, "Invalid POST missing 'address' property in request body.");
                return;
            }
            var store = onmStoreDictionary[req.body.store];
            if ((store == null) || !store) {
                res.send(404, "The specified onm data store '" + req.body.store + "' does not exist on this server.");
               return;
            }
            var address = undefined
            try {
                address = store.model.createAddressFromHashString(req.body.address);
            } catch (exception) {
                console.error(exception);
                res.send(403, "Invalid address '" + req.body.address + "' is outside of the data model's address space.");
                return;
            }
            try {
                var namespace = store.createComponent(address)
                var namespaceRecord = {};
                namespaceRecord['address'] = namespace.getResolvedAddress().getHashString();
                namespaceRecord[address.getModel().jsonTag] = namespace.implementation.dataReference;
                res.send(200, namespaceRecord);
            } catch (exception) {
                res.send(412, exception);
            }
        },

        //
        // Overwrite a specific data component in a specific store.
        postUpdateComponent: function(req, res) {
            if (!req._body || (req.body == null) || !req.body) {
                res.send(400, "Invalid POST missing required request body.");
                return;
            }
            if ((req.body.store == null) || !req.body.store) {
                res.send(400, "Invalid POST mising 'store' property in request body.");
                return;
            }
            if ((req.body.address == null) || !req.body.address) {
                res.send(400, "Invalid POST missing 'address' property in request body.");
                return;
            }
            if ((req.body.data == null) || !req.body.data) {
                res.send(400, "Invalid POST missing 'data' property in request body.");
                return;
            }
            var store = onmStoreDictionary[req.body.store];
            if ((store == null) || !store) {
                res.send(404, "The specified onm data store '" + req.body.store + "' does not exist on this server.");
                return;
            }
            var address = undefined;
            try {
                address = store.model.createAddressFromHashString(req.body.address);
            } catch (exception) {
                console.error(exception);
                res.send(403, "Invalid address '" + req.body.address + "' is outside of the data model's address space.");
                return;
            }
            var namespace = undefined
            try {
                namespace = store.openNamespace(address);
            } catch (exception) {
                console.error(exception);
                res.send(404, "Data component '" + req.body.address + "' does not exist in store '" + req.body.store + "'.");
                return;
            }
            try {
                namespace.fromJSON(req.body.data);
            } catch (exception) {
                console.error(exception);
                res.send(400, "Unable to de-serialize JSON data in request.");
                return;
            }
            res.send(204);
        },

        //
        // Delete all in-memory onm data stores. Expose w/caution.
        deleteStores: function(req, res) {
            for (storeKey in onmStoreDictionary) {
                console.log("deleting in-memory data store '" + storeKey + "'.");
                delete onmStoreDictionary[storeKey];
            }
            res.send(204);
        },

        //
        // Delete the named onm data store. Or, if an address is specified delete
        // the addressed data component in the given store instead.
        deleteStoreOrComponent: function(req, res) {
            if (!req._body || (req.body == null) || !req.body) {
                res.send(400, "Invalid POST missing required request body.");
                return;
            }
            if ((req.body.store == null) || !req.body.store) {
                res.send(400, "Invalid POST missing 'store' property in request body.");
                return;
            }
            var store = onmStoreDictionary[req.body.store];
            if ((store == null) || !store) {
                res.send(404, "The specified onm data store '" + req.body.store + "' does not exist on this server.");
                return;
            }
            // Delete the store if an address was not specified in the request body.
            if ((req.body.address == null) || !req.body.address) {
                console.log("deleting in-memory data store '" + req.body.store + "'.");
                delete onmStoreDictionary[req.body.store];
                res.send(204);
                return;
            }
            // Attempt to delete the specified data component.
            var addressHash = req.body.address
            var address = undefined
            try {
                address = store.model.createAddressFromHashString(addressHash);
            } catch (exception) {
                console.error(exception);
                res.send(403, "Invalid address '" + req.body.address + "' is outside of the data model's address space.");
                return;
            }
            try {
                store.removeComponent(address);
                console.log("removed data component '" + addressHash + "' from in-memory store '" + req.body.store + "'.");
                res.send(204);
            } catch (exception) {
                res.send(412, exception);
            }
        }
    };
};

