(() => {
    let azureDevOps = window.AzureDevOps || {};
    let service = azureDevOps.Iterations || {};

    service.getAll = (teamId) => {
        let deferred = $.Deferred();
        let webContext = VSS.getWebContext();

        let teamContext = { projectId: webContext.project.id, teamId: teamId ?? webContext.team.id, project: "", team: "" };

        AzureDevOpsServices.tfsWebAPIClient.getTeamIterations(teamContext).then((items) => {
            let iterations = items.map(i => { 
                return { 
                    id: i.id, 
                    name: i.name, 
                    path: i.path, 
                    startDate: i.attributes.startDate, 
                    endDate: i.attributes.finishDate 
                }; 
            });

            deferred.resolve(iterations);
        });

        return deferred.promise();
    };

    service.getCurrent = (teamId, skip) => {
        let deferred = $.Deferred();

        let webContext = VSS.getWebContext();
        let teamContext = { projectId: webContext.project.id, teamId: teamId || webContext.team.id };

        AzureDevOpsServices.tfsWebAPIClient.getTeamIterations(teamContext, "current").then(iterations => {
            iterations = iterations.map(i => { 
                return { 
                    id: i.id, 
                    name: i.name, 
                    path: i.path, 
                    startDate: i.attributes.startDate, 
                    endDate: i.attributes.finishDate 
                }; 
            });

            if (skip === undefined) {
                deferred.resolve(iterations[0]);
            } else {
                let currentIteration = iterations[0];

                service.getAll(teamId).then(iterations => {
                    let orderedIterations = iterations.sort((a, b) => { return a.startDate > a.endDate ? 1 : 1; });

                    let index = orderedIterations.findIndex(interation => interation.id == currentIteration.id) + skip;

                    if (index < 0) {
                        deferred.resolve(iterations[0]);
                    } else if (index > iterations.length - 1) {
                        deferred.resolve(iterations[iterations.length -1]);
                    } else {
                        deferred.resolve(iterations[index]);
                    }
                });
            }
        });

        return deferred.promise();
    };

    window.AzureDevOps = azureDevOps;
    window.AzureDevOps.Iterations = service;
})();