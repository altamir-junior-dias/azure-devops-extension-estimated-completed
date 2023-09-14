(() => {
    const loadExternalLibraries = (callback) => {
        let libraries = [
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
            WidgetHelpers.IncludeWidgetConfigurationStyles();

            loadAzureDevOpsServices(() => {
                loadInternalLibraries(() => {
                    VSS.register(widgetId, () => {
                        return {
                            load: (widgetSettings, widgetConfigurationContext) => {
                                window.LoadConfiguration(widgetSettings, widgetConfigurationContext, WidgetHelpers.WidgetEvent);
                                return WidgetHelpers.WidgetStatusHelper.Success();
                            },
                            onSave: () => {
                                return WidgetHelpers.WidgetConfigurationSave.Valid(window.GetSettingsToSave());
                            }
                        };                    
                    });

                    VSS.notifyLoadSucceeded();
                });
            });
        });
    });
})();