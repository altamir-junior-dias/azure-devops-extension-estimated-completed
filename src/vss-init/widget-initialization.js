(() => {
    const loadExternalLibraries = (callback) => {
        let libraries = [
            'lib/chart.min.js',
            'lib/VSS.SDK.js'
        ];

        loadLibraries(libraries, callback);
    };

    const widgetId = document.currentScript.getAttribute('data-widget-id');
    const widgetUri = document.currentScript.getAttribute('data-widget-uri');

    loadExternalLibraries(() => {
        VSS.init({                        
            explicitNotifyLoaded: true,
            usePlatformStyles: true
        });

        VSS.require([
            'TFS/Dashboards/WidgetHelpers', 
            widgetUri + '.js'
        ], (WidgetHelpers) => {
            WidgetHelpers.IncludeWidgetStyles();

            loadAzureDevOpsServices(() => {
                loadInternalLibraries(() => {
                    VSS.register(widgetId, () => {
                        return {
                            load: (widgetSettings) => {
                                window.LoadWidget(widgetSettings);
                                return WidgetHelpers.WidgetStatusHelper.Success();
                            },
                            reload: (widgetSettings) => {
                                window.LoadWidget(widgetSettings);
                                return WidgetHelpers.WidgetStatusHelper.Success();
                            }
                        };                    
                    });

                    VSS.notifyLoadSucceeded();
                });
            });
        });
    });
})();