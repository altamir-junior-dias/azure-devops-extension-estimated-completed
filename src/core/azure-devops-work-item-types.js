(() => {
    let azureDevOps = window.AzureDevOps || {};
    let service = azureDevOps.WorkItemTypes || {};

    service.getFields = (referenceName) => {
        let deferred = $.Deferred();

        let webContext = VSS.getWebContext();
        AzureDevOpsServices.witClient.getWorkItemType(webContext.project.id, referenceName).then(wotkItemType => {
            let deferreds = [];

            wotkItemType.fields.forEach(field => deferreds.push(AzureDevOpsServices.witRestClient.getField(field.referenceName)));

            Promise.all(deferreds).then(results => {
                deferred.resolve(results.map(result => {
                    return {
                        name: result.name,
                        referenceName: result.referenceName,
                        type: result.type
                    };
                }));
            });
        });

        return deferred.promise();
    };

    window.AzureDevOps = azureDevOps;
    window.AzureDevOps.WorkItemTypes = service;
})();