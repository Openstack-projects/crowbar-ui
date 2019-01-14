/* jshint -W117, -W030 */
/*global bard $controller $httpBackend should assert $q $rootScope upgradeFactory Blob FileSaver crowbarUtilsFactory */
describe('Upgrade Flow - Backup Controller', function() {
    var controller,
        mockedErrorList = [ 1, 2, 3],
        mockedErrorResponse = {
            data: { errors: mockedErrorList }
        },
        mockedCreateResponse = {
            data: { id: 42 }
        },
        mockedDownloadFile = '--Mock Backup File--',
        mockedFileName = 'S33z8qFX.jpg.zip',
        mockedDownloadResponseHeaders = {
            'connection': 'keep-alive',
            'content-disposition': 'attachment; filename=' + mockedFileName,
            'content-type': 'application/zip',
            'date': 'Thu, 25 Aug 2016 11:07:32 GMT',
            'transfer-encoding': 'chunked',
            'x-powered-by': 'Express'
        },
        mockedDownloadResponse = {
            data: new Blob([mockedDownloadFile]),
            'headers': function() {}
        },
        mockedStatusResponse = {
            data: {
                crowbar_backup: '--some path--',
                steps: {
                    backup_crowbar: {
                        status: 'pending'
                    },
                },
            }
        };

    beforeEach(function() {
        //Setup the module and dependencies to be used.
        bard.appModule('crowbarApp.upgrade');
        bard.inject(
            '$controller',
            '$rootScope',
            '$q',
            '$httpBackend',
            'upgradeFactory',
            'crowbarUtilsFactory',
            'FileSaver'
        );

        bard.mockService(upgradeFactory, {
            getStatus: $q.when(mockedStatusResponse),
            createAdminBackup: $q.when(mockedCreateResponse),
        });

        //Create the controller
        controller = $controller('UpgradeBackupController');

        //Mock requests that are expected to be made
        $httpBackend.expectGET('app/features/upgrade/i18n/en.json').respond({});
        $httpBackend.flush();

    });

    // Verify no unexpected http call has been made
    bard.verifyNoOutstandingHttpRequests();

    it('should exist', function() {
        should.exist(controller);
    });

    describe('Backup object', function() {

        it('should exist', function() {
            should.exist(controller.backup);
        });

        it('should not completed by default', function() {
            assert.isFalse(controller.backup.completed);
        });

        describe('create function', function() {

            it('is defined', function() {
                should.exist(controller.backup.create);
                expect(controller.backup.create).toEqual(jasmine.any(Function));
            });

            describe('when executed and finished with success', function () {
                beforeEach(function () {
                    spyOn(controller.backup, 'download');

                    controller.backup.create();
                    $rootScope.$digest();
                });

                it('should call download function', function () {
                    expect(controller.backup.download).toHaveBeenCalled();
                });

                it('should leave running at true', function () {
                    assert.isTrue(controller.backup.running);
                });

                it('should not set completed to true', function () {
                    assert.isFalse(controller.backup.completed);
                });
            });

            describe('when executed and finished with failure', function () {
                beforeEach(function () {
                    spyOn(controller.backup, 'download');
                    // local change in mocked service
                    spyOn(upgradeFactory, 'createAdminBackup').and.returnValue($q.reject(mockedErrorResponse));
                    controller.backup.create();
                    $rootScope.$digest();
                });

                it('should not call download function', function () {
                    expect(controller.backup.download).not.toHaveBeenCalled();
                });

                it('should leave running at false', function () {
                    assert.isFalse(controller.backup.running);
                });

                it('should expose the errors through adminUpgrade.errors object', function () {
                    expect(controller.backup.errors.errors).toEqual(mockedErrorList);
                });
            });
        });

        describe('download function', function() {

            it('is defined', function() {
                should.exist(controller.backup.download);
                expect(controller.backup.download).toEqual(jasmine.any(Function));
            });

            describe('when executed', function () {
                describe('on success with wrong file headers', function () {

                    beforeEach(function () {

                        spyOn(FileSaver, 'saveAs');

                        // Mock the headers() method of the fake response
                        spyOn(mockedDownloadResponse, 'headers')
                            .and.returnValue({});

                        // Mock the download() method of the crowbarUtilsFactory,
                        // and return a custom promise instead
                        bard.mockService(crowbarUtilsFactory, {
                            getAdminBackup: $q.when(mockedDownloadResponse)
                        });

                        // Run the backup get function
                        controller.backup.download(42);
                        $rootScope.$digest();
                    });

                    it('crowbarUtilsFactory.getAdminBackup() has been called once', function () {
                        assert.isTrue(crowbarUtilsFactory.getAdminBackup.calledOnce);
                    });

                    it('changes the completed status', function() {
                        assert.isTrue(controller.backup.completed);
                    });

                    it('no error is created', function() {
                        should.not.exist(controller.backup.error);
                    });

                    it('calls saveAs with data received from the service and default filename', function () {
                        expect(FileSaver.saveAs).toHaveBeenCalledWith(
                          mockedDownloadResponse.data, 'crowbarBackup'
                        );
                    })
                });
                describe('on success', function () {

                    beforeEach(function () {
                        spyOn(FileSaver, 'saveAs');

                        // Mock the headers() method of the fake response
                        spyOn(mockedDownloadResponse, 'headers')
                            .and.returnValue(mockedDownloadResponseHeaders);

                        // Mock the download() method of the crowbarUtilsFactory,
                        // and return a custom promise instead
                        bard.mockService(crowbarUtilsFactory, {
                            getAdminBackup: $q.when(mockedDownloadResponse)
                        });

                        // Run the backup get function
                        controller.backup.download(42);
                        $rootScope.$digest();
                    });

                    it('crowbarUtilsFactory.getAdminBackup() has been called once', function () {
                        assert.isTrue(crowbarUtilsFactory.getAdminBackup.calledOnce);
                    });

                    it('changes the completed status', function() {
                        assert.isTrue(controller.backup.completed);
                    });

                    it('no error is created', function() {
                        should.not.exist(controller.backup.error);
                    });

                    it('calls saveAs with data received from the service and filename from header', function () {
                        expect(FileSaver.saveAs).toHaveBeenCalledWith(
                          mockedDownloadResponse.data, mockedFileName
                        );
                    })
                });

                describe('on failure', function () {
                    beforeEach(function () {

                        bard.mockService(crowbarUtilsFactory, {
                            getAdminBackup: $q.reject(mockedErrorResponse)
                        });

                        controller.backup.download(42);
                        $rootScope.$digest();
                    });

                    it('crowbarUtilsFactory.getAdminBackup() has been called once', function () {
                        assert.isTrue(crowbarUtilsFactory.getAdminBackup.calledOnce);
                    });

                    it('leaves the completed at false', function() {
                        assert.isFalse(controller.backup.completed);
                    });

                    it('should expose the errors through adminUpgrade.errors object', function () {
                        expect(controller.backup.errors.errors).toEqual(mockedErrorList);
                    });
                });

            });

        });

    });
});
