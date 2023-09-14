(() => {
    let azureDevOps = window.AzureDevOps || {};
    let service = azureDevOps.WorkItems || {};

    service.getByIds = (ids, fields) => {
        fields = fields || [];
    
        let deferred = $.Deferred();
    
        let deferreds = [];
    
        for(let i = 0; i < ids.length; i += 50)
        {
            let pack = ids.slice(i, i + 50);

            deferreds.push(AzureDevOpsServices.witClient.getWorkItems(pack, fields));
        }
    
        Promise.all(deferreds).then(result => {
            let items = [].concat.apply([], result).map(item => {
                let itemWithFields = item.fields;
                itemWithFields.id = item.id;
    
                return itemWithFields;
            });
    
            deferred.resolve(items);
        });
    
        return deferred.promise();
    };

    window.AzureDevOps = azureDevOps;
    window.AzureDevOps.WorkItems = service;
})();