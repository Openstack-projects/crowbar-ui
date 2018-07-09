(function() {

    angular
        .module('suseData.crowbar')
        .factory('upgradeStatusFactory', upgradeStatusFactory);

    upgradeStatusFactory.$inject = ['$http', '$timeout', 'upgradeFactory', 'UPGRADE_STEP_STATES'];
    /* @ngInject */
    function upgradeStatusFactory($http, $timeout, upgradeFactory, UPGRADE_STEP_STATES) {
        var factory = {
            waitForStepToEnd: waitForStepToEnd,
            syncStatusFlags: syncStatusFlags,
        };

        return factory;

        /**
         * Fetch status info from backend and update flags in passed object
         *
         * @param {string} step - name of step to be checked
         * @param {Object} flagsObject - object with `running` and `completed` fields to be updated
         * @param {function} onRunning - Callback to be executed if current status is running
         * @param {function} onCompleted - Callback to be executed if current status is completed
         * @param {function} [onFailed=undefined] - Callback to be executed if current status is failed
         * @param {function} [postSync=undefined] - Callback to be executed after flags have been
         *     synced and other callbacks executed
         */
        function syncStatusFlags(step, flagsObject, onRunning, onCompleted, onFailed, postSync) {
            upgradeFactory.getStatus()
                .then(
                    function (response) {
                        flagsObject.running = response.data.steps[step].status === UPGRADE_STEP_STATES.running;
                        flagsObject.completed = response.data.steps[step].status === UPGRADE_STEP_STATES.passed;

                        if (flagsObject.running && angular.isDefined(onRunning)) {
                            onRunning(response);
                        } else if (flagsObject.completed && angular.isDefined(onCompleted)) {
                            onCompleted(response);
                        } else if (response.data.steps[step].status == UPGRADE_STEP_STATES.failed) {
                            if (angular.isFunction(onFailed)) {
                                onFailed(response);
                            }
                        }

                        if (angular.isFunction(postSync)) {
                            postSync(response);
                        }

                    }
                );
        }

        /**
         * Polls for upgrade status until step `step` is `passed`.
         *
         * @param {string} step - Step name as defined in status API response
         * @param {int} pollingInterval - Interval used to poll the upgrade status
         * @param {function} onSuccess - Callback to be executed with last response from status API
         *     when waiting time finishes successfully
         * @param {function} onError - Callback to be executed if status API returns error
         * @param {function} [onRunning=undefined] - If specified, will be executed each time with success
         *     responses as parameter until the specified step is completed.
         * @param {int} [allowedDowntimeLeft=0] - If specified, temporary unavailability of status
         *     API will not trigger `onError` handler and will not stop polling. The downtime
         *     allowance is common for whole call so if there are multiple short unavailability
         *     periods, the total time (sum) is checked.
         */
        function waitForStepToEnd(
            step,
            pollingInterval,
            onSuccess,
            onError,
            onRunning,
            allowedDowntimeLeft
        ) {
            allowedDowntimeLeft = angular.isDefined(allowedDowntimeLeft) ? allowedDowntimeLeft : 0;
            upgradeFactory.getStatus()
                .then(
                    function (response) {
                        var stepStatus = response.data.steps[step].status;
                        // If the step is completed, trigger its success handler
                        if (stepStatus === UPGRADE_STEP_STATES.passed) {
                            onSuccess(response);
                        } else if (stepStatus === UPGRADE_STEP_STATES.failed) {
                            // on step failure trigger error handler
                            onError(response);
                        } else {

                            // If the response needs to be processed before the step if completed
                            if (angular.isFunction(onRunning)) {
                                onRunning(response);
                            }

                            // schedule another check
                            $timeout(
                                factory.waitForStepToEnd, pollingInterval, true,
                                step, pollingInterval, onSuccess, onError, onRunning,
                                allowedDowntimeLeft
                            );
                        }
                    },
                    function (errorResponse) {
                        // stop polling and run error callback if we ran out of allowed downtime
                        if (allowedDowntimeLeft <= 0) {
                            onError(errorResponse);
                        } else {
                            // schedule another check but with less downtime allowance
                            $timeout(
                                factory.waitForStepToEnd, pollingInterval, true,
                                step, pollingInterval, onSuccess, onError, onRunning,
                                allowedDowntimeLeft - pollingInterval
                            );
                        }
                    }
                );
        }
    }
})();
