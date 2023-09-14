(() => {
    let azureDevOps = window.AzureDevOps || {};
    let service = azureDevOps.Queries || {};

    service.get = (queryId) => {
        let deferred = $.Deferred();
        let webContext = VSS.getWebContext();

        let sendResult = (deferred, result) => {
            result.children.sort((a, b) => {
                let result = a.isFolder && !b.isFolder ? -1 : !a.isFolder && b.isFolder ? 1 : 0;

                if (result == 0) {
                    result = a.path > b.path ? 1 : a.path < b.path ? -1 : 0;
                }

                return result;
            });

            deferred.resolve(result);
        };

        AzureDevOpsServices.witRestClient.getQuery(webContext.project.id, queryId, 'all', 1).then(function (query) {
            let children = query.children ?? [];
            let childrenQueries = children.filter(query => !(query.hasChildren ?? false));
            let childrenFolders = children.filter(query => query.hasChildren ?? false);

            let result = {
                id: query.id,
                name: query.name,
                path: query.path,
                isFolder: query.isFolder ?? false,
                children: childrenQueries.map(childQuery => {
                    return {
                        id: childQuery.id,
                        name: childQuery.name,
                        path: childQuery.path,
                        isFolder: childQuery.isFolder ?? false,
                        children: []
                    };
                })
            };

            if (childrenFolders.length > 0) {
                let deferreds = [];

                childrenFolders.forEach(child => deferreds.push(service.get(child.id)));

                Promise.all(deferreds).then(queries => {
                    queries.forEach(childQuery => {
                        result.children.push({
                            id: query.id,
                            name: childQuery.name,
                            path: childQuery.path,
                            isFolder: childQuery.isFolder ?? false,
                            children: childQuery.children
                        });
                    });

                    sendResult(deferred, result);
                });

            } else {

                sendResult(deferred, result);
            }
        });

        return deferred.promise();
    };

    service.getAllShared = () => {
        let deferred = $.Deferred();

        service.get('Shared Queries').then(query => deferred.resolve(query.children));

        return deferred.promise();
    };

    service.getById = (queryId) => {
        let deferred = $.Deferred();
        
        let projectId = VSS.getWebContext().project.id;

        AzureDevOpsServices.witRestClient.getQuery(projectId, queryId, 'all', 1).then(query => {
            deferred.resolve({
                wiql: query.wiql,
                type: query.queryType
            });
        });

        return deferred.promise();
    };

    service.getFields = (queryId) => {
        let deferred = $.Deferred();
        let webContext = VSS.getWebContext();

        AzureDevOpsServices.witRestClient.getQuery(webContext.project.id, queryId, 'all', 1).then(query => {
            let deferreds = [];

            query.columns.forEach(column => deferreds.push(AzureDevOpsServices.witRestClient.getField(column.referenceName)));

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

    service.getItems = (query) => {
        let deferred = $.Deferred();

        let projectId = VSS.getWebContext().project.id;

        AzureDevOpsServices.witClient.queryByWiql({ query: getCleanedWiql(query.wiql) }, projectId).then(result => {
            let ids = result.workItems.map(r => r.id);

            if (ids.length > 0) {
                AzureDevOps.WorkItems.getByIds(ids, getWiqlFields(query.wiql)).then(items => deferred.resolve(items));
            } else {
                deferred.resolve(items);
            }
        });

        return deferred.promise();
    };

    let getCleanedWiql = (wiql) => {
        let wiqlFields = wiql
            .substring(wiql.toUpperCase().indexOf("SELECT") + 7, wiql.toUpperCase().indexOf("FROM"))
            .trim();

        return wiql.replace(wiqlFields, '[System.Id]');
    };

    let getWiqlFields = (wiql) => {
        let wiqlFields = wiql
            .substring(wiql.toUpperCase().indexOf("SELECT") + 7, wiql.toUpperCase().indexOf("FROM"))
            .trim();

        let fields = wiqlFields
            .toUpperCase()
            .replace('[SYSTEM.ID]', '')
            .trim()
            .split(',')
            .filter(f => f.trim() != '')
            .map(f => f.replace('[', '').replace(']', '').trim());

        return fields;
    };

    window.AzureDevOps = azureDevOps;
    window.AzureDevOps.Queries = service;    
})();