(() => {
    let azureDevOps = window.AzureDevOps || {};
    let service = azureDevOps.Backlogs || {};

    service.getAll = (teamId) => {
        let deferred = $.Deferred();

        let context = {
            projectId: VSS.getWebContext().project.id,
            teamId: teamId
        };

        AzureDevOpsServices.tfsWebAPIClient.getBacklogs(context).then(backlogs => {
            backlogs.sort((a, b) => a.rank > b.rank ? -1 : a.rank < b.rank ? 1 : 0)
            deferred.resolve(backlogs
                .map(backlog => {
                    return {
                        id: backlog.id,
                        name: backlog.name
                    };
                }));
        });

        return deferred.promise();
    };

    service.getFields = (teamId, backlogId) => {
        let deferred = $.Deferred();

        let context = {
            projectId: VSS.getWebContext().project.id,
            teamId: teamId
        };

        AzureDevOpsServices.tfsWebAPIClient.getBacklog(context, backlogId).then(backlog => {
            let deferreds = [];

            backlog.workItemTypes.forEach(workItemType => deferreds.push(AzureDevOps.WorkItemTypes.getFields(workItemType.name)));

            Promise.all(deferreds).then(result => {
                var fields = result
                    .flat(1)
                    .filter((value, index, self) => self.findIndex(s => s.referenceName == value.referenceName) === index)
                    .map(field => {
                        return {
                            name: field.name,
                            referenceName: field.referenceName,
                            type: field.type
                        };
                    });

                deferred.resolve(fields);
            });
        });

        return deferred.promise();
    };

    service.getWorkItemTypes = (teamId, backlogId) => {
        let deferred = $.Deferred();

        let context = {
            projectId: VSS.getWebContext().project.id,
            teamId: teamId
        };

        AzureDevOpsServices.tfsWebAPIClient.getBacklog(context, backlogId).then(backlog => {
            deferred.resolve(backlog.workItemTypes.map(workItemType => workItemType.name));
        });

        return deferred.promise();
    };

    window.AzureDevOps = azureDevOps;
    window.AzureDevOps.Backlogs = service;
})();