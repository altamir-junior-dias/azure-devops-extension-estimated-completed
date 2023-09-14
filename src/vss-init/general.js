(() => {
    window.loadLibraries = (libraries, callback) => {
        let loadedCounter = libraries.length;

        libraries.forEach(library => {
            let scriptTag = document.createElement('script');
            scriptTag.src = library;
            document.head.appendChild(scriptTag);

            scriptTag.onload = () => {
                loadedCounter -= 1;

                if (loadedCounter == 0) {
                    callback();
                }
            };
        });
    };

    window.loadInternalLibraries = (callback) => {
        let libraries = [
            'core-azure-devops-backlogs.js',
            'core-azure-devops-iterations.js',
            'core-azure-devops-teams.js',
            'core-azure-devops-queries.js',
            'core-azure-devops-teams.js',
            'core-azure-devops-work-items.js',
            'core-azure-devops-work-item-types.js'
        ];

        loadLibraries(libraries, callback);
    };

    window.loadAzureDevOpsServices = (callback) => {
        VSS.require([
            'TFS/Work/RestClient',
            'VSS/Service', 
            'TFS/WorkItemTracking/RestClient',
            'TFS/Core/RestClient'
        ], (
            TFSWorkRestClient,
            VSSService, 
            TFSWorkItemTrackingRestClient,
            TFSCoreRestClient
        ) => {
            window.AzureDevOpsServices = {
                tfsWebAPIClient: TFSWorkRestClient?.getClient(),
                witClient: VSSService?.getCollectionClient(TFSWorkItemTrackingRestClient.WorkItemTrackingHttpClient),
                witRestClient: TFSWorkItemTrackingRestClient.getClient(),
                tfsCoreRestClient: TFSCoreRestClient.getClient()
            };            

            callback();
        });        
    };    
})();