(() => {
    let $context = null;
    let $widgetEvent = null;

    let $title = $('#title');
    let $source = $('#source');
    let $team = $('#team');
    let $backlog = $('#backlog');
    let $query = $('#query');
    let $groupField = $('#group-field');
    let $groupBy = $('#group-by');
    let $iterations = $('#iterations');
    let $daysBehind = $('#days-behind');
    let $estimatedField = $('#estimated-field');
    let $completedField = $('#completed-field');

    let $teamArea = $('#team-area');
    let $backlogArea = $('#backlog-area');
    let $queryArea = $('#query-area');
    let $groupByArea = $('#group-by-area');
    let $iterationsArea = $('#iterations-area');
    let $daysBehindArea = $('#days-behind-area');

    let $dateFields = [];

    const addQueryToSelect = (query, level) => {
        level = level ?? 0;

        if (query.isFolder ?? false) {
            $query.append($('<option>')
                .val(query.id)
                .html('&nbsp;&nbsp;'.repeat(level) + query.name)
                .attr('data-level', '0')
                .css('font-weight', 'bold')
                .attr('disabled', 'disabled'));

            if (query.children.length > 0)
            {
                query.children.forEach(innerQuery => {
                    addQueryToSelect(innerQuery, level + 1);
                });
            }

        } else {
            $query.append($('<option>')
                .val(query.id)
                .html('&nbsp;&nbsp;'.repeat(level) + query.name)
                .attr('data-level', level));
        }
    };

    const changeBacklog = (notifyWidget) => {
        let deferred = $.Deferred();

        notifyWidget = notifyWidget ?? false;

        AzureDevOps.Backlogs.getFields($team.val(), $backlog.val()).then(fields => {
            updateFields(fields);

            if (notifyWidget) {
                changeSettings();
            }

            deferred.resolve();
        });

        return deferred.promise();
    };

    const changeGroupField = (notifyWidget) => {
        notifyWidget = notifyWidget ?? false;

        if ($dateFields.findIndex(dateField => dateField == $groupField.val()) > -1) {
            $groupByArea.show();

            if ($groupBy.val() == null) {
                $groupBy.val('week');
            }

            if ($source.val() == 'backlog') {
                $daysBehindArea.show();
            } else {
                $daysBehindArea.hide();
            }

            $iterationsArea.hide();
        } else {
            $groupByArea.hide();
            $daysBehindArea.hide();

            if ($source.val() == 'backlog' && $groupField.val() == 'System.IterationPath') {
                $iterationsArea.show();
            } else {
                $iterationsArea.hide();
            }
        }

        if (notifyWidget) {
            changeSettings();
        }
    };

    const changeQuery = (notifyWidget) => {
        let deferred = $.Deferred();

        notifyWidget = notifyWidget ?? false;

        AzureDevOps.Queries.getFields($query.val()).then(fields => {
            updateFields(fields);

            if (notifyWidget) {
                changeSettings();
            }

            deferred.resolve();
        });        
        
        return deferred.promise();
    };

    const changeSettings = () => {
        let eventName = $widgetEvent.ConfigurationChange;
        let eventArgs = $widgetEvent.Args(getSettingsToSave());
        $context.notify(eventName, eventArgs);
    };

    const changeSource = (notifyWidget) => {
        notifyWidget = notifyWidget ?? false;

        if ($source.val() == 'backlog') {
            $teamArea.show();
            $backlogArea.show();
            $queryArea.hide();
        } else {
            $teamArea.hide();
            $backlogArea.hide();
            $queryArea.show();
            $iterationsArea.hide();
            $daysBehind.hide();
        }

        if (notifyWidget) {
            changeSettings();
        }
    };

    const changeTeam = (notifyWidget) => {
        let deferred = $.Deferred();

        notifyWidget = notifyWidget ?? false;

        AzureDevOps.Backlogs.getAll($team.val()).then(backlogs => {
            $backlog.html('');
            backlogs.forEach(backlog => $backlog.append($('<option>').val(backlog.id).html(backlog.name)));

            if (notifyWidget) {
                changeSettings();
            }

            deferred.resolve();
        });

        return deferred.promise();
    };

    const loadConfiguration = (settings, context, widgetEvent) => {
        $context = context;
        $widgetEvent = widgetEvent;

        prepareControls(getSettings(settings));
    };

    const getSettings = (widgetSettings) => {
        let settings = JSON.parse(widgetSettings.customSettings.data);

        return {
            title: settings?.title ?? 'Estimated x Completed',
            source: settings?.source ?? 'backlog',
            query: settings?.query ?? '770583d1-6cec-44ad-841f-823ed722ddb1',
            groupField: settings?.groupField ?? 'System.IterationPath', 
            groupBy: settings?.groupBy ?? 'itself',
            estimatedField: settings?.estimatedField ?? 'Microsoft.VSTS.Scheduling.OriginalEstimate',
            completedField: settings?.completedField ?? 'Microsoft.VSTS.Scheduling.CompletedWork',
            team: settings?.team ?? VSS.getWebContext().team.id,
            backlog: settings?.backlogId ?? 'Microsoft.TaskCategory',
            iterations: settings?.iterations ?? 6,
            daysBehind: settings?.daysBehind ?? 30
        };
    };

    const getSettingsToSave = () => {
        return {
            data: JSON.stringify({
                title: $title.val(),
                source: $source.val(),

                team: $team.val(),
                backlog: $backlog.val(),

                query: $query.val(),

                groupField: $groupField.val(),
                groupBy: $groupByArea.is(':visible') ? $groupBy.val() : 'itself', 
                estimatedField: $estimatedField.val(),
                completedField: $completedField.val(),

                iterations: $iterations.val(),
                daysBehind: $daysBehind.val()
            })
        };
    };

    const prepareControls = (settings) => {
        $title.on('change', changeSettings);
        $source.on('change', changeSource);
        $team.on('change', changeTeam);
        $backlog.on('change', changeBacklog);
        $query.on('change', changeQuery);
        $groupField.on('change', changeGroupField);
        $estimatedField.on('change', changeSettings);
        $completedField.on('change', changeSettings);
        $groupBy.on('change', changeSettings);
        $iterations.on('change', changeSettings);
        $daysBehind.on('change', changeSettings);

        let deferreds = [];
        deferreds.push(AzureDevOps.Teams.getAll());
        deferreds.push(AzureDevOps.Queries.getAllShared());

        Promise.all(deferreds).then(results => {
            let teams = results[0];
            teams.forEach(team => $team.append($('<option>').val(team.id).html(team.name)));

            let queries = results[1];
            $query.append($('<option>'));
            queries.forEach(query => addQueryToSelect(query));

            setValues(settings);
        });
    };

    const setValues = (settings) => {
        $title.val(settings.title);

        $source.val(settings.source);
        changeSource(false);

        if (settings.source == 'backlog') {
            $team.val(settings.team);
            changeTeam(false).then(_ => {

                $backlog.val(settings.backlog);
                changeBacklog(false).then(_ => {

                    $groupField.val(settings.groupField);
                    changeGroupField(false);

                    $groupBy.val(settings.groupBy);

                    $estimatedField.val(settings.estimatedField);
                    $completedField.val(settings.completedField);

                    $iterations.val(settings.iterations);
                    $daysBehind.val(settings.daysBehind);
                });
            });
    
        } else {
            $query.val(settings.query);
            changeQuery(false).then(_ => {
                $groupField.val(settings.groupField);
                $estimatedField.val(settings.estimatedField);
                $completedField.val(settings.completedField);
            });    
        }
    };

    const updateFields = (fields) => {
        $groupField.html('');
        $estimatedField.html('');
        $completedField.html('');

        $dateFields = [];

        fields
            .filter(field => {
                if ($source.val() == 'backlog') {
                    return field.referenceName == 'System.IterationPath' || field.type == 2;
                } else {
                    return field.type == 0 || field.type == 2 || field.type == 5;
                }
            })
            .forEach(field => {
                if (field.type == 2) {
                    $dateFields.push(field.referenceName);
                }

                $groupField.append($('<option>').val(field.referenceName).html(field.name));
            });

        fields
            .filter(field => field.type == 7)
            .forEach(field => {
                $estimatedField.append($('<option>').val(field.referenceName).html(field.name));

                $completedField.append($('<option>').val(field.referenceName).html(field.name));
            });
    };

    window.LoadConfiguration = loadConfiguration;
    window.GetSettingsToSave = getSettingsToSave;
})();
