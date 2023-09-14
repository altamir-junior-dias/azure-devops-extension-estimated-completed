(() => {
    let azureDevOps = window.AzureDevOps || {};
    let service = azureDevOps.Teams || {};

    service.getAll = () => {
        let deferred = $.Deferred();

        let projectId = VSS.getWebContext().project.id;

        AzureDevOpsServices.tfsCoreRestClient.getTeams(projectId).then(teams => {
            deferred.resolve(teams.map(team => {
                return {
                    id: team.id,
                    name: team.name
                };
            }));
        });

        return deferred.promise();
    };

    window.AzureDevOps = azureDevOps;
    window.AzureDevOps.Teams = service;
})();