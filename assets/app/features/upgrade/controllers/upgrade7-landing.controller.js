(function() {
  'use strict';

  /**
   * @ngdoc function
   * @name crowbarApp.controller:Upgrade7LandingCtrl
   * @description
   * # Upgrade7LandingCtrl
   * This is the controller used on the Upgrade landing page
   */
  angular.module('crowbarApp')
    .controller('Upgrade7LandingCtrl', Upgrade7LandingCtrl);

  Upgrade7LandingCtrl.$inject = ['$scope', '$translate', '$state', 'prechecksFactory'];
  // @ngInject
  function Upgrade7LandingCtrl($scope, $translate, $state, prechecksFactory) {
    var controller = this;
    controller.beginUpdate = beginUpdate;

    controller.prechecks = {
      completed: false,
      runPrechecks: runPrechecks,
      checks: [
        {
          code: '001',
          status: true
        },
        {
          code: '002',
          status: true
        },
        {
          code: '003',
          status: true
        }
      ],
      valid: false,
      button: 'upgrade'
    };

    /**
     * Move to the next available Step
     */
    function beginUpdate() {
      // Only move forward if all prechecks has been executed and passed.
      if (!controller.prechecks.completed || !controller.prechecks.valid) {
        return;
      }

      $state.go('upgrade7.backup');
    };

    /**
     * Pre validation checks
     */
    function runPrechecks(forceFailure = false) {

      prechecksFactory
        .getAll(forceFailure)
        .then(
          //Success handler. Al precheck passed successfully:
          function(prechecksResponse) {
            //delete controller.prechecks.errors;
          },
          //Failure handler:
          function(errorPrechecksResponse) {
            controller.prechecks.errors = errorPrechecksResponse.data.errors;
          }
        ).finally(
          function() {
            controller.prechecks.completed = true;

            for(var i=0; i<controller.prechecks.checks.length; i++) {
              if(!controller.prechecks.checks[i].status){
                controller.prechecks.valid = false;
                return;
              } else {
                controller.prechecks.valid = true;
              }
            }
          }
        );
    };
  }
})();
