(() => {
    let $title = $('#title');

    const getChartConfiguration = (data) => {
        return {
            type: 'bar',
            data: {
                labels: data.map(d => d.name),
                datasets: [
                    {
                        label: 'Estimated' ,
                        backgroundColor: 'rgb(25, 114, 120, 0.5)',
                        borderColor: '#417690',
                        data: data.map(d => d.estimated)
                    },
                    {
                        label: 'Completed',
                        backgroundColor: 'rgb(236, 212, 68, 0.5)',
                        borderColor: '#417690',
                        data: data.map(d => d.completed)
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 3,
                scales: { x: { title: { display: 'true' } } },
                plugins: {
                    title:  { display: false },
                    legend: { display: true, position: 'bottom' },
                    tooltip: { enabled: true }
                }
            }
        };
    };

    const getData = (settings) => {
        let deferred = $.Deferred();
        
        if (settings.source == 'backlog') {
            getDataFromBacklog(settings).then(data => deferred.resolve(data));
        } else {
            getDataFromQuery(settings).then(data => deferred.resolve(data));
        }        

        return deferred.promise();
    };

    const getDataFromBacklog = (settings) => {
        let deferred = $.Deferred();

        let deferreds = [];
        deferreds.push(AzureDevOps.Backlogs.getWorkItemTypes(settings.team, settings.backlog));

        if (settings.groupField == 'System.IterationPath') {
            deferreds.push(getIterations(settings));
        }
        
        Promise.all(deferreds).then(results => {
            let workItemTypes = results[0];
            let iterations = results.length > 1 ? results[1] : []; 

            let workItemTypesFilter = workItemTypes.map(workItemType => `'${workItemType}'`).join(',');
            let iterationPathFilter = iterations.map(iteration => `'${iteration.path}'`).join(',');

            let periodOfTimeFilter = null;
            if (settings.groupField == 'System.IterationPath') {
                periodOfTimeFilter = `[System.IterationPath] in (${iterationPathFilter})`;
            } else {
                periodOfTimeFilter = `[${settings.groupField}] >= @today - ${settings.daysBehind}`;
            }

            let query = {
                wiql: `SELECT [${settings.estimatedField}], [${settings.completedField}], [${settings.groupField}] ` +
                    `FROM WorkItems ` +
                    `WHERE [System.WorkItemType] in (${workItemTypesFilter})` +
                    `  AND ${periodOfTimeFilter}`,
                type: 1
            };

            AzureDevOps.Queries.getItems(query).then(items => {
                if (settings.groupBy == 'itself') {
                    deferred.resolve(groupByField(items, settings));
                } else {
                    deferred.resolve(groupByDateField(items, settings));
                }
            });
        });

        return deferred.promise();
    };

    const getDataFromQuery = (settings) => {
        let deferred = $.Deferred();

        AzureDevOps.Queries.getById(settings.query).then(query => {
            AzureDevOps.Queries.getItems(query).then(items => {
                if (settings.groupBy == 'itself') {
                    deferred.resolve(groupByField(items, settings));
                } else {
                    deferred.resolve(groupByDateField(items, settings));
                }
            });
        });

        return deferred.promise();
    };

    const getIterations = (settings) => {
        var deferred = $.Deferred();

        var deferreds = [];
        for (let counter = 0; counter <= settings.iterations -1; counter++) {
            deferreds.push(AzureDevOps.Iterations.getCurrent(settings.team, counter * -1));
        }

        Promise.all(deferreds).then(iterations => {
            deferred.resolve(iterations);
        });

        return deferred.promise();
    };

    const getSettings = (widgetSettings) => {
        var settings = JSON.parse(widgetSettings.customSettings.data);

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

    const groupByDateField = (items, settings) => {
        let minDate = new Date(Math.min(...items.map(i => new Date(i[settings.groupField]))));
        let maxDate = new Date(Math.max(...items.map(i => new Date(i[settings.groupField]))));

        if (settings.groupBy == 'week' && settings.groupBy == 'bi-week') {
            minDate.setDate(minDate.getDate() - minDate.getDay());
            maxDate.setDate(maxDate.getDate() + 6 - maxDate.getDay());

        } else if (settings.groupBy == 'month') {
            minDate.setDate(1);
            maxDate.setMonth(maxDate.getMonth() + 1);
            maxDate.setDate(1);
            maxDate.setDate(maxDate.getDate() - 1);

        } else if (settings.groupBy == 'quarter') {
            let minQuarter = Math.floor(minDate.getMonth() / 3 + 1);
            minDate.setDate(1);
            minDate.setMonth(minQuarter * 3 - 3);
            let maxQuarter = Math.floor(maxDate.getMonth() / 3 + 1);
            maxDate.setMonth(maxQuarter * 3);
            maxDate.setDate(1);
            maxDate.setDate(maxDate.getDate() - 1);
        }

        let stepDays = settings.groupBy == 'week' ? 7 : settings.groupBy == 'bi-week' ? 14 : 0;
        let stepMonths = settings.groupBy == 'month' ? 1 : settings.groupBy == 'quarter' ? 3 : 0;

        let dateGroups = [];
        let currentDate = minDate;

        while (currentDate <= maxDate) {
            let groupStart = new Date(currentDate.getTime());
            currentDate.setDate(currentDate.getDate() + stepDays);
            currentDate.setMonth(currentDate.getMonth() + stepMonths);
            let groupFinish = new Date(currentDate.getTime());
            groupFinish.setDate(groupFinish.getDate() - 1);

            dateGroups.push({
                start: groupStart,
                finish: groupFinish,
                items: items.filter(item => {
                    let date = new Date(item[`${settings.groupField}`]);
                    return date >= groupStart && date <= groupFinish;
                })
            });
        }

        let currentLocale = navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language;

        return dateGroups.map(dateGroup => { 
            return {
                name: `${dateGroup.start.toLocaleDateString(currentLocale, { year: 'numeric', month: 'numeric', day: 'numeric' })} - ${dateGroup.finish.toLocaleDateString(currentLocale, { year: 'numeric', month: 'numeric', day: 'numeric' })}`,
                estimated: dateGroup.items
                    .map(r => r[`${settings.estimatedField}`] ?? 0)
                    .reduce((previous, current) => previous + current, 0),
                completed: dateGroup.items
                    .map(r => r[`${settings.completedField}`] ?? 0)
                    .reduce((previous, current) => previous + current, 0)
            };
        });
    };

    const groupByField = (items, settings) => {
        let groups = items
            .map(item => item[settings.groupField])
            .filter((value, index , self) => index == self.indexOf(value))
            .map(item => {
                return {
                    name: item,
                    estimated: items
                        .filter(d => d[settings.groupField] == item)
                        .map(r => r[`${settings.estimatedField}`] ?? 0)
                        .reduce((previous, current) => previous + current, 0),
                    completed: items
                        .filter(d => d[settings.groupField] == item)
                        .map(r => r[`${settings.completedField}`] ?? 0)
                        .reduce((previous, current) => previous + current, 0)
                }
            });

        groups.sort((a,b) => a.name > b.name ? 1 : a.name < b.name ? -1 : 0);

        return groups;
    };

    const load = (widgetSettings) => {
        var settings = getSettings(widgetSettings);

        $title.text(settings.title);

        getData(settings).then(data => {
            prepareChart(data);
        });
    };

    const prepareChart = (data) => {
        let chartArea = document.getElementById('chart').getContext('2d');

        if (window['chart']) {
            if (window['chart'].destroy) {
                window['chart'].destroy();
            } else {
                window['chart'] = null;
            }
        }

        window['chart'] = new Chart(chartArea, getChartConfiguration(data));
    };

    window.LoadWidget = load;
})();