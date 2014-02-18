
module.exports = function (app_, routePrefix_, onmModelDictionary_, onmStoreDictionary_) {

    var app = app_;
    var routePrefix = (routePrefix_ != null) && routePrefix || "";

    var onmRoutes = require('./routes')(onmModelDictionary_, onmStoreDictionary_);

    return {

        registerRoute_GetAppMeta: function() {
            app.get(routePrefix + "/meta", onmRoutes.getAppMeta);
        },
        registerRoute_GetModels: function() {
            app.get(routePrefix + "/models", onmRoutes.getModels);
        },
        registerRoute_GetStores: function() {
            app.get(routePrefix + "/stores", onmRoutes.getStores);
        },
        registerRoute_GetStoreAddresses: function() {
            app.get(routePrefix + "/addresses/:store?/:address?", onmRoutes.getStoreAddresses);
        },
        registerRoute_GetStoreData: function() {
            app.get(routePrefix + "/data/:store?/:address?", onmRoutes.getStoreData);
        },
        registerRoute_PostCreateStore: function() {
            app.post(routePrefix + "/create/store", onmRoutes.postCreateStore);
        },
        registerRoute_PostCreateComponent: function() {
            app.post(routePrefix + "/create/component", onmRoutes.postCreateComponent);
        },
        registerRoute_PostUpdateComponent: function() {
            app.post(routePrefix + "/update/component", onmRoutes.postUpdateComponent);
        },
        registerRoute_DeleteRemoveStores: function() {
            app.del(routePrefix + "/remove/stores", onmRoutes.deleteStores);
        },
        registerRoute_DeleteRemoveStore: function() {
            app.del(routePrefix + "/remove/store", onmRoutes.deleteStoreOrComponent);
        },
        registerRoute_DeleteRemoveComponent: function() {
            app.del(routePrefix + "/remove/component", onmRoutes.deleteStoreOrComponent);
        }
    };
};
